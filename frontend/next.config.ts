import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  experimental: {
    agentUpgrade: 'security',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
