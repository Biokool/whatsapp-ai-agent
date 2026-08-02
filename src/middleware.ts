import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Basic Authentication Middleware for WhatsApp AI Agent Dashboard
 *
 * Protects all routes except:
 * - /api/connection/status (needed for QR display)
 * - /api/connection/disconnect (needed for reconnection)
 * - Static assets (_next, favicon, etc.)
 *
 * Environment variables required:
 * - DASHBOARD_USER: Username for basic auth
 * - DASHBOARD_PASSWORD: Password for basic auth
 *
 * If env vars are not set, auth is disabled (development mode).
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/connection/status",
  "/api/connection/disconnect",
  "/api/admin/reset",
  "/api/knowledge-bases",
  "/api/documents",
];

// Static assets that should bypass auth
const STATIC_PATTERNS = ["/_next/", "/favicon.ico", "/favicon.svg"];

function getCredentials(): { user: string; pass: string } | null {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;

  if (!user || !pass) {
    // Auth disabled - development mode
    return null;
  }

  return { user, pass };
}

function verifyBasicAuth(
  request: NextRequest,
  credentials: { user: string; pass: string }
): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const decoded = atob(base64Credentials);
    const [username, password] = decoded.split(":");

    return username === credentials.user && password === credentials.pass;
  } catch {
    return false;
  }
}

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  // Check prefix matches for document routes (includes /api/documents/{id}/upload etc.)
  if (pathname.startsWith("/api/documents")) {
    return true;
  }

  // Check static assets
  if (STATIC_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return true;
  }

  // Check for docs API (needed for documentation viewer)
  if (pathname.startsWith("/api/docs")) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes and static assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if auth is enabled
  const credentials = getCredentials();
  if (!credentials) {
    // Auth disabled - allow all requests
    return NextResponse.next();
  }

  // Verify credentials
  if (!verifyBasicAuth(request, credentials)) {
    // Return 401 with WWW-Authenticate header to trigger browser auth dialog
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="WhatsApp AI Agent Dashboard"',
      },
    });
  }

  // Auth successful - continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
