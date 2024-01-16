import { AppProps } from "next/app";
import { useEffect, useState } from "react";
import "./root.css";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

function App({ Component, pageProps }: AppProps) {
    const [render, setRender] = useState(false);
    useEffect(() => setRender(true), []);
    return render ? <Component {...pageProps} /> : null;
}

export default App;
