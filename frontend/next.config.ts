import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Prohlížeč volá Keycloak přímo (výměna a obnova tokenu) — stejný fallback jako v lib/keycloak.ts.
const keycloakOrigin = new URL(process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080").origin;

// CSP zatím jen Report-Only: nic neblokuje, porušení posílá na /api/csp-report
// (vypisuje se do logu kontejneru). Až v logu nebudou legitimní porušení, přejmenovat
// hlavičku na `Content-Security-Policy`. Proti XSS přes inline handlery pomůže až
// script-src s nonce (middleware) místo 'unsafe-inline'.
const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${keycloakOrigin}${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${keycloakOrigin}`,
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join("; ");

// Terminal ve VS Code (python.terminal.useEnvFile) dedi korenovy .env pro Docker s NEXT_API_URL=http://api:8000.
// Promenna z prostredi prebije .env.local, next dev pak proxuje na hostname "api", ktery mimo Docker
// neexistuje (ENOTFOUND -> 500 na vsechno pod /api/backend). Docker frontend bezi jako production build, tam se to netyka.
function resolveApiUrl() {
  const url = process.env.NEXT_API_URL ?? "http://localhost:8000";
  if (isDev && new URL(url).hostname === "api") {
    console.warn(`NEXT_API_URL=${url} je adresa uvnitr Dockeru, next dev proxuje na http://localhost:8000`);
    return "http://localhost:8000";
  }
  return url;
}

const nextConfig: NextConfig = {
  output: 'standalone',

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Na proxované odpovědi backendu (/api/backend/*) Next tyto hlavičky nepřidává
      // (u externího rewrite je ignoruje i z middlewaru) — ty musí nastavit backend / nginx.
    ];
  },

  serverExternalPackages: [],

  experimental: {
    proxyTimeout: 300_000, // 5 minut
    optimizePackageImports: ['lucide-react', '@tiptap/react', '@tiptap/starter-kit'],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    const apiUrl = resolveApiUrl();
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // Enable React compiler optimizations
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [],
  },
  
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
