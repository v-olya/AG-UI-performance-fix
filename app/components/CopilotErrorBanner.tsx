"use client";

import { useEffect, useRef } from "react";
import {
  AlertCircle,
  WifiOff,
  ServerCrash,
  Clock,
  ShieldAlert,
  PackageX,
  Gauge,
  Monitor,
  RotateCcw,
  Link as LinkIcon,
  MonitorX,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { useCopilotError } from "@/app/lib/copilot-error-context";
import { ErrorCode } from "@/app/lib/constants";

const ERROR_ICON: Record<ErrorCode, React.ElementType> = {
  [ErrorCode.SERVICE_UNAVAILABLE]: ServerCrash,
  [ErrorCode.NETWORK_ERROR]: WifiOff,
  [ErrorCode.MODEL_NOT_FOUND]: PackageX,
  [ErrorCode.RATE_LIMITED]: Gauge,
  [ErrorCode.AUTH_FAILED]: ShieldAlert,
  [ErrorCode.RUNTIME_ERROR]: AlertCircle,
  [ErrorCode.TIMEOUT]: Clock,
  [ErrorCode.AUDIT_FAILED]: Monitor,
  [ErrorCode.REAUDIT_FAILED]: RotateCcw,
  [ErrorCode.INVALID_URL]: LinkIcon,
  [ErrorCode.BROWSER_LAUNCH_FAILED]: MonitorX,
  [ErrorCode.UNKNOWN]: AlertCircle,
};

const AUTO_DISMISS_MS = 15_000;

export function CopilotErrorBanner() {
  const { error, clearError } = useCopilotError();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!error) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(clearError, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [error, clearError]);

  if (!error) return null;

  const Icon = ERROR_ICON[error.code];

  return (
    <div
      id="copilot-error-banner"
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <Alert
        variant="destructive"
        className="border-destructive/30 bg-destructive/5 backdrop-blur-md shadow-lg pr-12"
      >
        <Icon className="h-4 w-4" />
        <AlertTitle className="font-semibold">{error.title}</AlertTitle>
        <AlertDescription className="mt-1 text-muted-foreground">
          {error.message}
        </AlertDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3.5 top-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
          onClick={clearError}
          aria-label="Dismiss error"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </Alert>
    </div>
  );
}
