/**
 * PolarizationGauge — custom SVG half-arc gauge showing polarization level.
 * Green (0-0.3), Amber (0.3-0.6), Red (0.6-1.0).
 */

interface PolarizationGaugeProps {
  /** Value from 0.0 to 1.0. */
  value: number;
  /** Gauge size in pixels. */
  size?: number;
  /** Show numeric label below. */
  showLabel?: boolean;
}

export function PolarizationGauge({
  value,
  size = 80,
  showLabel = true,
}: PolarizationGaugeProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const angle = clamped * 180;

  // Arc parameters
  const cx = size / 2;
  const cy = size * 0.65;
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;

  // Color based on value
  const color =
    clamped < 0.3 ? "#22c55e" : clamped < 0.6 ? "#f59e0b" : "#ef4444";

  // Convert angle to SVG arc endpoint
  const endAngle = Math.PI - (angle * Math.PI) / 180;
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy - radius * Math.sin(endAngle);

  // Background arc (full semicircle)
  const bgPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Value arc
  const largeArc = angle > 180 ? 1 : 0;
  const valuePath =
    angle > 0
      ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`
      : "";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
        {/* Background track */}
        <path
          d={bgPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-stone-200 dark:text-stone-700"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {valuePath && (
          <path
            d={valuePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Needle dot */}
        <circle cx={endX} cy={endY} r={strokeWidth * 0.6} fill={color} />
      </svg>
      {showLabel && (
        <span
          className="text-xs font-bold mt-0.5"
          style={{ color }}
        >
          {clamped.toFixed(2)}
        </span>
      )}
    </div>
  );
}
