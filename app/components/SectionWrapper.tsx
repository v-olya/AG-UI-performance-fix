import { SectionType } from "@/scripts/types";
import { ReactNode } from "react";

export const SECTIONS: Record<SectionType, string> = {
  SCRIPT_SANDBOX: "Script Sandboxing: 3rd-party scripts management",
  LAYOUT_SHIFT: "Layout Stabilization: shifts fix-up",
  PRIORITY_DOCK: "Priority Dock: prioritize or defer resources",
  EXECUTION_SPLITTER: "Execution Splitter: de-chunk long running tasks",
};

export function SectionWrapper({
  type,
  children,
  intro,
  className,
}: {
  type: SectionType;
  children: ReactNode;
  intro?: string;
  className?: string;
}) {
  return (
    <section className={`${className ?? ""} mb-12 text-center`}>
      <h2 className="text-2xl font-bold mb-4">{SECTIONS[type]}</h2>
      {intro && <p className="mb-4 text-gray-600">{intro}</p>}
      <div className="flex flex-wrap justify-center-safe items-stretch">
        {children}
      </div>
    </section>
  );
}
