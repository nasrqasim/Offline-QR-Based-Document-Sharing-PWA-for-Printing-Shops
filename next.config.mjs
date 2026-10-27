/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('node:sqlite');
    }
    return config;
  },
};

export default nextConfig;
