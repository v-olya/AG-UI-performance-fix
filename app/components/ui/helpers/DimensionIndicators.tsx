interface DimensionIndicatorsProps {
  width: number;
  height: number;
}

export function DimensionIndicators({
  width,
  height,
}: DimensionIndicatorsProps) {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Width indicator */}
      <div className="flex items-center gap-2">
        <svg
          width="80"
          height="10"
          viewBox="0 0 80 10"
          className="text-foreground"
          aria-hidden="true"
        >
          <line
            x1="4"
            y1="5"
            x2="76"
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
            x1="76"
            y1="1"
            x2="76"
            y2="9"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polygon points="70,3 76,5 70,7" fill="currentColor" />
          <polygon points="10,3 4,5 10,7" fill="currentColor" />
        </svg>
        <span className="text-xs font-mono font-semibold text-foreground tracking-wider">
          W: {width}px
        </span>
      </div>

      {/* Height indicator */}
      <div className="flex items-center gap-2">
        <svg
          width="10"
          height="40"
          viewBox="0 0 10 40"
          className="text-foreground"
          aria-hidden="true"
        >
          <line
            x1="5"
            y1="4"
            x2="5"
            y2="36"
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
            y1="36"
            x2="9"
            y2="36"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polygon points="3,10 5,4 7,10" fill="currentColor" />
          <polygon points="3,30 5,36 7,30" fill="currentColor" />
        </svg>
        <span className="text-xs font-mono font-semibold text-foreground tracking-wider">
          H: {height}px
        </span>
      </div>
    </div>
  );
}
