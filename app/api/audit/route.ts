import { NextResponse } from "next/server";
import { chromium, Browser } from "playwright";
import { generateAIPromptPayload } from "@/scripts/AIpromptPayload";
import { runFullAudit } from "@/scripts/FullReport";
import { extractLayoutShiftAttribution } from "@/scripts/ShiftAttribution";
import type { AuditData } from "@/scripts/types/index.js";

export async function POST(request: Request) {
  let browser: Browser | null = null;

  try {
    const { url } = (await request.json()) as { url: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "production") {
      const wsEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;
      browser = await chromium.connect(wsEndpoint);
    } else {
      browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext();

    const report = await runFullAudit(context, url);

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const shiftAttribution = await extractLayoutShiftAttribution(page);

    const auditData: AuditData = {
      vitals: report.vitals,
      longTasks: report.longTasks,
      priorityDock: report.priorityDock,
      lcpElement: report.lcpElement,
      shiftAttribution,
    };

    const aiPayload = await generateAIPromptPayload(page, auditData);

    await browser.close();

    return NextResponse.json({
      success: true,
      vitals: report.vitals,
      lcpElement: report.lcpElement,
      data: JSON.parse(aiPayload),
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Audit failed:", error);
    return NextResponse.json(
      { error: "Failed to analyze page performance" },
      { status: 500 },
    );
  }
}
