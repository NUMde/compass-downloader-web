import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Typography,
    BottomNavigation,
    BottomNavigationAction,
    Paper,
} from "@mui/material";

import KeyGen from "./keygen/page";
import Downloader from "@/pages/download/page";
import { Download, Help, Key } from "@mui/icons-material";

export default function App() {
    return (
        <Router>
            <AppBar position="fixed">
                <Toolbar>
                    <Typography
                        variant="h5"
                        component="div"
                        sx={{ flexGrow: 1 }}>
                        COMPASS Downloader
                    </Typography>
                </Toolbar>
            </AppBar>
            <Toolbar />
            <Routes>
                <Route path="/keygen" element={<KeyGen />} />
                <Route path="/" element={<Downloader />} />
            </Routes>

            <Paper
                sx={{ position: "sticky", bottom: 0, left: 0, right: 0 }}
                elevation={3}>
                <BottomNavigation showLabels>
                    <BottomNavigationAction
                        component={Link}
                        to={{ pathname: "/" }}
                        label="Download"
                        icon={<Download />}
                    />
                    <BottomNavigationAction
                        component={Link}
                        to={{ pathname: "/keygen" }}
                        label="Keygen"
                        icon={<Key />}
                    />
                    <BottomNavigationAction
                        component={Link}
                        to={{ pathname: "/help" }}
                        label="Help"
                        icon={<Help />}
                    />
                </BottomNavigation>
            </Paper>
        </Router>
    );
}
