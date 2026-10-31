import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Password and social connections are managed through Clerk account security.' },
    { status: 410 },
  );
}
