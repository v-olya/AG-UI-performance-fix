import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

interface AssetPreviewCardProps {
  assetName: string;
  text: string[];
  imageUrl?: string;
  width?: number;
  height?: number;
}

function AxisIndicators({ width, height }: { width: number; height: number }) {
  return (
    <div className="flex flex-col items-center gap-3 mt-5">
      {/* Ox axis (width) - horizontal line with end caps */}
      <div className="flex flex-col items-center gap-1">
        <svg
          width="100"
          height="10"
          viewBox="0 0 100 10"
          className="text-accent"
          aria-hidden="true"
        >
          <line
            x1="4"
            y1="5"
            x2="96"
            y2="5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="4"
            y1="1"
            x2="4"
            y2="9"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="96"
            y1="1"
            x2="96"
            y2="9"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polygon points="90,3 96,5 90,7" fill="currentColor" />
          <polygon points="10,3 4,5 10,7" fill="currentColor" />
        </svg>
        <span className="text-[10px] font-mono font-semibold text-accent tracking-wider">
          Ox: {width}px
        </span>
      </div>

      {/* Oy axis (height) - vertical line with end caps */}
      <div className="flex items-center gap-1.5">
        <svg
          width="10"
          height="50"
          viewBox="0 0 10 50"
          className="text-accent"
          aria-hidden="true"
        >
          <line
            x1="5"
            y1="4"
            x2="5"
            y2="46"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="1"
            y1="4"
            x2="9"
            y2="4"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="1"
            y1="46"
            x2="9"
            y2="46"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polygon points="3,10 5,4 7,10" fill="currentColor" />
          <polygon points="3,40 5,46 7,40" fill="currentColor" />
        </svg>
        <span className="text-[10px] font-mono font-semibold text-accent tracking-wider">
          Oy: {height}px
        </span>
      </div>
    </div>
  );
}

export function AssetPreviewCard({
  assetName,
  text,
  imageUrl = "/images/asset-preview.jpg",
  width,
  height,
}: AssetPreviewCardProps) {
  const hasDimensions = width != null && height != null;

  return (
    <Card className="flex flex-col md:flex-row overflow-hidden w-full max-w-2xl h-[360px] border-border/80 shadow-md">
      {/* Left column - Image preview with asset name */}
      <div className="relative flex flex-col flex-1 min-h-[200px] p-6 bg-muted/40">
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
            <div
              className="absolute inset-0 bg-contain bg-no-repeat bg-center"
              style={{ backgroundImage: `url(${URL})` }}
              role="img"
              aria-label={`Preview of ${assetName}`}
            />
            {isScript ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <h2 className="w-min text-xl md:text-2xl font-bold tracking-tight text-balance text-center p-2 rounded-lg text-amber-800 bg-white/90 shadow-lg">
                  {assetName}
                </h2>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 bg-foreground/40" />
                <div className="relative z-10 flex items-center justify-center p-6">
                  <h2
                    className="text-xl md:text-2xl font-bold tracking-tight text-balance text-center p-2 rounded-lg text-white"
                    style={{
                      textShadow:
                        "2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.5)",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    {assetName}
                  </h2>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right column - Stacked badges/buttons */}
      <div className="flex flex-col justify-center gap-2.5 p-6 md:w-56 bg-card overflow-y-auto">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Options
        </span>
        {text.map((label) => (
          <Badge
            key={label}
            variant="secondary"
            className={cn(
              "justify-center py-2 px-4 text-sm rounded-lg cursor-pointer",
              "transition-all hover:bg-primary hover:text-primary-foreground",
              "border border-border/60 hover:border-primary",
            )}
            role="button"
            tabIndex={0}
          >
            {label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
