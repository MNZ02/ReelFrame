export const ErrorCode = {
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  FORBIDDEN: "FORBIDDEN",
  INVALID_STATE: "INVALID_STATE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  error: {
    code: ErrorCodeValue;
    message: string;
  };
}

export class ApiError extends Error {
  code: ErrorCodeValue;
  status: number;

  constructor(code: ErrorCodeValue, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message } };
  }
}
