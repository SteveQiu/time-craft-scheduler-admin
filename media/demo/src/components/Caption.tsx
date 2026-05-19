import { useCurrentFrame, interpolate } from "remotion";
import React from "react";

/**
 * Animated caption overlay
 * Appears at bottom-center with fade in/out
 */
export const Caption: React.FC<{
  text: string;
  startFrame: number;
  endFrame: number;
}> = ({ text, startFrame, endFrame }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 20, endFrame - 20, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (frame < startFrame || frame > endFrame) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(8px)",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "system-ui, -apple-system, sans-serif",
        opacity,
        maxWidth: "80%",
        textAlign: "center",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {text}
    </div>
  );
};
