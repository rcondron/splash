/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    const quintHost =
      process.env.NEXT_PUBLIC_QUINT_HOST || "https://100.25.66.46";
    return [
      {
        source: "/quint-api/:path*",
        destination: `${quintHost}/api/:path*`,
      },
      {
        source: "/_matrix/:path*",
        destination: `${quintHost}/_matrix/:path*`,
      },
      {
        source: "/quint-v1/:path*",
        destination: `${quintHost}/v1/:path*`,
      },
      {
        source: "/quint-v2/:path*",
        destination: `${quintHost}/v2/:path*`,
      },
      {
        source: "/quint-admin/:path*",
        destination: `${quintHost}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
