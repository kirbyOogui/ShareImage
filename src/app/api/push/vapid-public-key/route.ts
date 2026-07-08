import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Push通知は現在利用できません" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
