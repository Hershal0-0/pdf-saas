// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
//     config.resolve.alias.canvas = false;
//     config.resolve.alias.encoding = false;
//     return config;
//   },
//   images: {
//     domains: ["lh3.googleusercontent.com"],
//   },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/api/auth/login",
        permanent: true,
      },
      {
        source: "/sign-up",
        destination: "/api/auth/register",
        permanent: true,
      },
    ];
  },
  viewport: {
    themeColor: "#FFF",
  },
};

export default nextConfig;
