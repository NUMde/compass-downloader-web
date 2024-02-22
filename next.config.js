/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    basePath: "/compass-downloader-web",
    async rewrites() {
        return [
            // Rewrite everything else to use `pages/index`
            {
                source: "/:path*",
                destination: "/",
            },
        ];
    },
    webpack: (config) => {
        config.resolve.extensionAlias = {
            ".js": [".ts", ".tsx", ".js", ".jsx"],
            ".mjs": [".mts", ".mjs"],
            ".cjs": [".cts", ".cjs"],
        };
        return config;
    },
};

module.exports = nextConfig;
