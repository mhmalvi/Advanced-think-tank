/**
 * Sparkline — tiny inline trend chart using Recharts.
 * Used in SimulationPulse, MetricStrip, and SimulationSection.
 */

import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
  /** Array of numeric values to plot. */
  data: number[];
  /** Line color (CSS color string). */
  color?: string;
  /** Chart height in pixels. */
  height?: number;
  /** Chart width (CSS string or number). */
  width?: number | string;
}

export function Sparkline({
  data,
  color = "#E30613",
  height = 24,
  width = "100%",
}: SparklineProps) {
  const points = data.map((value, index) => ({ index, value }));

  if (points.length < 2) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
