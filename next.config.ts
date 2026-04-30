import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sicherheits-Header (CSP etwas locker fuer Inline-Styles wegen Tenant-Akzentfarben)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Inline-Styles fuer Tenant-Branding
              "style-src 'self' 'unsafe-inline'",
              // Inline-Scripts fuer Next-Hydration + Widget
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // API + Open-Meteo
              "connect-src 'self' https://api.open-meteo.com",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      // Widget muss von ueberall einbettbar sein (Cross-Origin)
      {
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
