"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { useState, useCallback } from "react";
import {
  RestaurantList,
  BookingForm,
  Confirmation,
  Restaurant,
} from "./components";

export const dynamic = "force-dynamic";

function PerformanceAssistant() {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

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
      setShowPlaceholder(true);
      return {
        success: true,
        url,
        message: "Performance analysis placeholder - add your components here",
      };
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        return <div>Analyzing performance...</div>;
      }
      if (showPlaceholder || result) {
        return (
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <p className="text-gray-600">
              Performance analysis ready. Add your performance components to the
              catalog.
            </p>
          </div>
        );
      }
      return <></>;
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
            placeholder: "Try London ... or Italian food",
          }}
        />
      </header>
      <CopilotChat
        className="flex-1 w-full m-0 rounded-none border-0 border-l shadow-none"
        labels={{
          title: "Assistant",
          initial:
            "Hi! I can help you analyze and fix page performance issues. Describe the page or provide a URL to get started.",
        }}
      />
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
