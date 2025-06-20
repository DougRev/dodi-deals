
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Added for Firebase Storage
        port: '',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      console.log('[next.config.js] Custom webpack config for CLIENT build running...');
      // Don't attempt to bundle Node.js core modules for the client.
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Ensure fallback object exists
        async_hooks: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false, // Added for 'google-auth-library' or similar
      };
    }
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
