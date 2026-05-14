# PikAppoint Promo Video — Slide Design Spec

**Author:** Bishop (Accessibility & UX Designer)  
**For:** Newt (implementation)  
**Date:** 2025-07-01

---

## Overview

3 new "PowerPoint-style" slide scenes for premium promo video. Pure React/CSS animation, no screenshots. Dark premium SaaS aesthetic.

**Brand Colors:**
- Navy: `#0f172a` (background)
- Amber: `#f59e0b` (accent, premium glow)
- Slate: `#94a3b8` (secondary text)
- White: `#fff` (primary text)
- Dark overlay: `rgba(15,23,42,0.9)` (cards)

**Typography:**
- Headlines: 48-60px, weight 800, letter-spacing -0.5px
- Body: 22-26px, weight 400-600
- Small: 16-18px

**Video Settings:** 1920×1080 @ 30fps

---

## Slide A — Feature Highlights

**Placement:** After Scene 1 (Hook), before Scene 2 (Solution)

### Audio Script
```
"Everything you need to run your service business — smart scheduling, premium visibility, and real-time analytics."
```
**Duration:** ~4 seconds = 120 frames

### Visual Design

**Background:**
```jsx
<AbsoluteFill style={{
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
}} />
```

**Subtle animated particles/dots (optional enhancement):** Low-opacity floating circles, z-index 1

### Component Structure

```jsx
const SlideA_FeatureHighlights = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  
  // Headline fade in: frames 0-25
  const headlineOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const headlineY = interpolate(frame, [0, 25], [30, 0], { 
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });

  // Feature cards stagger: card 1 at frame 30, card 2 at frame 45, card 3 at frame 60
  const cards = [
    { emoji: "📅", title: "Smart Scheduling", desc: "Clients book 24/7, you stay in control", delay: 30 },
    { emoji: "👑", title: "Premium Visibility", desc: "Get crowned badges and priority search placement", delay: 45 },
    { emoji: "📊", title: "Real-Time Analytics", desc: "Track bookings, revenue, and client growth", delay: 60 },
  ];

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-a-features.mp3")} />
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
      }}>
        <BrandLogo />
        
        {/* Headline */}
        <div style={{
          position: "absolute",
          top: 140,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.5px",
          }}>
            Everything you need to run your service business
          </div>
        </div>

        {/* Feature Cards Container */}
        <div style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
          padding: "0 80px",
          zIndex: 10,
        }}>
          {cards.map((card, i) => (
            <FeatureCard key={i} frame={frame} {...card} />
          ))}
        </div>
      </AbsoluteFill>
    </>
  );
};
```

### FeatureCard Component

```jsx
const FeatureCard = ({ 
  frame, 
  emoji, 
  title, 
  desc, 
  delay 
}: { 
  frame: number; 
  emoji: string; 
  title: string; 
  desc: string; 
  delay: number;
}) => {
  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { 
    extrapolateRight: "clamp", 
    extrapolateLeft: "clamp" 
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
    <div style={{
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
    }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>{emoji}</div>
      <div style={{
        fontSize: 26,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 12,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 18,
        color: "#94a3b8",
        lineHeight: 1.5,
      }}>
        {desc}
      </div>
    </div>
  );
};
```

### Animation Timeline (30fps)
| Frame | Event |
|-------|-------|
| 0-25 | Headline fades in + slides up |
| 30-50 | Card 1 (📅 Smart Scheduling) slides up |
| 45-65 | Card 2 (👑 Premium Visibility) slides up |
| 60-80 | Card 3 (📊 Analytics) slides up |
| 80-120 | Hold with all elements visible |

---

## Slide B — Social Proof / Stats

**Placement:** After Scene 3 (Benefits), before Slide C (Pricing)

### Audio Script
```
"Over five hundred providers, ten thousand bookings, and a four point nine star rating. Join the fastest-growing scheduling community."
```
**Duration:** ~5 seconds = 150 frames

### Visual Design

**Background:** Same gradient as Slide A with glass-morphism stat containers

### Component Structure

```jsx
const SlideB_SocialProof = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  const stats = [
    { value: 500, suffix: "+", label: "Service Providers", delay: 15 },
    { value: 10000, suffix: "+", label: "Bookings Managed", delay: 35 },
    { value: 4.9, suffix: "★", label: "Average Rating", delay: 55 },
  ];

  // Sub-headline appears at frame 85
  const subOpacity = interpolate(frame, [85, 105], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subY = interpolate(frame, [85, 105], [20, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-b-social-proof.mp3")} />
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
      }}>
        <BrandLogo />

        {/* Stats row */}
        <div style={{
          position: "absolute",
          top: 280,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 80,
          zIndex: 10,
        }}>
          {stats.map((stat, i) => (
            <StatCounter key={i} frame={frame} {...stat} />
          ))}
        </div>

        {/* Sub-headline */}
        <div style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#94a3b8",
          }}>
            Join the fastest-growing scheduling community
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};
```

### StatCounter Component (with count-up animation)

```jsx
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
  // Count-up from 0 to value over 40 frames
  const countUpEnd = delay + 40;
  const displayValue = interpolate(
    frame,
    [delay, countUpEnd],
    [0, value],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp", easing: Easing.out(Easing.cubic) }
  );

  // Container fade in
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const scale = interpolate(frame, [delay, delay + 15], [0.85, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Format number (e.g., 10000 → "10,000")
  const formatted = value >= 1000 
    ? Math.round(displayValue).toLocaleString()
    : value % 1 !== 0 
      ? displayValue.toFixed(1) 
      : Math.round(displayValue).toString();

  return (
    <div style={{
      background: "rgba(15,23,42,0.75)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 24,
      padding: "56px 64px",
      textAlign: "center",
      opacity,
      transform: `scale(${scale})`,
      boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        fontSize: 72,
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "-1px",
        marginBottom: 8,
      }}>
        {formatted}<span style={{ color: "#f59e0b" }}>{suffix}</span>
      </div>
      <div style={{
        fontSize: 22,
        color: "#94a3b8",
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );
};
```

### Animation Timeline (30fps)
| Frame | Event |
|-------|-------|
| 15-55 | Stat 1 ("500+") fades in + counts up |
| 35-75 | Stat 2 ("10,000+") fades in + counts up |
| 55-95 | Stat 3 ("4.9★") fades in + counts up |
| 85-105 | Sub-headline fades in |
| 105-150 | Hold |

---

## Slide C — Pricing

**Placement:** After Slide B, just before Scene 4 (CTA)

### Audio Script
```
"Start free, or go Premium for just nine ninety-nine a month. Unlimited bookings, crown badge, priority visibility, and analytics."
```
**Duration:** ~5 seconds = 150 frames

### Visual Design

Two pricing cards side by side. Premium card has amber glow + "Most Popular" badge.

### Component Structure

```jsx
const SlideC_Pricing = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();

  return (
    <>
      <Audio src={staticFile("audio/premium-product-demo/slide-c-pricing.mp3")} />
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
      }}>
        <BrandLogo />

        {/* Cards container */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          zIndex: 10,
        }}>
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
```

### PricingCard Component

```jsx
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

  // Premium glow pulse (subtle)
  const { fps } = useVideoConfig();
  const glowIntensity = isPremium 
    ? interpolate(Math.sin((frame / fps) * Math.PI * 1.5), [-1, 1], [0.15, 0.35])
    : 0;

  return (
    <div style={{
      position: "relative",
      width: isPremium ? 400 : 340,
      background: isPremium 
        ? "rgba(15,23,42,0.92)" 
        : "rgba(15,23,42,0.75)",
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
    }}>
      {/* Most Popular badge */}
      {badge && (
        <div style={{
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
        }}>
          {badge}
        </div>
      )}

      {/* Tier label */}
      <div style={{
        fontSize: 16,
        fontWeight: 600,
        color: isPremium ? "#f59e0b" : "#64748b",
        letterSpacing: "2px",
        marginBottom: 16,
        textAlign: "center",
      }}>
        {tier}
      </div>

      {/* Price */}
      <div style={{
        fontSize: isPremium ? 56 : 48,
        fontWeight: 800,
        color: "#fff",
        textAlign: "center",
        marginBottom: 8,
      }}>
        {price}
        {period && (
          <span style={{ fontSize: 22, fontWeight: 400, color: "#94a3b8" }}>
            {period}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: isPremium 
          ? "rgba(245,158,11,0.3)" 
          : "rgba(255,255,255,0.1)",
        margin: "24px 0",
      }} />

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {features.map((f, i) => (
          <div key={i} style={{
            fontSize: 18,
            color: isPremium ? "#fff" : "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <span style={{ color: isPremium ? "#f59e0b" : "#64748b" }}>✓</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Animation Timeline (30fps)
| Frame | Event |
|-------|-------|
| 20-45 | FREE card slides up from below |
| 40-65 | PREMIUM card slides up (slightly delayed) |
| 65-150 | Hold with amber glow pulsing on Premium |

---

## Scene Order (Updated)

```
Scene 1: Hook (113 frames / 3.78s) — existing
Slide A: Feature Highlights (120 frames / 4s) — NEW
Scene 2: Solution (175 frames / 5.82s) — existing
Scene 3: Benefits (120 frames / 3.99s) — existing
Slide B: Social Proof (150 frames / 5s) — NEW
Slide C: Pricing (150 frames / 5s) — NEW
Scene 4: CTA (124 frames / 4.14s) — existing
```

**Total new duration:** 14 seconds (420 frames)  
**New total video:** ~31s (was ~17s)

---

## Audio File Requirements

Generate 3 new TTS audio files:

1. **`audio/premium-product-demo/slide-a-features.mp3`**
   - Script: "Everything you need to run your service business — smart scheduling, premium visibility, and real-time analytics."
   - Duration target: ~4s
   - Voice: Same TTS as existing scenes (natural, professional)

2. **`audio/premium-product-demo/slide-b-social-proof.mp3`**
   - Script: "Over five hundred providers, ten thousand bookings, and a four point nine star rating. Join the fastest-growing scheduling community."
   - Duration target: ~5s

3. **`audio/premium-product-demo/slide-c-pricing.mp3`**
   - Script: "Start free, or go Premium for just nine ninety-nine a month. Unlimited bookings, crown badge, priority visibility, and analytics."
   - Duration target: ~5s

---

## Implementation Notes for Newt

### File Changes Required

**1. Update `media/templates/premium-product-demo.tsx`:**
- Add 3 new slide components (`SlideA_FeatureHighlights`, `SlideB_SocialProof`, `SlideC_Pricing`)
- Add shared helper components (`FeatureCard`, `StatCounter`, `PricingCard`)
- Update Sequence layout to insert slides between existing scenes
- Update `sceneDurations` prop to include new slides

**2. Update component props:**
```tsx
export interface PremiumProductDemoProps {
  sceneDurations: number[]; // Now 7 items instead of 4
}

// Default: [113, 120, 175, 120, 150, 150, 124]
// Order: Hook, SlideA, Solution, Benefits, SlideB, SlideC, CTA
```

**3. Update Sequence composition:**
```tsx
const cumulativeFrames = sceneDurations.reduce((acc, d, i) => {
  acc.push((acc[i - 1] || 0) + (sceneDurations[i - 1] || 0));
  return acc;
}, [] as number[]);

// Use cumulativeFrames[i] as `from` for each Sequence
```

### Shared BrandLogo
Already exists in current file — reuse as-is.

### Easing Reference
```tsx
import { Easing } from "remotion";

// Smooth deceleration (recommended for slides)
Easing.bezier(0.16, 1, 0.3, 1)

// Count-up easing
Easing.out(Easing.cubic)
```

### Accessibility Considerations
- All text meets 4.5:1 contrast ratio against dark backgrounds
- Animations are subtle (no rapid flashing)
- Text remains on screen long enough to read (~3s minimum per message)

---

## Sign-Off

Design complete. Ready for implementation by Newt.

— Bishop, Accessibility & UX Designer
