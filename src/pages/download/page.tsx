"use client";

import { saveAs } from "file-saver";
import { useState, forwardRef } from "react";

import config from "@/config";
import decode from "@/pages/download/api";
import {
    CheckOutlined,
    CloudUpload as CloudUploadIcon,
    Done,
    Download,
} from "@mui/icons-material";
import {
    Alert as MuiAlert,
    AlertProps,
    Box,
    Button,
    CircularProgress,
    Divider,
    InputAdornment,
    Snackbar,
    Step,
    StepLabel,
    Stepper,
    styled,
    TextField,
    Typography,
} from "@mui/material";

import { green } from "@mui/material/colors";

import styles from "./download.module.css";

type DownloadState = {
    url: string;
    publicKey: string;
    privateKey: string;
    username: string;
    password: string;
    download: null;
};

const steps = [
    "Backend Adresse eingeben",
    "Öffentlichen Schlüssel auswählen",
    "Privaten Schlüssel auswählen",
    "Benutzernamen eingeben",
    "Password eingeben",
    "Daten herunterladen",
];

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
    props,
    ref
) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

function Downloader() {
    const [activeStep, setActiveStep] = useState(0);
    const [loadingState, setLoadingState] = useState<
        "initial" | "loading" | "success" | "error"
    >("initial");

    const [errorMsg, setErrorMsg] = useState("");

    const [data, setData] = useState<DownloadState>({
        url: "",
        publicKey: "",
        privateKey: "",
        username: "",
        password: "",
        download: null,
    });

    const handleNext = () => {
        const newActiveStep = activeStep + 1;
        setActiveStep(newActiveStep);
    };
    const handleBack = () => {
        const newActiveStep = activeStep - 1;
        setActiveStep(newActiveStep);
    };

    const handleDownload = async () => {
        setLoadingState("loading");
        try {
            const file = await decode(data);
            setLoadingState("success");

            saveAs(file, "questiFHIR-export.zip");
        } catch (err: any) {
            setLoadingState("error");
            switch (err) {
                case "Auth Failed":
                    if (err.cause == "Not Found") {
                        setErrorMsg(
                            "Login nicht möglich. Bitte eingegebene Adresse prüfen."
                        );
                    } else if (err.cause == "Unauthorized") {
                        setErrorMsg(
                            "Login nicht möglich. Bitte eingegebene Zugangsdaten prüfen."
                        );
                    }
                    break;
                case "Download Failed":
                    if (err.cause == "Unauthorized") {
                        setErrorMsg(
                            "Download fehlgeschlagen. Unautorisierter Zugriff."
                        );
                    }
                    break;
                default:
                    setErrorMsg(
                        "Download fehlgeschlagen. Bitte eingegeben Daten prüfen oder später erneut versuchen."
                    );
            }
        }
    };

    const closeAlert = () => {
        setLoadingState("initial");
    };

    return (
        <Box
            sx={{
                display: "flex",
                mx: "auto",
                flexDirection: "column",
                height: "calc(100% - 64px)",
                justifyContent: "space-between",
                width: "75%",
                boxSizing: "border-box",
            }}>
            <Box
                sx={{
                    flex: 1,
                    justifyContent: "center",
                    display: "flex",
                    flexDirection: "column",
                }}>
                <Typography variant="h3" align="center">
                    Download
                </Typography>
            </Box>
            <Divider />
            <Stepper
                sx={{ m: 2, flex: 1, alignItems: "center" }}
                activeStep={activeStep}
                alternativeLabel>
                {steps.map((step, _index) => {
                    return (
                        <Step key={step}>
                            <StepLabel>{step}</StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            <Divider />
            <Box
                sx={{
                    flex: 4,
                    display: "flex",
                    width: "50%",
                    flexDirection: "column",
                    alignSelf: "center",
                }}>
                <Box
                    sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-evenly",
                    }}>
                    <Typography align="center" variant="h4">
                        {steps[activeStep]}
                    </Typography>
                    {/* --- steps ---  */}

                    {activeStep == 0 && (
                        <TextField
                            variant="outlined"
                            value={data.url}
                            onChange={(event) =>
                                setData({
                                    ...data,
                                    url: event.currentTarget.value,
                                })
                            }
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        https://
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        .{config.BACKEND_TLD}
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: "66%", m: "0 auto" }}
                            inputProps={{ style: { textAlign: "center" } }}
                        />
                    )}
                    {activeStep == 1 && (
                        <Button
                            color={data.publicKey ? "success" : "primary"}
                            component="label"
                            variant="outlined"
                            startIcon={
                                data.publicKey === "" ? (
                                    <CloudUploadIcon />
                                ) : (
                                    <CheckOutlined />
                                )
                            }
                            sx={{
                                height: "56px",
                                width: "66%",
                                m: "0 auto",
                            }}>
                            Datei auswählen
                            <VisuallyHiddenInput
                                type="file"
                                accept=".pem"
                                onChange={(event) => {
                                    try {
                                        const fr = new FileReader();
                                        fr.onload = () =>
                                            setData({
                                                ...data,
                                                publicKey:
                                                    fr.result?.toString() ?? "",
                                            });
                                        const { files } = event.currentTarget;
                                        if (files) {
                                            fr.readAsText(files[0]);
                                        }
                                    } catch (error) {
                                        // TODO: show alert
                                        console.log(error);
                                    }
                                }}
                            />
                        </Button>
                    )}
                    {activeStep == 2 && (
                        <Button
                            color={data.privateKey ? "success" : "primary"}
                            component="label"
                            variant="outlined"
                            startIcon={
                                data.privateKey === "" ? (
                                    <CloudUploadIcon />
                                ) : (
                                    <CheckOutlined />
                                )
                            }
                            sx={{
                                height: "56px",
                                width: "66%",
                                m: "0 auto",
                            }}>
                            Datei auswählen
                            <VisuallyHiddenInput
                                type="file"
                                accept=".pem"
                                onChange={(event) => {
                                    try {
                                        const fr = new FileReader();
                                        fr.onload = () =>
                                            setData({
                                                ...data,
                                                privateKey:
                                                    fr.result?.toString() ?? "",
                                            });
                                        const { files } = event.currentTarget;
                                        if (files) {
                                            fr.readAsText(files[0]);
                                        }
                                    } catch (error) {
                                        // TODO: show alert
                                        console.log(error);
                                    }
                                }}
                            />
                        </Button>
                    )}
                    {activeStep == 3 && (
                        <TextField
                            variant="outlined"
                            value={data.username}
                            onChange={(event) =>
                                setData({
                                    ...data,
                                    username: event.currentTarget.value,
                                })
                            }
                            sx={{ width: "66%", m: "0 auto" }}
                            inputProps={{ style: { textAlign: "center" } }}
                        />
                    )}
                    {activeStep == 4 && (
                        <TextField
                            variant="outlined"
                            type="password"
                            value={data.password}
                            onChange={(event) =>
                                setData({
                                    ...data,
                                    password: event.currentTarget.value,
                                })
                            }
                            sx={{ width: "66%", m: "0 auto" }}
                            inputProps={{ style: { textAlign: "center" } }}
                        />
                    )}
                    {activeStep == 5 && (
                        <Box
                            sx={{
                                position: "relative",
                                m: "0 auto",
                                width: "66%",
                            }}>
                            <Button
                                color="success"
                                variant="contained"
                                endIcon={<Download />}
                                disabled={loadingState == "loading"}
                                onClick={() => handleDownload()}
                                sx={{
                                    height: "56px",
                                    width: "100%",
                                    m: "0 auto",
                                    ...(loadingState === "success" && {
                                        bgcolor: green[300],
                                        "&:hover": {
                                            bgcolor: green[500],
                                        },
                                    }),
                                }}>
                                {steps[5]}
                            </Button>
                            {loadingState === "loading" && (
                                <CircularProgress
                                    size={24}
                                    sx={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        marginTop: "-12px",
                                        marginLeft: "-12px",
                                        color: green[500],
                                    }}
                                />
                            )}
                        </Box>
                    )}
                    <Box
                        sx={{
                            width: "66%",
                            margin: "0 auto",
                        }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                            sx={{
                                display: activeStep == 0 ? "none" : "initial",
                                float: "left",
                            }}>
                            Zurück
                        </Button>
                        <Button
                            variant="contained"
                            disabled={
                                data[
                                    Object.keys(data)[
                                        activeStep
                                    ] as keyof DownloadState
                                ] == ""
                            }
                            onClick={handleNext}
                            sx={{
                                float: "right",
                                display: activeStep == 5 ? "none" : "initial",
                            }}>
                            Weiter
                        </Button>
                    </Box>
                </Box>
            </Box>

            <Snackbar
                anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
                open={loadingState === "success"}>
                <Alert elevation={6} severity="success" onClose={closeAlert}>
                    Daten erfolgreich heruntergeladen.
                </Alert>
            </Snackbar>
            <Snackbar
                anchorOrigin={{ horizontal: "center", vertical: "bottom" }}
                open={loadingState === "error"}>
                <Alert elevation={6} severity="error" onClose={closeAlert}>
                    {errorMsg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default Downloader;
