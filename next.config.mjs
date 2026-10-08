/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      html2canvas: 'html2canvas-pro',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      html2canvas: 'html2canvas-pro',
    };
    return config;
  },
};

export default nextConfig;
