import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  outputFileTracingExcludes: {
    "/*": ["./.data/**/*", "./**/*.sqlite", "./**/*.sqlite-wal", "./**/*.sqlite-shm"],
  },
};

export default nextConfig;
