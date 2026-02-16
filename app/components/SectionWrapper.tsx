export enum SECTIONS {
  SCRIPT_SANDBOX = "Script Sandboxing: 3rd-party scripts management",
  LAYOUT_SHIFT = "Layout Stabilization: shifts fix-up",
  PRIORITY_DOCK = "Priority Dock: prioritize or defer resources",
  EXECUTION_SPLITTER = "Execution Splitter: de-chunk non-3rd-party blocking code",
}

export function SectionWrapper({
  title,
  children,
  intro,
  className,
}: {
  title: SECTIONS;
  children: React.ReactNode;
  intro?: string;
  className?: string;
}) {
  return (
    <section className={`${className} flex flex-wrap justify-center-safe`}>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {intro && <p className="mb-4 text-gray-600">{intro}</p>}
      {children}
    </section>
  );
}
