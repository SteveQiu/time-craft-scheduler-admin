import { useCurrentFrame, interpolate, Easing } from "remotion";
import React from "react";
import { ScreenFrame } from "../components/ScreenFrame";
import { Caption } from "../components/Caption";
import { StepIndicator } from "../components/StepIndicator";
import { Button, Card, Badge } from "../components/UIElements";

/**
 * Step 4: Provider completes the reservation
 * Duration: ~30 seconds (calculated from TTS audio)
 */
export const Step4Complete: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Animation timings
  const selectConfirmedFrame = 90; // 3s - Select confirmed appointment
  const openDetailsFrame = 150; // 5s - Details panel opens
  const clickCompleteFrame = 270; // 9s - Click "Mark Complete" button
  const statusChangeFrame = 330; // 11s - Status changes to Completed
  const paymentProofFrame = 390; // 13s - Payment proof option appears

  // Card selection highlight
  const cardHighlight = interpolate(
    frame,
    [selectConfirmedFrame - 10, selectConfirmedFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Details panel slide in
  const detailsSlideX = interpolate(
    frame,
    [openDetailsFrame, openDetailsFrame + 30],
    [400, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  // Complete button pulse
  const buttonPulse = interpolate(
    frame,
    [clickCompleteFrame - 20, clickCompleteFrame],
    [1, 1.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Status badge morph (confirmed → completed)
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

  // Payment proof section fade in
  const paymentProofOpacity = interpolate(
    frame,
    [paymentProofFrame, paymentProofFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const showDetails = frame >= openDetailsFrame;
  const isCompleted = frame >= statusChangeFrame;
  const showPaymentProof = frame >= paymentProofFrame;

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
                background: "#dbeafe",
                color: "#1e40af",
                cursor: "pointer",
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

            {/* Confirmed/Completed appointment card */}
            <Card
              style={{
                marginBottom: 16,
                border:
                  cardHighlight > 0.5
                    ? "2px solid #3b82f6"
                    : "1px solid #e5e7eb",
                boxShadow:
                  cardHighlight > 0.5
                    ? "0 0 0 3px rgba(59, 130, 246, 0.1)"
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
                    💰 $45.00
                  </div>
                </div>
                {isCompleted ? (
                  <Badge
                    variant="completed"
                    style={{
                      transform: `scale(${1 + statusMorph * 0.1})`,
                    }}
                  >
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="confirmed">Confirmed</Badge>
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

                {!isCompleted && (
                  <Button
                    style={{
                      width: "100%",
                      background: "#3b82f6",
                      transform: `scale(${buttonPulse})`,
                    }}
                  >
                    Mark Complete
                  </Button>
                )}

                {isCompleted && (
                  <>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#dbeafe",
                        color: "#1e3a8a",
                        fontSize: 14,
                        fontWeight: 600,
                        textAlign: "center",
                        marginBottom: 16,
                      }}
                    >
                      ✅ Appointment Completed
                    </div>

                    {showPaymentProof && (
                      <div
                        style={{
                          opacity: paymentProofOpacity,
                          borderTop: "1px solid #e5e7eb",
                          paddingTop: 16,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#6b7280",
                            marginBottom: 8,
                          }}
                        >
                          Payment Proof (Optional)
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ width: "100%" }}
                        >
                          📷 Upload Receipt
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </ScreenFrame>

      <StepIndicator step={4} total={4} startFrame={0} />
      <Caption
        text="Provider completes the reservation"
        startFrame={0}
        endFrame={durationInFrames}
      />
    </>
  );
};
