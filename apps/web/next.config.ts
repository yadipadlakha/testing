import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal standalone server bundle for the Docker image (infra/apps/web Dockerfile).
  output: "standalone",
};

export default nextConfig;
