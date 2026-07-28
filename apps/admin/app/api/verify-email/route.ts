import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getPublicSiteUrl } from "@/lib/supabase/client";

function buildRedirectUrl(request: NextRequest, status: "success" | "invalid" | "error", name?: string) {
  const baseUrl = getPublicSiteUrl() ?? request.nextUrl.origin;
  const redirectUrl = new URL("/registration-verified", baseUrl);
  redirectUrl.searchParams.set("status", status);
  if (name) {
    redirectUrl.searchParams.set("name", name);
  }
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  const registration = await prisma.preRegistration.findFirst({
    where: {
      verificationToken: token,
      status: "unverified"
    },
    select: {
      id: true,
      firstName: true
    }
  });

  if (!registration) {
    return NextResponse.redirect(buildRedirectUrl(request, "invalid"));
  }

  const updateResult = await prisma.preRegistration.updateMany({
    where: {
      id: registration.id,
      status: "unverified"
    },
    data: {
      status: "verified"
    }
  });

  if (updateResult.count === 0) {
    return NextResponse.redirect(buildRedirectUrl(request, "error"));
  }

  return NextResponse.redirect(buildRedirectUrl(request, "success", registration.firstName));
}
