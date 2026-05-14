# Remotion Template Usage Guide

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

## Overview

How to create and use Remotion video templates for Lemon Squeezy promotional content.

---

## Prerequisites

1. **Install Remotion:**
   ```bash
   npm install remotion @remotion/media
   ```

2. **Project structure:**
   ```
   media/
   ├── templates/           # Your Remotion compositions (.tsx)
   ├── public/              # Assets accessible via staticFile()
   ├── audio/               # TTS-generated audio files
   └── videos/              # Rendered MP4 outputs
   ```

3. **Environment:**
   - Node.js 18+
   - TypeScript
   - React knowledge

---

## Creating a New Template

### Step 1: Define the Composition

Create `media/templates/lemon-squeezy-intro.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence, Audio, staticFile } from "remotion";
import { Easing } from "remotion";

export const LemonSqueezyIntro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade-in animation (0-2 seconds)
  const titleOpacity = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Subtitle fade-in (delayed 2 seconds)
  const subtitleOpacity = interpolate(frame, [2 * fps, 4 * fps], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* Background voiceover audio */}
      <Audio src={staticFile("audio/lemon-squeezy-intro-voiceover.mp3")} />

      {/* Title */}
      <Sequence from={0}>
        <div
          style={{
            opacity: titleOpacity,
            fontSize: 80,
            fontWeight: "bold",
            color: "#FFD700",
            textAlign: "center",
            marginTop: 200,
          }}
        >
          Lemon Squeezy
        </div>
      </Sequence>

      {/* Subtitle */}
      <Sequence from={2 * fps}>
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 40,
            color: "#ffffff",
            textAlign: "center",
            marginTop: 300,
          }}
        >
          Payments made simple
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
```

---

### Step 2: Register Composition in Root

Create or edit `media/Root.tsx`:

```tsx
import { Composition } from "remotion";
import { LemonSqueezyIntro } from "./templates/lemon-squeezy-intro";

export const RemotionRoot = () => {
  return (
    <Composition
      id="lemon-squeezy-intro"
      component={LemonSqueezyIntro}
      durationInFrames={450}  // 15 seconds at 30 fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

---

### Step 3: Preview in Remotion Studio

```bash
cd media
npx remotion studio
```

Navigate to `lemon-squeezy-intro` composition in the Studio UI. Adjust timing, colors, or animations live.

---

### Step 4: Render to MP4

```bash
npx remotion render lemon-squeezy-intro videos/lemon-squeezy-intro.mp4
```

**Options:**
- `--scale=0.5` — Render at half resolution (faster preview)
- `--concurrency=4` — Parallel rendering (faster on multi-core CPUs)
- `--codec=h264` — Default web-compatible codec

---

## Dynamic Duration with TTS Audio

If your video duration depends on voiceover length, use `calculateMetadata`:

```tsx
import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";

export const calculateMetadata: CalculateMetadataFunction<Props> = async () => {
  const audioDuration = await getAudioDuration(
    staticFile("audio/lemon-squeezy-intro-voiceover.mp3")
  );

  const fps = 30;
  const durationInFrames = Math.ceil(audioDuration * fps);

  return { durationInFrames };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="lemon-squeezy-intro"
      component={LemonSqueezyIntro}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

**How it works:**
1. Script generates TTS audio → `media/public/audio/intro.mp3`
2. `calculateMetadata` measures audio duration
3. Composition length auto-adjusts to match voiceover

---

## Common Patterns

### Pattern 1: Fade In/Out
```tsx
const opacity = interpolate(frame, [0, 30, totalFrames - 30, totalFrames], [0, 1, 1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

### Pattern 2: Slide In from Left
```tsx
const x = interpolate(frame, [0, 60], [-1920, 0], {
  extrapolateRight: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1),
});
return <div style={{ transform: `translateX(${x}px)` }}>Slide in</div>;
```

### Pattern 3: Scale Bounce
```tsx
const scale = interpolate(frame, [0, 30, 60], [0, 1.2, 1], {
  extrapolateRight: "clamp",
  easing: Easing.elastic(1),
});
return <div style={{ transform: `scale(${scale})` }}>Bounce</div>;
```

### Pattern 4: Sequential Scenes
```tsx
<AbsoluteFill>
  <Sequence from={0} durationInFrames={120}>
    <Scene1 />
  </Sequence>
  <Sequence from={120} durationInFrames={120}>
    <Scene2 />
  </Sequence>
  <Sequence from={240} durationInFrames={120}>
    <Scene3 />
  </Sequence>
</AbsoluteFill>
```

---

## Assets Setup

1. **Copy assets to `public/`:**
   ```bash
   cp media/assets/logo.png media/public/logo.png
   ```

2. **Reference in template:**
   ```tsx
   import { Img, staticFile } from "remotion";
   <Img src={staticFile("logo.png")} style={{ width: 200 }} />
   ```

---

## Performance Tips

1. **Avoid CSS animations/transitions** — Use `interpolate()` instead
2. **Use `<Sequence>` for timing** — Don't rely on CSS delays
3. **Preload fonts** — Use `@remotion/google-fonts` or load in `<head>`
4. **Optimize images** — Use WebP or compressed PNG/JPEG
5. **Limit complexity** — Heavy effects (blur, shadows) slow rendering

---

## Debugging

**Problem: Blank output**
- Check `staticFile()` paths are correct
- Verify assets exist in `public/` folder
- Inspect console in Remotion Studio

**Problem: Audio out of sync**
- Ensure audio file is in MP3 format
- Check `calculateMetadata` returns correct duration
- Use `<Audio>` component, not `<audio>` tag

**Problem: Slow rendering**
- Lower `--concurrency` if CPU-bound
- Use `--scale=0.5` for preview renders
- Profile with `npx remotion benchmark`

---

## Next Steps

1. Create `media/templates/lemon-squeezy-intro.tsx` (scaffolded below)
2. Generate TTS audio with `scripts/generate-audio.ts`
3. Preview in Studio: `npx remotion studio`
4. Render: `npx remotion render lemon-squeezy-intro videos/output.mp4`
5. Upload to Lemon Squeezy product page

See also:
- **TTS-INTEGRATION.md** — Wire TTS audio into Remotion
- **TROUBLESHOOTING.md** — Common issues + fixes
