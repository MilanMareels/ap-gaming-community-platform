import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  // Lets `next dev` serve its client scripts through an ngrok tunnel (only used in development)
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.app', '*.ngrok.io'],
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
