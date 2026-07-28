import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "PDF export is not wired yet. Integrate a server PDF renderer (for example Playwright or a template-based PDF service) in a later milestone."
    },
    { status: 501 }
  );
}
