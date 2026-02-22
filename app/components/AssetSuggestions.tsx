import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { DimensionIndicators } from "./ui/helpers/DimensionIndicators";
import { cn } from "../lib/utils";
import { type AssetType } from "./TimelineBox";

interface AssetSuggestionsCardProps {
  assetName: string;
  type: AssetType;
  text: string[];
  imageUrl?: string;
  width?: number;
  height?: number;
  onSuggestionClick?: (suggestion: string) => void;
}

export function AssetSuggestionsCard({
  assetName,
  type,
  text,
  imageUrl,
  width,
  height,
  onSuggestionClick,
}: AssetSuggestionsCardProps) {
  const hasDimensions = width != null && height != null;
  const isScript = type === "script";
  const URL = imageUrl || (isScript ? "/script.png" : imageUrl);
  return (
    <Card className="flex flex-col md:flex-row w-full max-w-lg border-border/80 shadow-md">
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

        {hasDimensions && (
          <div className="mt-3 flex items-center justify-center">
            <DimensionIndicators width={width} height={height} />
          </div>
        )}
      </div>

      {/* Right column - Stacked badges/buttons */}
      <div className="flex flex-col flex-1 justify-center gap-3 p-5 bg-card min-w-[180px]">
        {text.map((label) => (
          <Badge
            key={label}
            variant="secondary"
            className={cn(
              "justify-center py-3 px-4 text-sm rounded-lg cursor-pointer whitespace-normal h-auto leading-tight",
              "transition-all hover:bg-primary hover:text-primary-foreground",
              "border border-border/60 hover:border-primary",
            )}
            role="button"
            tabIndex={0}
            onClick={() => onSuggestionClick?.(label)}
          >
            {label}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
