import type { NextConfig } from "next";

// Disable static generation for protected routes that require Supabase
process.env.SKIP_ENV_VALIDATION = 'true';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',
};

export default nextConfig;
