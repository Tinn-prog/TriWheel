import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(process.cwd());

const allowedDevOrigins = Array.from(
  new Set(
    (process.env.ALLOWED_DEV_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

const nextConfig: NextConfig = {
  allowedDevOrigins,
  devIndicators: false,
};

export default nextConfig;
