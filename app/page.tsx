"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { AuditCanvas } from "./components/AuditCanvas";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <AuditCanvas />
    </CopilotKit>
  );
}
