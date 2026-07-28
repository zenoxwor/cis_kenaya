import { NextResponse } from "next/server";
import { sendProviderError } from "@/lib/observability/provider-hooks";
import { AppError, getErrorMessage, toAppError } from "@/lib/observability/app-error";

export function routeErrorResponse(error: unknown, fallbackMessage?: string) {
  const appError = toAppError(error, fallbackMessage);
  console.error(`[${appError.code}] ${appError.message}`, appError.details ?? "");
  sendProviderError(appError, {
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details ?? null
      }
    },
    { status: appError.statusCode }
  );
}
export { AppError, getErrorMessage, toAppError };
