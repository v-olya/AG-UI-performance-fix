import { NextResponse } from "next/server";
import {
  generateScorecard,
  type AIProposedFix,
  type MetricScore,
} from "@/scripts/InjectFixesAndReAudit";
import { ErrorCode } from "@/app/lib/constants";
import { buildErrorResponse } from "@/app/types/api-error";

interface ReauditRequest {
  url: string;
  fixes: AIProposedFix[];
  beforeMetrics: MetricScore;
}

export async function POST(request: Request) {
  try {
    const { url, fixes, beforeMetrics } =
      (await request.json()) as ReauditRequest;

    if (!url || !fixes || !beforeMetrics) {
      return NextResponse.json(
        {
          error: buildErrorResponse(
            ErrorCode.INVALID_URL,
            "url, fixes, and beforeMetrics are required",
          ),
        },
        { status: 400 },
      );
    }

    const scorecard = await generateScorecard(url, beforeMetrics, fixes);

    return NextResponse.json({ success: true, scorecard });
  } catch (error) {
    console.error("Re-audit failed:", error);
    return NextResponse.json(
      {
        error: buildErrorResponse(
          ErrorCode.REAUDIT_FAILED,
          error instanceof Error ? error.message : "Unknown error",
        ),
      },
      { status: 500 },
    );
  }
}
