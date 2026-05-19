# Demo Video Scene Pattern — Remotion

**Purpose:** Reusable pattern for building product demo videos with screen recording simulation style.

## When to Use

- Product demos showing UI flows (e.g., onboarding, booking, checkout)
- Tutorial videos explaining app features
- Marketing videos showcasing user journeys
- Walkthrough videos for customer support

## Pattern Architecture

### 1. Scene Structure

Each scene = one logical step in the user journey. Scenes are self-contained, 20-40s each.

```typescript
// Example: Step1Opening.tsx
export const Step1Opening: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Define animation timing with named markers
  const navClickFrame = 60; // 2s - Navigate to tab
  const openDialogFrame = 120; // 4s - Open dialog
  const fillFormFrame = 180; // 6s - Fill form
  const saveFrame = 240; // 8s - Click save

  return (
    <>
      <ScreenFrame url="https://app.example.com/dashboard">
        {/* Scene content */}
      </ScreenFrame>
      <StepIndicator step={1} total={4} startFrame={0} />
      <Caption text="Step description" startFrame={0} endFrame={durationInFrames} />
    </>
  );
};
```

### 2. Shared Components

**ScreenFrame:** Browser window chrome (traffic lights, URL bar, content area)
**Caption:** Bottom-center overlay with fade in/out
**StepIndicator:** Top-right progress badge ("STEP 1 / 4")
**UIElements:** Button, Badge, Card, Input, Label (hand-coded, NO external deps)

### 3. Animation Timing Strategy

Use **named frame markers** for key interactions:

```typescript
const navClickFrame = 60; // 2s @ 30fps
const openDialogFrame = 120; // 4s
const fillFormFrame = 180; // 6s

const tabHighlight = interpolate(
  frame,
  [navClickFrame - 10, navClickFrame + 10],
  [0, 1],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

**Pattern:** `actionFrame ± delta` for before/after transitions.

### 4. Common Animations

**Tab/button highlight:**
```typescript
style={{
  background: highlight > 0.5 ? "#dbeafe" : "transparent",
  boxShadow: highlight > 0.5 ? "0 0 0 3px rgba(59, 130, 246, 0.3)" : "none",
}}
```

**Dialog fade in:**
```typescript
const dialogOpacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
  extrapolateLeft: "clamp", extrapolateRight: "clamp",
});
```

**Panel slide in:**
```typescript
const slideX = interpolate(frame, [startFrame, startFrame + 30], [400, 0], {
  easing: Easing.out(Easing.quad),
});
```

**Badge morph + pulse:**
```typescript
const morph = interpolate(frame, [changeFrame, changeFrame + 30], [0, 1], {
  easing: Easing.inOut(Easing.ease),
});
style={{ transform: `scale(${1 + morph * 0.1})` }}
```

**Form fill (typewriter):**
```typescript
const progress = interpolate(frame, [startFrame, startFrame + 60], [0, 1]);
<Input value={progress > 0.25 ? "Value 1" : ""} />
<Input value={progress > 0.5 ? "Value 2" : ""} />
```

### 5. Main Composition

```typescript
export const DemoVideo: React.FC<DemoVideoProps> = ({ sceneDurations }) => {
  let offset = 0;
  const step1Start = offset;
  offset += sceneDurations[0];
  const step2Start = offset;
  // ...

  return (
    <AbsoluteFill>
      <Sequence from={step1Start} durationInFrames={sceneDurations[0]}>
        <Step1Opening durationInFrames={sceneDurations[0]} />
        <Audio src={staticFile("audio/demo/step-01.mp3")} />
      </Sequence>
      {/* Repeat for all scenes */}
    </AbsoluteFill>
  );
};
```

### 6. Dynamic Duration with TTS

```typescript
const calculateMetadata: CalculateMetadataFunction<Props> = async () => {
  const durations = await Promise.all(
    audioFiles.map((file) => getAudioDuration(staticFile(file)))
  );
  const sceneDurations = durations.map((sec) => Math.ceil(sec * FPS));
  const totalFrames = sceneDurations.reduce((sum, d) => sum + d, 0);

  return { durationInFrames: totalFrames, props: { sceneDurations } };
};
```

**Fallback:** Default to 30s per scene (900 frames @ 30fps) if audio missing.

## File Structure

```
media/demo/
├── README.md                  # Setup guide
├── NARRATION.md               # Narration script
├── generate-audio.mjs         # TTS generation
├── render-demo.mjs            # Programmatic render
├── src/
│   ├── DemoVideo.tsx         # Main composition
│   ├── scenes/*.tsx          # Scene components
│   └── components/*.tsx      # Shared UI
```

## TTS Integration

- **Primary:** Google Cloud TTS (1M chars/month free, en-US-Neural2-J)
- **Best quality:** ElevenLabs (10k chars/month free, Rachel voice)
- **Fallback:** Silent 30s MP3 placeholders (FFmpeg) for preview

## Video Specs

- **Resolution:** 1280×720 (demos) or 1920×1080 (marketing)
- **FPS:** 30
- **Codec:** H.264 MP4
- **Duration:** 90-180s (3-6 scenes)
- **File size:** <10 MB target

## Gotchas

- **CSS animations don't work** → Use `useCurrentFrame()` + `interpolate()`
- **Audio out of sync** → Use `getAudioDuration()` to measure actual duration
- **Animations overshoot** → Add `extrapolateRight: "clamp"`

## Example: Full Scene Template

```typescript
import { useCurrentFrame, interpolate } from "remotion";
import { ScreenFrame, Caption, StepIndicator, Button, Card } from "../components";

export const StepTemplate: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const navFrame = 60;
  const actionFrame = 180;
  const resultFrame = 300;

  const navHighlight = interpolate(frame, [navFrame - 10, navFrame + 10], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const resultOpacity = interpolate(frame, [resultFrame, resultFrame + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <>
      <ScreenFrame url="https://app.example.com/page">
        <div style={{ padding: 24 }}>
          <Button
            style={{
              boxShadow: navHighlight > 0.5 ? "0 0 0 3px rgba(59, 130, 246, 0.3)" : "none",
            }}
          >
            Action Button
          </Button>

          {frame >= resultFrame && (
            <Card style={{ opacity: resultOpacity }}>Result content</Card>
          )}
        </div>
      </ScreenFrame>

      <StepIndicator step={1} total={4} startFrame={0} />
      <Caption text="Step description" startFrame={0} endFrame={durationInFrames} />
    </>
  );
};
```

## Proven Outputs

1. **PikAppoint Demo** (2026-05-XX): 120s, 4 scenes, 6.1 MB, 1280×720
2. **Premium Product Demo** (2026-05-14): 46s, 7 scenes, 11.37 MB, 1920×1080

---

**Confidence:** High — Production-proven pattern  
**Last Updated:** 2026-05-XX
