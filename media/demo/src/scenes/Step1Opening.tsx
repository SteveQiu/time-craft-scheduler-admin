import { useCurrentFrame, interpolate, Easing } from "remotion";
import React from "react";
import { ScreenFrame } from "../components/ScreenFrame";
import { Caption } from "../components/Caption";
import { StepIndicator } from "../components/StepIndicator";
import { Button, Card, Input, Label } from "../components/UIElements";

/**
 * Step 1: Provider creates an opening
 * Duration: ~30 seconds (calculated from TTS audio)
 */
export const Step1Opening: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Animation timings
  const navClickFrame = 60; // 2s - Navigate to Calendar tab
  const openDialogFrame = 120; // 4s - Open "Add Opening" dialog
  const fillFormFrame = 180; // 6s - Fill form fields
  const saveFrame = 240; // 8s - Click Save button
  const openingAppearsFrame = 300; // 10s - Opening appears on grid

  // Tab highlight
  const tabHighlight = interpolate(
    frame,
    [navClickFrame - 10, navClickFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dialog fade in
  const dialogOpacity = interpolate(
    frame,
    [openDialogFrame, openDialogFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Form fill animation (typewriter effect)
  const formFillProgress = interpolate(
    frame,
    [fillFormFrame, fillFormFrame + 60],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  // Opening grid cell fade in
  const gridCellOpacity = interpolate(
    frame,
    [openingAppearsFrame, openingAppearsFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showDialog = frame >= openDialogFrame;
  const showGrid = frame >= openingAppearsFrame;

  return (
    <>
      <ScreenFrame url="https://pikappoint.com/calendar">
        {/* Dashboard header */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#0f172a",
            }}
          >
            Pik<span style={{ color: "#f59e0b" }}>Appoint</span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              Dashboard
            </div>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "system-ui, -apple-system, sans-serif",
                background:
                  tabHighlight > 0.5 ? "#dbeafe" : "transparent",
                color: tabHighlight > 0.5 ? "#1e40af" : "#6b7280",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              Calendar
            </div>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              Appointments
            </div>
          </div>
        </div>

        {/* Calendar content */}
        <div style={{ padding: 24, position: "relative" }}>
          {/* Header with Add Opening button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#0f172a",
              }}
            >
              Calendar
            </h2>
            <Button
              style={{
                boxShadow:
                  frame >= navClickFrame && frame < openDialogFrame
                    ? "0 0 0 3px rgba(59, 130, 246, 0.3)"
                    : "none",
              }}
            >
              + Add Opening
            </Button>
          </div>

          {/* Calendar grid placeholder */}
          {!showDialog && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 8,
                marginTop: 16,
              }}
            >
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#6b7280",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {i === 15 && showGrid && (
                    <div
                      style={{
                        opacity: gridCellOpacity,
                        background: "#dbeafe",
                        width: "100%",
                        height: "100%",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#1e40af",
                      }}
                    >
                      9:00 AM
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Opening Dialog */}
        {showDialog && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: dialogOpacity,
            }}
          >
            <Card style={{ maxWidth: 500, width: "90%" }}>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: "#0f172a",
                }}
              >
                Add Opening
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <Label>Date</Label>
                  <Input
                    value={
                      formFillProgress > 0.2 ? "2026-05-20" : ""
                    }
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    value={formFillProgress > 0.4 ? "09:00" : ""}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    value={formFillProgress > 0.6 ? "10:00" : ""}
                  />
                </div>
                <div>
                  <Label>Service</Label>
                  <Input
                    value={
                      formFillProgress > 0.8
                        ? "Haircut"
                        : ""
                    }
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
                  <Button
                    style={{
                      opacity: formFillProgress >= 1 ? 1 : 0.5,
                    }}
                  >
                    Save Opening
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </ScreenFrame>

      <StepIndicator step={1} total={4} startFrame={0} />
      <Caption
        text="Provider creates an opening"
        startFrame={0}
        endFrame={durationInFrames}
      />
    </>
  );
};
