/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let other devices on the LAN (e.g. a phone) load the dev server's assets and HMR.
  allowedDevOrigins: ["10.226.161.222"],
  async rewrites() {
    // Android verifies App Links by fetching this exact path.
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/well-known/assetlinks" }];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
