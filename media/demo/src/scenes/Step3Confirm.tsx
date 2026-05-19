import { useCurrentFrame, interpolate, Easing } from "remotion";
import React from "react";
import { ScreenFrame } from "../components/ScreenFrame";
import { Caption } from "../components/Caption";
import { StepIndicator } from "../components/StepIndicator";
import { Button, Card, Badge } from "../components/UIElements";

/**
 * Step 3: Provider confirms the reservation
 * Duration: ~30 seconds (calculated from TTS audio)
 */
export const Step3Confirm: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Animation timings
  const navAppointmentsFrame = 60; // 2s - Navigate to Appointments tab
  const selectPendingFrame = 150; // 5s - Click on pending appointment
  const reviewDetailsFrame = 210; // 7s - Review details panel
  const approveClickFrame = 300; // 10s - Click Approve button
  const statusChangeFrame = 360; // 12s - Status changes to Confirmed

  // Tab highlight
  const tabHighlight = interpolate(
    frame,
    [navAppointmentsFrame - 10, navAppointmentsFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Card selection highlight
  const cardHighlight = interpolate(
    frame,
    [selectPendingFrame - 10, selectPendingFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Details panel slide in
  const detailsSlideX = interpolate(
    frame,
    [reviewDetailsFrame, reviewDetailsFrame + 30],
    [400, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  // Status badge morph (pending → confirmed)
  const statusMorph = interpolate(
    frame,
    [statusChangeFrame, statusChangeFrame + 30],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  const showDetails = frame >= reviewDetailsFrame;
  const isConfirmed = frame >= statusChangeFrame;

  return (
    <>
      <ScreenFrame url="https://pikappoint.com/appointments">
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
                color: "#6b7280",
                cursor: "pointer",
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
                background:
                  tabHighlight > 0.5 ? "#dbeafe" : "transparent",
                color: tabHighlight > 0.5 ? "#1e40af" : "#6b7280",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              Appointments
            </div>
          </div>
        </div>

        {/* Appointments content */}
        <div
          style={{
            padding: 24,
            position: "relative",
            display: "flex",
            gap: 24,
          }}
        >
          {/* Appointments list */}
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#0f172a",
                marginBottom: 20,
              }}
            >
              Appointments
            </h2>

            {/* Pending appointment card */}
            <Card
              style={{
                marginBottom: 16,
                border:
                  cardHighlight > 0.5
                    ? "2px solid #f59e0b"
                    : "1px solid #e5e7eb",
                boxShadow:
                  cardHighlight > 0.5
                    ? "0 0 0 3px rgba(245, 158, 11, 0.1)"
                    : "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 8,
                    }}
                  >
                    Haircut
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    📅 May 20, 2026 • 9:00 AM
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    👤 John Doe
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                    }}
                  >
                    📧 john@example.com
                  </div>
                </div>
                {isConfirmed ? (
                  <Badge
                    variant="confirmed"
                    style={{
                      transform: `scale(${1 + statusMorph * 0.1})`,
                    }}
                  >
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="pending">Pending</Badge>
                )}
              </div>
            </Card>

            {/* Other appointments placeholder */}
            <Card style={{ marginBottom: 16, opacity: 0.5 }}>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>
                Another appointment...
              </div>
            </Card>
          </div>

          {/* Details panel (slides in from right) */}
          {showDetails && (
            <div
              style={{
                width: 400,
                transform: `translateX(${detailsSlideX}px)`,
              }}
            >
              <Card>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "#0f172a",
                  }}
                >
                  Appointment Details
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 4,
                      }}
                    >
                      Service
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      Haircut
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 4,
                      }}
                    >
                      Customer
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      John Doe
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      john@example.com
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      (555) 123-4567
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 4,
                      }}
                    >
                      Date & Time
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      May 20, 2026 • 9:00 AM - 10:00 AM
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: 4,
                      }}
                    >
                      Total
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      $45.00
                    </div>
                  </div>
                </div>

                {!isConfirmed && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      style={{
                        flex: 1,
                        background: "#10b981",
                      }}
                    >
                      Approve
                    </Button>
                    <Button variant="outline" style={{ flex: 1 }}>
                      Decline
                    </Button>
                  </div>
                )}

                {isConfirmed && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 8,
                      background: "#d1fae5",
                      color: "#065f46",
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    ✅ Appointment Confirmed
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </ScreenFrame>

      <StepIndicator step={3} total={4} startFrame={0} />
      <Caption
        text="Provider confirms the reservation"
        startFrame={0}
        endFrame={durationInFrames}
      />
    </>
  );
};
