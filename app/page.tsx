"use client";

import { useCallback } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import type { CopilotErrorEvent } from "@copilotkit/shared";
import { AuditCanvas } from "./components/AuditCanvas";
import { CopilotErrorBanner } from "./components/CopilotErrorBanner";
import {
  CopilotErrorProvider,
  useCopilotError,
  classifyCopilotError,
} from "./lib/copilot-error-context";

export const dynamic = "force-dynamic";

function CopilotShell() {
  const { pushError } = useCopilotError();

  const handleCopilotError = useCallback(
    (event: CopilotErrorEvent) => {
      if (event.type !== "error") return;

      const code = classifyCopilotError(event.error);
      pushError(code, event.error);
    },
    [pushError],
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_API_KEY}
      onError={handleCopilotError}
    >
      <CopilotErrorBanner />
      <AuditCanvas />
    </CopilotKit>
  );
}

export default function Home() {
  return (
    <CopilotErrorProvider>
      <CopilotShell />
    </CopilotErrorProvider>
  );
}
