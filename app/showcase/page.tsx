"use client";

import dynamic from "next/dynamic";
import { AssetSuggestionsCard } from "../components/AssetSuggestions";
import { ExecutionSplitter } from "../components/ExecutionSplitter";
import { SectionWrapper } from "../components/SectionWrapper";
import type { AssetItem } from "../components/TimelineBox";

// Dynamically import PriorityDock to avoid SSR hydration issues with @dnd-kit
const PriorityDock = dynamic(
  () => import("../components/PriorityDock").then((mod) => mod.PriorityDock),
  { ssr: false },
);

const sampleAssets: AssetItem[] = [
  {
    id: "styles-main",
    name: "global-styles.css",
    startTime: 20,
    duration: 800,
    volume: 450,
    type: "css",
  },
  {
    id: "vendor-js",
    name: "vendor.js",
    startTime: 80,
    duration: 350,
    volume: 150,
    type: "script",
  },
  {
    id: "app-js",
    name: "app.js",
    startTime: 100,
    duration: 210,
    volume: 100,
    type: "script",
  },
  {
    id: "fonts-woff",
    name: "fonts.woff",
    startTime: 140,
    duration: 450,
    volume: 60,
    type: "font",
  },
  {
    id: "fonts-woff2",
    name: "fonts.woff2",
    startTime: 155,
    duration: 380,
    volume: 50,
    type: "font",
  },
  {
    id: "analytics-js",
    name: "analytics.js",
    startTime: 200,
    duration: 180,
    volume: 90,
    type: "script",
    moveTo: "background",
  },
  {
    id: "gtm-js",
    name: "gtm.js",
    startTime: 210,
    duration: 250,
    volume: 70,
    type: "script",
  },
  {
    id: "hero-img",
    name: "hero.jpg",
    startTime: 180,
    duration: 1200,
    volume: 450,
    type: "img",
  },
  {
    id: "logo-img",
    name: "logo.png",
    startTime: 220,
    duration: 45,
    volume: 25,
    type: "img",
  },
  {
    id: "icons-sprite",
    name: "icons.svg",
    startTime: 250,
    duration: 110,
    volume: 85,
    type: "img",
  },
  {
    id: "charts-js",
    name: "charts.js",
    startTime: 300,
    duration: 550,
    volume: 280,
    type: "script",
  },
];

const sampleCode = `function processLargeDataset(items) {
  // This function processes thousands of items
  // and can block the main thread
  const results = [];
  for (let i = 0; i < items.length; i++) {
    // Heavy computation per item
    const processed = transformItem(items[i]);
    results.push(processed);
  }
  return results;
}

function transformItem(item) {
  // Complex transformation logic
  return {
    ...item,
    processed: true,
    timestamp: Date.now()
  };
}`;

import { FIX_STRATEGIES } from "../lib/fix-strategies";

export default function ComponentShowcase() {
  const handleYield = (_position: number) => {};

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-primary mb-3 tracking-tight">
            Component Catalog Showcase
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Explore our collection of performance optimization components
            designed to enhance web application speed and user experience.
          </p>
        </header>

        {/* Section: Priority Dock */}
        <SectionWrapper type="PRIORITY_DOCK">
          <PriorityDock
            assets={sampleAssets}
            aiSuggestion="Consider moving gtm.js to Background Priority to defer loading until after LCP. Also, moving charts.js to Background may improve initial page responsiveness."
          />
        </SectionWrapper>

        {/* Section: Layout Stabilization */}
        <SectionWrapper type="LAYOUT_SHIFT">
          <AssetSuggestionsCard
            assetName="Hero image"
            type="img"
            suggestions={[
              {
                type: FIX_STRATEGIES.USE_ASPECT_RATIO,
                label: "Apply aspect-ratio: 4/3",
                params: { width: 1200, height: 900 },
              },
              {
                type: FIX_STRATEGIES.SET_DIMENSIONS,
                label: "Set explicit dimensions",
              },
            ]}
            imageUrl="/screenshot-3.png"
            width={1200}
            height={900}
          />
          <AssetSuggestionsCard
            assetName="Article preview"
            type="img"
            suggestions={[
              {
                type: FIX_STRATEGIES.USE_ASPECT_RATIO,
                label: "Apply aspect-ratio: 16/9",
              },
              {
                type: FIX_STRATEGIES.ADD_SKELETON,
                label: "Add skeleton placeholder",
              },
            ]}
            imageUrl="/screenshot-1.png"
            width={1050}
            height={500}
          />
          <AssetSuggestionsCard
            assetName="Ad banner"
            type="img"
            suggestions={[
              {
                type: FIX_STRATEGIES.SET_DIMENSIONS,
                label: "Apply min-height",
              },
            ]}
            imageUrl="/screenshot-2.png"
            width={728}
            height={600}
          />
        </SectionWrapper>
        {/* Section: Script Sandboxing */}
        <SectionWrapper type="SCRIPT_SANDBOX">
          <AssetSuggestionsCard
            assetName="heavy-analytics.js"
            type="script"
            suggestions={[
              {
                type: FIX_STRATEGIES.ASYNC_SCRIPT,
                label: "Switch to 'async' loading",
              },
              {
                type: FIX_STRATEGIES.DEFER_SCRIPT,
                label: "Defer until after LCP",
              },
              {
                type: FIX_STRATEGIES.LAZY_LOAD_ON_INTERACTION,
                label: "Lazy load on scroll",
              },
              {
                type: FIX_STRATEGIES.REMOVE_UNUSED,
                label: "Investigate removal",
              },
            ]}
          />
          <AssetSuggestionsCard
            assetName="chat-widget.js"
            type="script"
            suggestions={[
              {
                type: FIX_STRATEGIES.LAZY_LOAD_ON_INTERACTION,
                label: "Delay until user interaction",
              },
              {
                type: FIX_STRATEGIES.DEFER_SCRIPT,
                label: "Defer until after LCP",
              },
              {
                type: FIX_STRATEGIES.ASYNC_SCRIPT,
                label: "Load in background",
              },
            ]}
          />
        </SectionWrapper>

        {/* Section: Execution Splitter */}
        <SectionWrapper
          type="EXECUTION_SPLITTER"
          intro="The Execution Splitter helps identify safe points to yield control back to the browser, preventing long tasks from blocking the main thread."
        >
          <ExecutionSplitter
            code={sampleCode}
            markers={[6]}
            strategies={[
              {
                position: 6,
                strategy: "scheduler.yield",
                reason:
                  "Yield control periodically during loop execution to prevent main thread blocking",
              },
            ]}
            onYield={handleYield}
            className="w-full"
          />
        </SectionWrapper>
      </div>
    </main>
  );
}
