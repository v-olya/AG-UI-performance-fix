"use client";

import { Suspense, lazy, useState } from "react";
import { CopilotPopup } from "@copilotkit/react-ui";
import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";

const DummyAnalysisComponent = lazy(() =>
  import("./components/DummyAnalysisComponent").then((mod) => ({
    default: mod.DummyAnalysisComponent,
  })),
);

export const dynamic = "force-dynamic";

interface AnalysisResult {
  success: boolean;
  url: string;
  message: string;
}

function PerformanceAssistant() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useCopilotAction({
    name: "analyzePerformance",
    description: "Analyze page performance issues",
    parameters: [
      {
        name: "url",
        type: "string",
        description: "The URL of the page to analyze",
      },
    ],
    handler: async ({ url }) => {
      setIsAnalyzing(true);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const analysisResult: AnalysisResult = {
        success: true,
        url,
        message: "Performance analysis complete",
      };

      setResult(analysisResult);
      setIsAnalyzing(false);

      return analysisResult;
    },
  });

  return (
    <main className="h-screen w-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Page Performance Assistant
        </h1>
        <CopilotPopup
          labels={{
            placeholder:
              "Hi! I can help you analyze and fix page performance issues.",
          }}
        />
      </header>

      <div className="flex-1 p-6 overflow-auto">
        {isAnalyzing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing page performance...</p>
            </div>
          </div>
        ) : result ? (
          <Suspense fallback={<div>Loading component...</div>}>
            <DummyAnalysisComponent result={result} />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">
              Ask the assistant to analyze a page URL
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <PerformanceAssistant />
    </CopilotKit>
  );
}
