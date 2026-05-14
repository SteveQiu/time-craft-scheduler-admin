import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Audio,
  staticFile,
  Img,
} from "remotion";
import { Easing } from "remotion";

/**
 * Premium Product Demo Video
 *
 * Duration: Dynamic (calculated from audio)
 * Resolution: 1920×1080 @ 30fps
 * Format: H.264 MP4
 *
 * Scenes:
 * 1. Hook (3.78s) - Browse landing / problem statement
 * 2. SlideA (4s) - Feature highlights (PowerPoint-style)
 * 3. Solution (5.82s) - Dashboard + premium upgrade
 * 4. Benefits (3.99s) - Premium active dashboard
 * 5. SlideB (5s) - Social proof / stats (PowerPoint-style)
 * 6. SlideC (5s) - Pricing (PowerPoint-style)
 * 7. CTA (4.14s) - Calendar / call to action
 */

export interface PremiumProductDemoProps {
  sceneDurations: number[];
}

// Shared brand overlay logo
const BrandLogo = () => (
  <div
    style={{
      position: "absolute",
      top: 36,
      left: 44,
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <div
      style={{
        background: "rgba(15,23,42,0.75)",
        backdropFilter: "blur(8px)",
        borderRadius: 10,
        padding: "8px 16px",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <span style={{ color: "#fff", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px" }}>
        Pik<span style={{ color: "#f59e0b" }}>Appoint</span>
      </span>
    </div>
  </div>
);

// Ken Burns screenshot layer
const KenBurnsShot = ({
  src,
  frame,
  duration,
  zoomFrom = 1.0,
  zoomTo = 1.08,
  originX = "50%",
  originY = "50%",
}: {
  src: string;
  frame: number;
  duration: number;
  zoomFrom?: number;
  zoomTo?: number;
  originX?: string;
  originY?: string;
}) => {
  const scale = interpolate(frame, [0, duration], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity: fadeIn,
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          transformOrigin: `${originX} ${originY}`,
        }}
      />
    </div>
  );
};

// Dark overlay gradient for text legibility
const DarkOverlay = ({ intensity = 0.55 }: { intensity?: number }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(to top, rgba(0,0,0,${intensity + 0.2}) 0%, rgba(0,0,0,${intensity * 0.4}) 50%, rgba(0,0,0,${intensity * 0.15}) 100%)`,
      zIndex: 2,
    }}
  />
);

// Scene title card — fade in from below
const SceneTitle = ({
  frame,
  title,
  subtitle,
  delayFrames = 15,
}: {
  frame: number;
  title: string;
  subtitle?: string;
  delayFrames?: number;
}) => {
  const opacity = interpolate(frame, [delayFrames, delayFrames + 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const y = interpolate(frame, [delayFrames, delayFrames + 25], [24, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 72,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: "0 80px",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(15,23,42,0.82)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "20px 36px",
          maxWidth: 900,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 22,
              color: "#94a3b8",
              marginTop: 8,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export const PremiumProductDemo = ({
  sceneDurations = [113, 120, 175, 120, 150, 150, 124],
}: PremiumProductDemoProps) => {
  const [s1, sA, s2, s3, sB, sC, s4] = sceneDurations;
  const cumulativeFrames = sceneDurations.reduce((acc, d, i) => {
    acc.push((acc[i - 1] || 0) + (sceneDurations[i - 1] || 0));
    return acc;
  }, [] as number[]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Sequence from={cumulativeFrames[0]} durationInFrames={s1}>
        <Scene1 duration={s1} />
      </Sequence>
      <Sequence from={cumulativeFrames[1]} durationInFrames={sA}>
        <SlideA_FeatureHighlights duration={sA} />
      </Sequence>
      <Sequence from={cumulativeFrames[2]} durationInFrames={s2}>
        <Scene2 duration={s2} />
      </Sequence>
      <Sequence from={cumulativeFrames[3]} durationInFrames={s3}>
        <Scene3 duration={s3} />
      </Sequence>
      <Sequence from={cumulativeFrames[4]} durationInFrames={sB}>
        <SlideB_SocialProof duration={sB} />
      </Sequence>
      <Sequence from={cumulativeFrames[5]} durationInFrames={sC}>
        <SlideC_Pricing duration={sC} />
      </Sequence>
      <Sequence from={cumulativeFrames[6]} durationInFrames={s4}>
        <Scene4 duration={s4} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Scene 1 — Browse landing: "Tired of managing bookings manually?"
const Scene1 = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/scene-01-hook.mp3")} />
      <AbsoluteFill>
        <KenBurnsShot
          src={staticFile("screenshots/browse-landing.png")}
          frame={frame}
          duration={duration}
          zoomFrom={1.0}
          zoomTo={1.08}
          originX="60%"
          originY="40%"
        />
        <DarkOverlay intensity={0.5} />
        <BrandLogo />
        <SceneTitle
          frame={frame}
          title="Tired of managing bookings manually?"
          subtitle="Meet PikAppoint — the scheduling platform for modern service providers."
        />
      </AbsoluteFill>
    </>
  );
};

// Scene 2 — Dashboard + upgrade: "PikAppoint gives your business professional scheduling"
const Scene2 = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const halfDuration = Math.floor(duration / 2);

  // Cross-fade between dashboard and premium-upgrade at the halfway point
  const crossFadeOpacity = interpolate(
    frame,
    [halfDuration - 15, halfDuration + 15],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.ease }
  );

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/scene-02-solution.mp3")} />
      <AbsoluteFill>
        {/* First half: Dashboard */}
        <KenBurnsShot
          src={staticFile("screenshots/dashboard.png")}
          frame={frame}
          duration={duration}
          zoomFrom={1.0}
          zoomTo={1.06}
          originX="50%"
          originY="30%"
        />
        {/* Second half: Premium upgrade (cross-fade in) */}
        <div style={{ position: "absolute", inset: 0, opacity: crossFadeOpacity }}>
          <KenBurnsShot
            src={staticFile("screenshots/premium-upgrade.png")}
            frame={Math.max(0, frame - halfDuration)}
            duration={halfDuration}
            zoomFrom={1.0}
            zoomTo={1.06}
            originX="50%"
            originY="50%"
          />
        </div>
        <DarkOverlay intensity={0.45} />
        <BrandLogo />
        <SceneTitle
          frame={frame}
          title="PikAppoint gives your business professional scheduling"
          subtitle="A complete platform to manage appointments, visibility, and growth."
        />
      </AbsoluteFill>
    </>
  );
};

// Scene 3 — Premium active: "Premium members get priority visibility, crown badges, and analytics"
const Scene3 = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/scene-03-benefits.mp3")} />
      <AbsoluteFill>
        <KenBurnsShot
          src={staticFile("screenshots/premium-active.png")}
          frame={frame}
          duration={duration}
          zoomFrom={1.0}
          zoomTo={1.09}
          originX="40%"
          originY="60%"
        />
        <DarkOverlay intensity={0.5} />
        <BrandLogo />
        <SceneTitle
          frame={frame}
          title="Premium members get priority visibility, crown badges & analytics"
          subtitle="Stand out from the crowd. Be the first provider clients see."
        />
      </AbsoluteFill>
    </>
  );
};

// Scene 4 — Calendar / CTA: "Join PikAppoint Premium today"
const Scene4 = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [1, 1.04]
  );

  const ctaOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/scene-04-cta.mp3")} />
      <AbsoluteFill>
        <KenBurnsShot
          src={staticFile("screenshots/calendar.png")}
          frame={frame}
          duration={duration}
          zoomFrom={1.0}
          zoomTo={1.07}
          originX="70%"
          originY="40%"
        />
        <DarkOverlay intensity={0.6} />
        <BrandLogo />

        {/* CTA card centred */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ctaOpacity,
          }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.88)",
              backdropFilter: "blur(16px)",
              border: "1.5px solid rgba(245,158,11,0.3)",
              borderRadius: 24,
              padding: "56px 72px",
              textAlign: "center",
              maxWidth: 700,
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(245,158,11,0.08)",
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 16 }}>👑</div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: "#fff",
                marginBottom: 12,
                letterSpacing: "-0.5px",
              }}
            >
              Join PikAppoint Premium
            </div>
            <div style={{ fontSize: 22, color: "#94a3b8", marginBottom: 40 }}>
              today
            </div>
            <div
              style={{
                transform: `scale(${pulse})`,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#fff",
                fontSize: 26,
                fontWeight: 700,
                padding: "20px 52px",
                borderRadius: 50,
                display: "inline-block",
                boxShadow: "0 12px 32px rgba(245,158,11,0.45)",
                letterSpacing: "0.2px",
              }}
            >
              Upgrade Now — $9.99/mo →
            </div>
            <div style={{ fontSize: 18, color: "#64748b", marginTop: 20 }}>
              14-day free trial · Cancel anytime
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// --- PowerPoint-style Slide Components (per Bishop's design spec) ---

// Shared feature card for SlideA
const FeatureCard = ({
  frame,
  emoji,
  title,
  desc,
  delay,
}: {
  frame: number;
  emoji: string;
  title: string;
  desc: string;
  delay: number;
}) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const y = interpolate(frame, [delay, delay + 20], [40, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = interpolate(frame, [delay, delay + 20], [0.9, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        width: 340,
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: "48px 32px",
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 20 }}>{emoji}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  );
};

// SlideA — Feature Highlights (120 frames / 4s)
const SlideA_FeatureHighlights = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  const headlineOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [0, 25], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const cards = [
    { emoji: "📅", title: "Smart Scheduling", desc: "Clients book 24/7, you stay in control", delay: 30 },
    { emoji: "👑", title: "Premium Visibility", desc: "Get crowned badges and priority search placement", delay: 45 },
    { emoji: "📊", title: "Real-Time Analytics", desc: "Track bookings, revenue, and client growth", delay: 60 },
  ];

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-a-features.mp3")} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <BrandLogo />

        {/* Headline */}
        <div
          style={{
            position: "absolute",
            top: 140,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.5px",
            }}
          >
            Everything you need to run your service business
          </div>
        </div>

        {/* Feature Cards */}
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 40,
            padding: "0 80px",
            zIndex: 10,
          }}
        >
          {cards.map((card, i) => (
            <FeatureCard key={i} frame={frame} {...card} />
          ))}
        </div>
      </AbsoluteFill>
    </>
  );
};

// Stat counter with count-up animation for SlideB
const StatCounter = ({
  frame,
  value,
  suffix,
  label,
  delay,
}: {
  frame: number;
  value: number;
  suffix: string;
  label: string;
  delay: number;
}) => {
  const countUpEnd = delay + 40;
  const displayValue = interpolate(frame, [delay, countUpEnd], [0, value], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const scale = interpolate(frame, [delay, delay + 15], [0.85, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const formatted =
    value >= 1000
      ? Math.round(displayValue).toLocaleString()
      : value % 1 !== 0
        ? displayValue.toFixed(1)
        : Math.round(displayValue).toString();

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "56px 64px",
        textAlign: "center",
        opacity,
        transform: `scale(${scale})`,
        boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-1px",
          marginBottom: 8,
        }}
      >
        {formatted}
        <span style={{ color: "#f59e0b" }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 22, color: "#94a3b8", fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

// SlideB — Social Proof / Stats (150 frames / 5s)
const SlideB_SocialProof = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  const stats = [
    { value: 500, suffix: "+", label: "Service Providers", delay: 15 },
    { value: 10000, suffix: "+", label: "Bookings Managed", delay: 35 },
    { value: 4.9, suffix: "★", label: "Average Rating", delay: 55 },
  ];

  const subOpacity = interpolate(frame, [85, 105], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subY = interpolate(frame, [85, 105], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-b-stats.mp3")} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <BrandLogo />

        {/* Stats row */}
        <div
          style={{
            position: "absolute",
            top: 280,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 80,
            zIndex: 10,
          }}
        >
          {stats.map((stat, i) => (
            <StatCounter key={i} frame={frame} {...stat} />
          ))}
        </div>

        {/* Sub-headline */}
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 600, color: "#94a3b8" }}>
            Join the fastest-growing scheduling community
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// Pricing card for SlideC
const PricingCard = ({
  frame,
  delay,
  tier,
  price,
  period = "",
  features,
  isPremium,
  badge,
}: {
  frame: number;
  delay: number;
  tier: string;
  price: string;
  period?: string;
  features: string[];
  isPremium: boolean;
  badge?: string;
}) => {
  const opacity = interpolate(frame, [delay, delay + 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const y = interpolate(frame, [delay, delay + 25], [60, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const scale = interpolate(frame, [delay, delay + 25], [0.92, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const { fps } = useVideoConfig();
  const glowIntensity = isPremium
    ? interpolate(Math.sin((frame / fps) * Math.PI * 1.5), [-1, 1], [0.15, 0.35])
    : 0;

  return (
    <div
      style={{
        position: "relative",
        width: isPremium ? 400 : 340,
        background: isPremium ? "rgba(15,23,42,0.92)" : "rgba(15,23,42,0.75)",
        backdropFilter: "blur(16px)",
        border: isPremium
          ? "2px solid rgba(245,158,11,0.5)"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 28,
        padding: isPremium ? "48px 40px" : "40px 32px",
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        boxShadow: isPremium
          ? `0 32px 80px rgba(0,0,0,0.6), 0 0 80px rgba(245,158,11,${glowIntensity})`
          : "0 24px 48px rgba(0,0,0,0.4)",
      }}
    >
      {badge && (
        <div
          style={{
            position: "absolute",
            top: -16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            padding: "8px 20px",
            borderRadius: 20,
            boxShadow: "0 8px 24px rgba(245,158,11,0.4)",
            letterSpacing: "0.5px",
          }}
        >
          {badge}
        </div>
      )}

      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: isPremium ? "#f59e0b" : "#64748b",
          letterSpacing: "2px",
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        {tier}
      </div>

      <div
        style={{
          fontSize: isPremium ? 56 : 48,
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {price}
        {period && (
          <span style={{ fontSize: 22, fontWeight: 400, color: "#94a3b8" }}>
            {period}
          </span>
        )}
      </div>

      <div
        style={{
          height: 1,
          background: isPremium
            ? "rgba(245,158,11,0.3)"
            : "rgba(255,255,255,0.1)",
          margin: "24px 0",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              fontSize: 18,
              color: isPremium ? "#fff" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ color: isPremium ? "#f59e0b" : "#64748b" }}>✓</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
};

// SlideC — Pricing (150 frames / 5s)
const SlideC_Pricing = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-c-pricing.mp3")} />
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <BrandLogo />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            zIndex: 10,
          }}
        >
          <PricingCard
            frame={frame}
            delay={20}
            tier="FREE"
            price="$0"
            features={[
              "Basic scheduling",
              "1 service listing",
              "5 bookings/month",
            ]}
            isPremium={false}
          />
          <PricingCard
            frame={frame}
            delay={40}
            tier="PREMIUM"
            price="$9.99"
            period="/mo"
            features={[
              "Unlimited services",
              "Unlimited bookings",
              "👑 Crown badge",
              "Priority search visibility",
              "Full analytics dashboard",
            ]}
            isPremium={true}
            badge="Most Popular"
          />
        </div>
      </AbsoluteFill>
    </>
  );
};
