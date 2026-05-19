import { useCurrentFrame, interpolate } from "remotion";
import React from "react";

/**
 * Step number badge (e.g., "Step 1 of 4")
 * Appears in top-right corner
 */
export const StepIndicator: React.FC<{
  step: number;
  total: number;
  startFrame: number;
}> = ({ step, total, startFrame }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(
    frame,
    [startFrame, startFrame + 20],
    [-20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        right: 44,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
        opacity,
        transform: `translateY(${translateY}px)`,
        border: "1px solid rgba(255, 255, 255, 0.15)",
        letterSpacing: "0.5px",
      }}
    >
      STEP {step} / {total}
    </div>
  );
};
