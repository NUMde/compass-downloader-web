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
};

module.exports = nextConfig;
