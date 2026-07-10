import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge Middleware — AC-ST-501 / Epic-05
 *
 * Defense Layer 1: Intercept all playground routes at the edge.
 * Playground is a developer-only tool; it must never be reachable in production.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPlaygroundRoute =
    pathname.startsWith('/playground') || pathname.startsWith('/api/playground');

  if (isPlaygroundRoute && process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/playground/:path*', '/api/playground/:path*'],
};
