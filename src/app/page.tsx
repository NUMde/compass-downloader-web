"use client";

import { MemoryRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import { Button, TextField } from "@mui/material";
import {
    CloudUpload as CloudUploadIcon,
    CheckOutlined,
    Download,
} from "@mui/icons-material";
import { useState } from "react";

import decode from "@/api";

function Downloader() {
    const [publicKey, setPublicKey] = useState("");
    const [privateKey, setPrivKey] = useState("");
    const [user, setUser] = useState("downloader");
    const [password, setPassword] = useState("vOqyhLr936502");

    return (
        <div className="page">
            <h1>compass-downloader</h1>
            <div className="content">
                <div className="row">
                    <Button
                        component="label"
                        variant="contained"
                        startIcon={
                            publicKey ? <CheckOutlined /> : <CloudUploadIcon />
                        }>
                        Select Public Key
                        <input
                            type="file"
                            hidden
                            onInput={(event) => {
                                try {
                                    const fr = new FileReader();
                                    fr.onload = () =>
                                        setPublicKey(
                                            fr.result?.toString() ?? ""
                                        );
                                    const { files } = event.currentTarget;
                                    if (files) {
                                        fr.readAsText(files[0]);
                                    }
                                } catch (error) {
                                    console.log(error);
                                }
                            }}
                        />
                    </Button>
                    <Button
                        component="label"
                        variant="contained"
                        startIcon={
                            privateKey ? <CheckOutlined /> : <CloudUploadIcon />
                        }>
                        Select Private Key
                        <input
                            type="file"
                            hidden
                            onInput={(event) => {
                                try {
                                    const fr = new FileReader();
                                    fr.onload = () =>
                                        setPrivKey(fr.result?.toString() ?? "");
                                    const { files } = event.currentTarget;
                                    if (files) {
                                        fr.readAsText(files[0]);
                                    }
                                } catch (error) {
                                    console.log(error);
                                }
                            }}
                        />
                    </Button>
                </div>
                <div className="row">
                    <TextField
                        value={user}
                        variant="outlined"
                        label="Username"
                        onChange={(event) => setUser(event.target.value)}
                    />
                    <TextField
                        variant="outlined"
                        label="Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </div>
                <div className="row">
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        disabled={
                            !user || !password || !privateKey || !publicKey
                        }
                        onClick={() =>
                            decode(user, password, publicKey, privateKey)
                        }>
                        Download
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Downloader />} />
            </Routes>
        </Router>
    );
}
