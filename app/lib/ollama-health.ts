import { ErrorCode } from "@/app/lib/constants";
import type { StructuredApiError } from "@/app/types/api-error";
import { buildErrorResponse } from "@/app/types/api-error";

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud";
const HEALTH_TIMEOUT_MS = 3_000;

interface OllamaTagsResponse {
  models?: Array<{ name: string }>;
}

export interface HealthCheckResult {
  healthy: boolean;
  error?: StructuredApiError;
}

export async function checkOllamaHealth(): Promise<HealthCheckResult> {
  let response: Response;

  try {
    response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
  } catch {
    return {
      healthy: false,
      error: buildErrorResponse(
        ErrorCode.SERVICE_UNAVAILABLE,
        `Cannot reach Ollama at ${ollamaBaseUrl}`,
      ),
    };
  }

  if (!response.ok) {
    return {
      healthy: false,
      error: buildErrorResponse(
        ErrorCode.SERVICE_UNAVAILABLE,
        `Ollama responded with ${response.status}`,
      ),
    };
  }

  const data = (await response.json()) as OllamaTagsResponse;
  const availableModels = data.models?.map((m) => m.name) ?? [];
  const modelBase = ollamaModel.split(":")[0];
  const modelFound = availableModels.some(
    (name) => name === ollamaModel || name.startsWith(`${modelBase}:`),
  );

  if (!modelFound) {
    return {
      healthy: false,
      error: buildErrorResponse(
        ErrorCode.MODEL_NOT_FOUND,
        `Model "${ollamaModel}" not pulled. Available: ${availableModels.join(", ") || "none"}`,
      ),
    };
  }

  return { healthy: true };
}
