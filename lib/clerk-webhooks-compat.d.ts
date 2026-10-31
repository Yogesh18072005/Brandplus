// Next App Router invokes route handlers with NextRequest at runtime. Clerk
// 7.9's RequestLike declaration still requires legacy NextRequest members even
// when a handler uses the standards-based Request annotation.
import type { NextRequest } from 'next/server';

declare global {
  interface Request {
    cookies: NextRequest['cookies'];
    nextUrl: NextRequest['nextUrl'];
    page: NextRequest['page'];
    ua: NextRequest['ua'];
  }
}

export {};
