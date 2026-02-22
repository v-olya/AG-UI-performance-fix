export const ErrorCode = {
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_FAILED: "AUTH_FAILED",
  RUNTIME_ERROR: "RUNTIME_ERROR",
  TIMEOUT: "TIMEOUT",
  AUDIT_FAILED: "AUDIT_FAILED",
  REAUDIT_FAILED: "REAUDIT_FAILED",
  INVALID_URL: "INVALID_URL",
  BROWSER_LAUNCH_FAILED: "BROWSER_LAUNCH_FAILED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_TITLE: Record<ErrorCode, string> = {
  [ErrorCode.SERVICE_UNAVAILABLE]: "AI Service Unavailable",
  [ErrorCode.NETWORK_ERROR]: "Connection Problem",
  [ErrorCode.MODEL_NOT_FOUND]: "Model Not Found",
  [ErrorCode.RATE_LIMITED]: "Too Many Requests",
  [ErrorCode.AUTH_FAILED]: "Authentication Failed",
  [ErrorCode.RUNTIME_ERROR]: "Processing Error",
  [ErrorCode.TIMEOUT]: "Request Timed Out",
  [ErrorCode.AUDIT_FAILED]: "Audit Failed",
  [ErrorCode.REAUDIT_FAILED]: "Re-Audit Failed",
  [ErrorCode.INVALID_URL]: "Invalid URL",
  [ErrorCode.BROWSER_LAUNCH_FAILED]: "Browser Error",
  [ErrorCode.UNKNOWN]: "Something Went Wrong",
};

export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  [ErrorCode.SERVICE_UNAVAILABLE]:
    "The AI service is not reachable. Please verify that Ollama is running and try again.",
  [ErrorCode.NETWORK_ERROR]:
    "Unable to connect to the AI backend. Check your network connection and try again.",
  [ErrorCode.MODEL_NOT_FOUND]:
    "The requested AI model could not be found. Make sure it is pulled in Ollama.",
  [ErrorCode.RATE_LIMITED]:
    "You are sending requests too fast. Please wait a moment before trying again.",
  [ErrorCode.AUTH_FAILED]:
    "The AI service rejected the credentials. Please check your configuration.",
  [ErrorCode.RUNTIME_ERROR]:
    "The AI assistant encountered an internal error while processing your request.",
  [ErrorCode.TIMEOUT]:
    "The request took too long to respond. The AI service might be overloaded — try again shortly.",
  [ErrorCode.AUDIT_FAILED]:
    "The performance audit could not be completed. The target page may be unreachable or blocking automated browsers.",
  [ErrorCode.REAUDIT_FAILED]:
    "The re-audit with applied fixes could not be completed. Try running the audit again.",
  [ErrorCode.INVALID_URL]:
    "The URL you entered could not be loaded. Please check the format and make sure the page is accessible.",
  [ErrorCode.BROWSER_LAUNCH_FAILED]:
    "Playwright could not launch a browser session. Make sure Playwright is installed correctly.",
  [ErrorCode.UNKNOWN]:
    "An unexpected error occurred. If this keeps happening, please restart the application.",
};
