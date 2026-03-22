import type { NextConfig } from "next";

// Disable static generation for protected routes that require Supabase
process.env.SKIP_ENV_VALIDATION = 'true';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
};

// Override for protected routes - disable static generation
if (process.env.NODE_ENV === 'production') {
  nextConfig.output = 'standalone';
}

export default nextConfig;
