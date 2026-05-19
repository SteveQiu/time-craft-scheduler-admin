import { useCurrentFrame, interpolate, Easing } from "remotion";
import React from "react";
import { ScreenFrame } from "../components/ScreenFrame";
import { Caption } from "../components/Caption";
import { StepIndicator } from "../components/StepIndicator";
import { Button, Card, Badge, Input } from "../components/UIElements";

/**
 * Step 2: Customer books an opening
 * Duration: ~30 seconds (calculated from TTS audio)
 */
export const Step2Booking: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Animation timings
  const browseFrame = 30; // 1s - Browse openings
  const selectFrame = 120; // 4s - Select an opening
  const bookDialogFrame = 180; // 6s - Open booking dialog
  const fillContactFrame = 240; // 8s - Fill contact info
  const confirmFrame = 300; // 10s - Click Confirm
  const confirmationFrame = 360; // 12s - Show confirmation screen

  // Opening cards fade in
  const cardsOpacity = interpolate(
    frame,
    [browseFrame, browseFrame + 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Selected card highlight
  const selectedHighlight = interpolate(
    frame,
    [selectFrame - 10, selectFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Dialog fade in
  const dialogOpacity = interpolate(
    frame,
    [bookDialogFrame, bookDialogFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Contact form fill
  const contactFillProgress = interpolate(
    frame,
    [fillContactFrame, fillContactFrame + 60],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  // Confirmation screen
  const confirmationOpacity = interpolate(
    frame,
    [confirmationFrame, confirmationFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showDialog = frame >= bookDialogFrame && frame < confirmationFrame;
  const showConfirmation = frame >= confirmationFrame;

  return (
    <>
      <ScreenFrame url="https://pikappoint.com/browse">
        {/* Browse header */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </div>

        {/* Browse content */}
        <div style={{ padding: 24, position: "relative" }}>
          {!showConfirmation && (
            <>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "#0f172a",
                  marginBottom: 20,
                }}
              >
                Available Openings
              </h2>

              {/* Opening cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                  opacity: cardsOpacity,
                }}
              >
                {/* First card - will be selected */}
                <Card
                  style={{
                    border:
                      selectedHighlight > 0.5
                        ? "2px solid #3b82f6"
                        : "1px solid #e5e7eb",
                    boxShadow:
                      selectedHighlight > 0.5
                        ? "0 0 0 3px rgba(59, 130, 246, 0.1)"
                        : "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "all 0.3s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      Haircut
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                      }}
                    >
                      📅 May 20, 2026 • 9:00 AM - 10:00 AM
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                      }}
                    >
                      📍 Downtown Salon
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      $45.00
                    </div>
                    <Button size="sm">Book Now</Button>
                  </div>
                </Card>

                {/* Placeholder cards */}
                <Card>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>
                    Another opening...
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>
                    Another opening...
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Confirmation screen */}
          {showConfirmation && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                opacity: confirmationOpacity,
              }}
            >
              <Card style={{ maxWidth: 500, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 48,
                    marginBottom: 20,
                  }}
                >
                  ✅
                </div>
                <h3
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 12,
                    color: "#0f172a",
                  }}
                >
                  Booking Confirmed!
                </h3>
                <p
                  style={{
                    fontSize: 16,
                    color: "#6b7280",
                    marginBottom: 20,
                  }}
                >
                  Your reservation is now{" "}
                  <Badge variant="pending">Pending</Badge> provider
                  approval.
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "#9ca3af",
                  }}
                >
                  We'll notify you once the provider confirms.
                </p>
              </Card>
            </div>
          )}
        </div>

        {/* Booking Dialog */}
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
                Book Appointment
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Name
                  </label>
                  <Input
                    value={
                      contactFillProgress > 0.25
                        ? "John Doe"
                        : ""
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </label>
                  <Input
                    value={
                      contactFillProgress > 0.5
                        ? "john@example.com"
                        : ""
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Phone
                  </label>
                  <Input
                    value={
                      contactFillProgress > 0.75
                        ? "(555) 123-4567"
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
                      opacity: contactFillProgress >= 1 ? 1 : 0.5,
                    }}
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </ScreenFrame>

      <StepIndicator step={2} total={4} startFrame={0} />
      <Caption
        text="Customer books an opening"
        startFrame={0}
        endFrame={durationInFrames}
      />
    </>
  );
};
