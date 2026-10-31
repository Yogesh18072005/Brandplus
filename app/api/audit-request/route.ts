import { NextResponse } from 'next/server';

/**
 * Retired: every audit now needs a BrandPulse account, so it can be tied to one
 * person, one network and one device. The landing form sends visitors to sign
 * up instead. Kept so old cached pages get a clear answer, not a 404.
 */
export async function POST() {
  return NextResponse.json({
    ok: false,
    code: 'ACCOUNT_REQUIRED',
    message: 'Create a free account to request your audit.',
    signUpUrl: '/sign-up',
  }, { status: 410 });
}
