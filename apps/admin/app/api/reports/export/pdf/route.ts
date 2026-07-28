import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Report PDF export is a placeholder. Integrate a server-side PDF renderer for production reporting."
    },
    { status: 501 }
  );
}
