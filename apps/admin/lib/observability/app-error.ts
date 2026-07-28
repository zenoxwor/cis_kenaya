type AppErrorOptions = {
  code: string;
  statusCode: number;
  details?: unknown;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
  }
}

export function toAppError(error: unknown, fallbackMessage = "Unexpected server error"): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message || fallbackMessage, {
      code: "UNEXPECTED_ERROR",
      statusCode: 500
    });
  }

  return new AppError(fallbackMessage, {
    code: "UNEXPECTED_ERROR",
    statusCode: 500,
    details: error
  });
}

export function getErrorMessage(error: unknown, fallbackMessage = "Operation failed") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
}

