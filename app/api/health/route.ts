import { NextResponse } from "next/server";
import { checkOllamaHealth } from "@/app/lib/ollama-health";

export async function GET() {
  const result = await checkOllamaHealth();

  if (!result.healthy) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result);
}
