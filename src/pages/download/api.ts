import {
    Questionnaire,
    QuestionnaireItem,
    QuestionnaireItemAnswerOption,
    QuestionnaireResponse,
    QuestionnaireResponseItem,
} from "fhir/r4";

import * as crypto from "crypto";

import JSZip from "jszip";
import jws from "jws";
import forge, { pkcs7 } from "node-forge";

import config from "../../config";

/**
 * types
 */

type DecryptedEntry = {
    UUID: string;
    subjectId: string;
    questionnaire: string;
    version: string;
    JSON: QuestionnaireResponse | undefined;
    AbsendeDatum: string;
    ErhaltenDatum: string;
};

type ResponseItem = Omit<QuestionnaireItem, "item"> & {
    answer: string | QuestionnaireItemAnswerOption[];
    item: ResponseItem[];
    linkId: string;
    type: string;
};

const questionnairesMap: Record<string, Questionnaire> = {};

// encrypt credentials
// function aesEncrypt(data: string) {
//     const iv = random.getBytesSync(16);
//     const key = random.getBytesSync(32);

//     const cipher = forgeCipher.createCipher("AES-CBC", key);
//     cipher.start({ iv });
//     cipher.update(forgeUtil.createBuffer(data));
//     cipher.finish();

//     const cipherText = forgeUtil.encode64(cipher.output.getBytes());

//     const base64Key = forgeUtil.encode64(key);
//     const base64IV = forgeUtil.encode64(iv);
//     return {
//         cipher: cipherText,
//         data: base64Key,
//         iv: base64IV,
//     };
// }

// encrypt credentials
function aesEncrypt(data: string) {
    const iv = crypto.randomBytes(16);
    const key = crypto.randomBytes(32);

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let cipherText = cipher.update(btoa(data), "base64", "base64");
    cipherText += cipher.final("base64");

    const base64Cipher = cipherText;
    const base64Key = Buffer.from(key).toString("base64");
    const base64IV = Buffer.from(iv).toString("base64");

    return {
        cipher: base64Cipher,
        data: base64Key,
        iv: base64IV,
    };
}

// encrypt token request
// function rsaEncrypt(data: string, key: string) {
//     const publicKey = forge.pki.publicKeyFromPem(key);
//     const returnValue = publicKey.encrypt(data, "RSAES-PKCS1-V1_5");

//     return forgeUtil.encode64(returnValue);
// }

function rsaEncrypt(data: string, key: string) {
    // const publicKey = crypto.createPublicKey(key);
    const cipherText = crypto.publicEncrypt(
        { key: key, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(data, "base64")
    );
    const base64Cipher = cipherText.toString("base64");
    return base64Cipher;
}

// decrypt questionnaire response
function pkcs7decrypt(data: string, privateKey: string) {
    const pkcs7string = `-----BEGIN PKCS7-----\n${data}\n-----END PKCS7-----`;
    const p7d = forge.pkcs7.messageFromPem(
        pkcs7string
    ) as pkcs7.PkcsEnvelopedData;
    const privateCert = forge.pki.decryptRsaPrivateKey(privateKey);
    try {
        p7d.decrypt(p7d.recipients[0], privateCert);
    } catch (err) {
        return "decryption failed";
    }

    return JSON.parse((p7d as pkcs7.PkcsEnvelopedData).content as string);
}

async function getAuthenticationToken(
    user: string,
    password: string,
    publicKey: string,
    url: string
): Promise<string> {
    const authCredentials = {
        ApiID: user,
        ApiKey: password,
        CurrentDate: `${Date.now()}`,
    };

    const { data, iv, cipher } = aesEncrypt(JSON.stringify(authCredentials));

    const rsaEncryptedAESkey = rsaEncrypt(data, publicKey);

    const authBody = {
        encrypted_creds: cipher,
        encrypted_key: rsaEncryptedAESkey,
        iv,
        encryptedWithForge: false,
    };

    const response = await fetch(`${url}/auth`, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(authBody),
    });
    if (response.status === 200) {
        const token = JSON.parse(await response.text()).access_token;

        return token;
    } else if (response.status === 404) {
        throw new Error("Auth Failed", { cause: "Not Found" });
    } else if (response.status === 401) {
        throw new Error("Auth Failed", { cause: "Unauthorized" });
    }
    throw Error("Auth Failed", { cause: "unknown" });
}

// helper function for paginated download
async function getPage(url: string, headers: HeadersInit, page: number) {
    const params = { page: `${page}` };
    try {
        const response = await fetch(
            `${url}/${config.DL_ROUTE}?${new URLSearchParams(params)}`,
            {
                headers,
                method: "GET",
            }
        );

        return JSON.parse(await response.text());
    } catch (err) {
        console.log(err);
        return "";
    }
}

// verify signature of
async function verifyAndParseResult(jwsToken: string, publicKey: string) {
    if (jws.verify(jwsToken, "RS256", publicKey)) {
        const payloadDf = jws.decode(jwsToken).payload;
        return payloadDf;
    }
    console.warn("Could not verify signature");
    return null;
}

async function getQRListFromQueue(
    url: string,
    headers: HeadersInit,
    publicKey: string
) {
    const firstPage = await getPage(url, headers, 1);
    const { totalPages } = firstPage;
    const dfToAdd = await verifyAndParseResult(
        firstPage.cTransferList,
        publicKey
    );

    const initialList = JSON.parse(dfToAdd);
    const queries: Promise<string[]>[] = [];
    // if there are more than one page, loop and append
    for (let i = 2; i <= totalPages; i += 1) {
        queries.push(
            getPage(url, headers, i)
                .then((page) =>
                    verifyAndParseResult(page.cTransferList, publicKey)
                )
                .then((parsedResult) => JSON.parse(parsedResult))
        );
    }
    return Promise.all(queries).then((results) => [
        ...initialList,
        ...(results.length > 0 ? results[0] : []),
    ]);
}

async function getQbyURLandVersion(
    backendUrl: string,
    headers: HeadersInit,
    questionnaireUrl: string,
    version: string
) {
    const params = new URLSearchParams({
        url: questionnaireUrl,
        version,
        languageCode: "de",
    });
    const route = `${backendUrl}/questionnaire?${params}`;

    const response = await fetch(route, { headers, method: "GET" });
    if (response.status === 200) {
        const questionnaire = await response.json();
        questionnairesMap[`${questionnaire.url}|${questionnaire.version}`] =
            questionnaire;

        return questionnaire;
    } else if (response.status === 404) {
        throw new Error("Download Failed", { cause: "Not Found" });
    } else if (response.status === 401) {
        throw new Error("Download Failed", { cause: "Unauthorized" });
    }
    throw new Error("Download failed", { cause: "Unknown" });
}

// get all original questionnaires form backend
async function getAllQuestionnaires(url: string, header: HeadersInit) {
    const queries: any[] = [];
    Object.keys(questionnairesMap).forEach((id) => {
        const [questionnaireUrl, version] = id.split("|");
        queries.push(
            getQbyURLandVersion(url, header, questionnaireUrl, version)
        );
    });
    return Promise.all(queries);
}

function extractAnswers(items: QuestionnaireResponseItem[]) {
    const result: Record<string, string | QuestionnaireItemAnswerOption[]> = {};
    items.forEach((item: any) => {
        if (item.item) {
            Object.assign(result, extractAnswers(item.item));
        } else {
            result[item.linkId] = item.answer ?? "";
        }
    });
    return result;
}

// delete all unused information
function removeExtras(node: ResponseItem) {
    Object.keys(node).forEach((key) => {
        if (
            ![
                "linkId",
                "text",
                "definition",
                "answer",
                "item",
                "extension",
            ].includes(key)
        )
            delete node[key as keyof ResponseItem];
    });
}

function createResponse(
    items: ResponseItem[],
    answerList: Record<string, string | QuestionnaireItemAnswerOption[]>
) {
    const result: Record<string, any> = {};
    items?.forEach((item) => {
        removeExtras(item);
        if (item.item) {
            Object.assign(result, createResponse(item.item, answerList));
        } else if (answerList[item.linkId]) {
            item.answer = answerList[item.linkId];
        } else {
            // ts-ignore
            item.answer = [];
        }
    });

    return result;
}

function flattenAnswers(root: QuestionnaireResponseItem[] | undefined) {
    let result: Record<string, string> = {};
    root?.forEach((node) => {
        if (node.item) {
            result = { ...result, ...flattenAnswers(node.item) };
        } else {
            let key = "";
            let value = "";
            if (!node.definition) {
                // fallback
                if (node.linkId) {
                    key = node.linkId;
                } else {
                    console.error(
                        "Invalid fallback Key. Field 'linkId' not found."
                    );
                }
            } else {
                key = node.definition;
            }
            if (node.answer) {
                if (node.answer.length > 0) {
                    value = node.answer
                        .map((answer) => Object.values(answer)[0])
                        .map((answer) =>
                            typeof answer === "object" ? answer.code : answer
                        )
                        .map((answer) => `"${answer}"`)
                        .join(", ");
                }
            }
            result[key] = value;
        }
    });

    return result;
}

/**
 * ######### MAIN #########
 */

const decode = async ({
    username,
    password,
    publicKey,
    privateKey,
    url,
}: {
    username: string;
    password: string;
    publicKey: string;
    privateKey: string;
    url: string;
}): Promise<Blob> => {
    console.log("### (1/7) requesting token ###");

    const accessToken = await getAuthenticationToken(
        username,
        password,
        publicKey,
        url
    );

    const header = { Authorization: `Bearer ${accessToken}` };

    console.log("### (2/7) requesting pages ###");
    const qrList = await getQRListFromQueue(url, header, privateKey);

    console.log("### (3/7) decrypting pages ###");
    const decryptedResponses: Array<DecryptedEntry> = qrList.map((qr) => ({
        UUID: qr.UUID,
        subjectId: qr.SubjectId,
        questionnaire: qr.QuestionnaireId,
        version: qr.Version,
        JSON: pkcs7decrypt(qr.JSON, privateKey).data.body,
        AbsendeDatum: qr.AbsendeDatum,
        ErhaltenDatum: qr.ErhaltenDatum,
    }));

    console.log(
        "### (4/7) Getting corresponding questionnaires and write to dir ###"
    );

    const responsesMap: { [key: string]: string } = {};

    decryptedResponses.forEach(async (entry) => {
        const { questionnaire, version } = entry;

        const key = `${questionnaire}|${version}`;

        if (!Object.keys(questionnairesMap).includes(key)) {
            questionnairesMap[key] = {} as Questionnaire;
            responsesMap[key] = "";
        }
    });

    await getAllQuestionnaires(url, header);

    console.log("### (5/7) Build Questionnaire Map ###");

    decryptedResponses.forEach((currentEntry) => {
        const currentResponse = currentEntry.JSON;
        if (currentResponse?.item) {
            const answerList = extractAnswers(currentResponse.item);

            const currentQuestionnaire =
                questionnairesMap[currentResponse.questionnaire!];
            if (currentQuestionnaire) {
                createResponse(
                    currentQuestionnaire.item as ResponseItem[],
                    answerList
                );
            }
        }
    });

    console.log("### (6/7) Spread JSON objects to columns ###");

    for (let i = 0; i < decryptedResponses.length; i += 1) {
        const response = decryptedResponses[i];
        const flattenedResponses = flattenAnswers(response.JSON!.item);
        delete response.JSON;
        const index = `${response.questionnaire}|${response.version}`;
        if (!responsesMap[index]) {
            const headline = `UUID;SubjectId;QuestionnaireId;Version;AbsendeDatum;ErhaltenDatum;${Object.keys(
                flattenedResponses
            ).join(";")}\n`;
            responsesMap[index] = headline;
        }
        responsesMap[index] += `${[
            ...Object.values(response),
            ...Object.values(flattenedResponses),
        ].join(";")}\n`;
    }

    console.log("### (7/7) Write final files");

    const zip = new JSZip();

    Object.keys(responsesMap).forEach((key) => {
        try {
            zip.file(
                `${key.replace(config.QUESTIONNAIRE_PREFIX, "")}.csv`,
                responsesMap[key],
                {}
            );
        } catch (error) {
            console.log(error);
        }
    });

    let file: Blob;
    file = await zip.generateAsync({ type: "blob" });

    return file;
};

export default decode;
