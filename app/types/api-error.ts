import type { ErrorCode } from "@/app/lib/constants";

export interface StructuredApiError {
  code: ErrorCode;
  detail: string;
}

export function buildErrorResponse(
  code: ErrorCode,
  detail: string,
): StructuredApiError {
  return { code, detail };
}
