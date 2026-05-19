import { AbsoluteFill } from "remotion";
import React from "react";

/**
 * Browser window frame wrapper
 * Simulates Chrome/Edge browser chrome with URL bar
 */
export const ScreenFrame: React.FC<{
  children: React.ReactNode;
  url?: string;
}> = ({ children, url = "https://pikappoint.com" }) => {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      {/* Browser window */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            background: "#e5e7eb",
            height: 50,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            borderBottom: "1px solid #d1d5db",
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#febc2e",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
          </div>

          {/* URL bar */}
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 14,
              color: "#6b7280",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {url}
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#f9fafb",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
