/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable caching to prevent large cache files
  experimental: {
    webpackBuildWorker: false,
  },
  webpack: (config, { dev, isServer }) => {
    // Disable cache in production builds
    if (!dev && !isServer) {
      config.cache = false;
    }
    return config;
  },
}

module.exports = nextConfig