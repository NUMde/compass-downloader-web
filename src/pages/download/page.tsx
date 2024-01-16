"use client";

import styles from "./download.module.css";

import { useState, Fragment } from "react";
import {
    Box,
    Button,
    Stepper,
    Step,
    StepLabel,
    Typography,
    TextField,
    Divider,
    InputAdornment,
    styled,
} from "@mui/material";
import {
    CloudUpload as CloudUploadIcon,
    CheckOutlined,
    Download,
} from "@mui/icons-material";

import decode from "@/pages/download/api";
import config from "@/config";

type DownloadState = {
    url: string;
    publicKey: string;
    privateKey: string;
    username: string;
    password: string;
    download: null;
};

type DownloaderStep = {
    index: number;
    label: string;
    paramName: keyof DownloadState;
};

const steps: DownloaderStep[] = [
    { index: 0, label: "Backend Adresse eingeben", paramName: "url" },
    {
        index: 1,
        label: "Öffentlichen Schlüssel auswählen",
        paramName: "publicKey",
    },
    {
        index: 2,
        label: "Privaten Schlüssel auswählen",
        paramName: "privateKey",
    },
    { index: 3, label: "Benutzernamen eingeben", paramName: "username" },
    { index: 4, label: "Password eingeben", paramName: "password" },
    { index: 5, label: "Daten herunterladen", paramName: "download" },
];

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
            <Stepper
                sx={{ m: 2, flex: 1, alignItems: "center" }}
                activeStep={activeStep}
                alternativeLabel>
                {steps.map((step, _index) => {
                    return (
                        <Step key={step.label}>
                            <StepLabel>{step.label}</StepLabel>
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
                        {steps[activeStep].label}
                    </Typography>
                    {/* steps */}

                    <StepBuilder
                        step={steps[activeStep]}
                        data={data}
                        setData={setData}
                        activeStep={activeStep}
                    />
                    <Box
                        sx={{
                            width: "50%",
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
        </Box>
    );
}

export default Downloader;

function StepBuilder({
    step,
    data,
    setData,
}: {
    step: DownloaderStep;
    data: DownloadState;
    setData: (newState: DownloadState) => void;
    activeStep: number;
}) {
    let input: JSX.Element = <></>;
    switch (step.index) {
        case 1:
        case 2:
            // public/private key input
            input = (
                <Button
                    color={data[step.paramName] ? "success" : "primary"}
                    component="label"
                    variant="outlined"
                    startIcon={
                        data[step.paramName] === "" ? (
                            <CloudUploadIcon />
                        ) : (
                            <CheckOutlined />
                        )
                    }
                    sx={{
                        height: "56px",
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
                                        [step.paramName]:
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
            );
            break;

        case 0:
        case 3:
        case 4:
            // url/username/password input
            input = (
                <TextField
                    variant="outlined"
                    type={step.paramName == "password" ? "password" : "text"}
                    value={data[step.paramName]}
                    onChange={(event) =>
                        setData({
                            ...data,
                            [step.paramName]: event.currentTarget.value,
                        })
                    }
                    InputProps={
                        step.paramName === "url"
                            ? {
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
                              }
                            : undefined
                    }
                    sx={{ textAlign: "center" }}
                />
            );
            break;
        case 5:
            // download button
            input = (
                <Button
                    color="success"
                    variant="outlined"
                    endIcon={<Download />}
                    onClick={() =>
                        decode({
                            ...data,
                            url: `https://${data.url}.${config.BACKEND_TLD}/api`,
                        })
                    }
                    sx={{ height: "56px" }}>
                    {step.label}
                </Button>
            );
    }
    return input;
}
