import type { NextConfig } from "next";

// Basic browser protections on every page: no embedding the site in someone else's
// frame (clickjacking), no guessing file types, and only our own pages may use the camera.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Keep pages that were just visited for a minute, so going back is instant.
  experimental: { staleTimes: { dynamic: 60 } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
