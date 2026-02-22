"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ErrorCode, ERROR_TITLE, ERROR_MESSAGE } from "@/app/lib/constants";

export interface CopilotError {
  code: ErrorCode;
  title: string;
  message: string;
  timestamp: number;
  raw?: unknown;
}

interface CopilotErrorContextValue {
  error: CopilotError | null;
  pushError: (code: ErrorCode, raw?: unknown) => void;
  clearError: () => void;
}

const CopilotErrorContext = createContext<CopilotErrorContextValue | null>(
  null,
);

const DEDUP_INTERVAL_MS = 500;

export function CopilotErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<CopilotError | null>(null);
  const lastErrorRef = useRef<{ code: string; timestamp: number } | null>(null);

  const pushError = useCallback((code: ErrorCode, raw?: unknown) => {
    const now = Date.now();
    if (
      lastErrorRef.current &&
      lastErrorRef.current.code === code &&
      now - lastErrorRef.current.timestamp < DEDUP_INTERVAL_MS
    ) {
      return;
    }

    lastErrorRef.current = { code, timestamp: now };

    setError({
      code,
      title: ERROR_TITLE[code],
      message: ERROR_MESSAGE[code],
      timestamp: now,
      raw,
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    lastErrorRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ error, pushError, clearError }),
    [error, pushError, clearError],
  );

  return <CopilotErrorContext value={value}>{children}</CopilotErrorContext>;
}

export function useCopilotError(): CopilotErrorContextValue {
  const ctx = useContext(CopilotErrorContext);
  if (!ctx) {
    throw new Error(
      "useCopilotError must be used within a CopilotErrorProvider",
    );
  }
  return ctx;
}

/**
 * Maps a CopilotKit error code (from CopilotKitErrorCode) to our ErrorCode.
 * CopilotKit already classifies errors into structured codes on the runtime
 * side (see error-utils.ts → convertServiceAdapterError), so we read that
 * code directly instead of pattern-matching raw messages.
 *
 * Known CopilotKitErrorCode values:
 *   NETWORK_ERROR, AUTHENTICATION_ERROR, CONFIGURATION_ERROR, UNKNOWN
 */
const COPILOT_CODE_MAP: Record<string, ErrorCode> = {
  NETWORK_ERROR: ErrorCode.SERVICE_UNAVAILABLE,
  AUTHENTICATION_ERROR: ErrorCode.AUTH_FAILED,
  CONFIGURATION_ERROR: ErrorCode.RUNTIME_ERROR,
  UNKNOWN: ErrorCode.UNKNOWN,
};

export function classifyCopilotError(error: unknown): ErrorCode {
  const code =
    (error as { code?: string })?.code ??
    (error as { extensions?: { code?: string } })?.extensions?.code;

  const mapped = code ? COPILOT_CODE_MAP[code] : undefined;

  return mapped ?? ErrorCode.UNKNOWN;
}
