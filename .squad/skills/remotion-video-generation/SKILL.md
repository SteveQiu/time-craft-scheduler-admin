---
name: "remotion-video-generation"
description: "Generate promotional videos using Remotion (React-based video framework) + free TTS integration"
domain: "video-generation, media-pipeline, tts"
confidence: "high"
source: "manual (scaffolded by Newt, based on Remotion official skills)"
tools:
  - name: "powershell"
    description: "Run Remotion CLI commands (studio, render), TTS generation scripts"
    when: "Generating audio, previewing videos, rendering MP4s"
  - name: "view"
    description: "Read Remotion compositions, TTS scripts, documentation"
    when: "Understanding existing templates, video scripts"
  - name: "edit"
    description: "Update Remotion compositions, video scripts, TTS integration code"
    when: "Modifying templates, adjusting timing, changing voiceover text"
  - name: "create"
    description: "Create new Remotion compositions, TTS scripts, documentation"
    when: "Building new video templates, writing scripts"
---

## Context

Use this skill when generating promotional, explainer, or tutorial videos for SaaS products (e.g., Lemon Squeezy). Remotion is a React-based video framework that renders frame-by-frame, allowing precise control over animations and timing. TTS (text-to-speech) integration enables automated voiceover generation using free APIs (ElevenLabs, Google Cloud TTS, Azure TTS).

**When to use:**
- Creating marketing videos (product intros, feature demos, CTAs)
- Generating tutorial/explainer content with voiceover
- Building reusable video templates (title slides, transitions, outro)
- Automating video production at scale (batch rendering multiple variants)

**When NOT to use:**
- Real-time video editing (use traditional tools like DaVinci Resolve, Premiere)
- Videos requiring human voiceover (Remotion is best for TTS-generated audio)
- Complex 3D animations (use Blender; Remotion supports Three.js but limited)

---

## Patterns

### Pattern 1: Frame-Based Animation (NO CSS Animations)

**Problem:** CSS animations/transitions don't work in Remotion (frame-by-frame rendering, not real-time).

**Solution:** Use `useCurrentFrame()` + `interpolate()` for all animations.

```tsx
import { useCurrentFrame, interpolate, Easing } from "remotion";

const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: "clamp",
  extrapolateLeft: "clamp",
  easing: Easing.bezier(0.16, 1, 0.3, 1), // Smooth ease-out
});

return <div style={{ opacity }}>Fade in</div>;
```

**Anti-Pattern:**
```tsx
// ❌ WRONG — CSS animations don't render
<div className="animate-fade-in">Text</div>
```

---

### Pattern 2: Dynamic Composition Duration (TTS Audio Length)

**Problem:** Video length must match voiceover duration (manual timing is error-prone).

**Solution:** Use `calculateMetadata` to measure audio files and auto-size composition.

```tsx
import { CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";

const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<Props> = async () => {
  const sceneFiles = [
    "audio/my-video/scene-01.mp3",
    "audio/my-video/scene-02.mp3",
  ];

  const durations = await Promise.all(
    sceneFiles.map((file) => getAudioDuration(staticFile(file)))
  );

  const sceneDurations = durations.map((durationInSeconds) => {
    return Math.ceil(durationInSeconds * FPS);
  });

  const totalFrames = sceneDurations.reduce((sum, d) => sum + d, 0);

  return {
    durationInFrames: totalFrames,
    props: { sceneDurations }, // Pass to composition
  };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="my-video"
      component={MyVideo}
      fps={FPS}
      width={1920}
      height={1080}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

**Usage in composition:**
```tsx
export const MyVideo = ({ sceneDurations }: { sceneDurations: number[] }) => {
  const [scene1Frames, scene2Frames] = sceneDurations;

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={scene1Frames}>
        <Audio src={staticFile("audio/my-video/scene-01.mp3")} />
        <Scene1 />
      </Sequence>
      <Sequence from={scene1Frames} durationInFrames={scene2Frames}>
        <Audio src={staticFile("audio/my-video/scene-02.mp3")} />
        <Scene2 />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**Why:** Ensures video length always matches voiceover (no manual adjustments needed).

---

### Pattern 3: TTS Integration with Caching

**Problem:** TTS API calls cost money/quota. Re-generating unchanged audio wastes resources.

**Solution:** Check if MP3 exists before calling API.

```typescript
import { existsSync, writeFileSync } from "fs";

async function generateAudio(text: string, outputPath: string, provider: TTSProvider) {
  // Check cache
  if (existsSync(outputPath)) {
    console.log(`✓ ${outputPath} (cached)`);
    return;
  }

  // Generate audio
  console.log(`Generating ${outputPath}...`);
  const audioBuffer = await provider.generate(text);
  writeFileSync(outputPath, audioBuffer);
  console.log(`✓ ${outputPath} (${audioBuffer.length} bytes)`);
}
```

**Cache invalidation (when script changes):**
```bash
rm -rf media/public/audio/{composition-id}/
```

---

### Pattern 4: Sequence Timing (Scenes/Transitions)

**Problem:** Multiple scenes need precise timing (e.g., intro → features → CTA).

**Solution:** Use `<Sequence>` with cumulative frame offsets.

```tsx
import { Sequence, AbsoluteFill } from "remotion";

const [scene1Frames, scene2Frames, scene3Frames] = sceneDurations;

return (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={scene1Frames}>
      <Scene1 />
    </Sequence>
    <Sequence from={scene1Frames} durationInFrames={scene2Frames}>
      <Scene2 />
    </Sequence>
    <Sequence from={scene1Frames + scene2Frames} durationInFrames={scene3Frames}>
      <Scene3 />
    </Sequence>
  </AbsoluteFill>
);
```

**Why:** Each scene starts exactly when the previous one ends (no gaps or overlaps).

---

### Pattern 5: Asset Loading (staticFile)

**Problem:** Assets must be accessible to Remotion at build/render time.

**Solution:** Place assets in `public/` folder, reference via `staticFile()`.

**Folder structure:**
```
media/
├── public/
│   ├── logo.png
│   ├── audio/
│   │   └── scene-01.mp3
```

**Usage:**
```tsx
import { Img, Audio, staticFile } from "remotion";

<Img src={staticFile("logo.png")} style={{ width: 200 }} />
<Audio src={staticFile("audio/scene-01.mp3")} />
```

**Programmatic Rendering:**
When using `@remotion/bundler` programmatically, specify the public directory:
```typescript
import { bundle } from "@remotion/bundler";

const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, "../Root.tsx"),
  publicDir: path.resolve(__dirname, "../public"), // Required!
});
```

**Anti-Pattern:**
```tsx
// ❌ WRONG — relative paths don't work
<img src="./public/logo.png" />
<audio src="../audio/scene-01.mp3" />
```

---

## Examples

### Example 1: Simple Fade-In Title

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const TitleScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 1 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        fontSize: 80,
        fontWeight: "bold",
        color: "#FFD700",
        textAlign: "center",
      }}
    >
      Welcome to Lemon Squeezy
    </div>
  );
};
```

### Example 2: TTS Generation Script (ElevenLabs)

```typescript
import { writeFileSync } from "fs";

async function generateElevenLabsAudio(text: string, outputPath: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(outputPath, audioBuffer);
}
```

### Example 3: Programmatic Rendering with Remotion

```typescript
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

const compositionId = "my-video";

// Bundle the composition
const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, "../Root.tsx"),
  publicDir: path.resolve(__dirname, "../public"), // Specify public folder
});

// Select composition
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
});

// Render to MP4
const outputLocation = path.resolve(__dirname, "../videos/output.mp4");
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation,
  onProgress: ({ progress }) => {
    console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
  },
});
```

### Example 4: Root.tsx with registerRoot()

```tsx
import { Composition, registerRoot } from "remotion";
import { MyVideo } from "./templates/my-video";

const FPS = 30;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="my-video"
        component={MyVideo}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={300}
      />
    </>
  );
};

// IMPORTANT: Must call registerRoot() for programmatic rendering
registerRoot(RemotionRoot);
```

### Example 5: Full Video Template with TTS

See `media/templates/lemon-squeezy-intro.tsx` for complete scaffolded example.

---

## Anti-Patterns

### ❌ Using CSS Animations

**Problem:** CSS transitions don't work in frame-by-frame rendering.

**Wrong:**
```tsx
<div className="transition-opacity duration-500 opacity-0 hover:opacity-100">
  Text
</div>
```

**Right:**
```tsx
const opacity = interpolate(frame, [0, 15], [0, 1]);
<div style={{ opacity }}>Text</div>
```

---

### ❌ Hardcoded Composition Duration

**Problem:** Video length doesn't match audio, causing cutoff or silence.

**Wrong:**
```tsx
<Composition
  id="my-video"
  component={MyVideo}
  durationInFrames={300} // Hardcoded 10 seconds
  fps={30}
/>
```

**Right:**
```tsx
<Composition
  id="my-video"
  component={MyVideo}
  fps={30}
  calculateMetadata={calculateMetadata} // Auto-sizes based on audio
/>
```

---

### ❌ Calling TTS API Every Render

**Problem:** Wastes API quota, slow, hits rate limits.

**Wrong:**
```typescript
// Called every time script runs
const audioBuffer = await provider.generate(text);
writeFileSync(outputPath, audioBuffer);
```

**Right:**
```typescript
// Check cache first
if (!existsSync(outputPath)) {
  const audioBuffer = await provider.generate(text);
  writeFileSync(outputPath, audioBuffer);
}
```

---

### ❌ Using HTML `<audio>` Tag

**Problem:** Doesn't sync with Remotion timeline.

**Wrong:**
```tsx
<audio src="audio.mp3" autoPlay />
```

**Right:**
```tsx
import { Audio, staticFile } from "remotion";
<Audio src={staticFile("audio.mp3")} />
```

---

### ❌ Missing registerRoot() Call

**Problem:** Programmatic rendering fails with bundler error.

**Wrong:**
```tsx
export const RemotionRoot = () => {
  return <Composition id="my-video" component={MyVideo} />;
};
// Missing registerRoot() call!
```

**Right:**
```tsx
import { registerRoot } from "remotion";

export const RemotionRoot = () => {
  return <Composition id="my-video" component={MyVideo} />;
};

registerRoot(RemotionRoot); // Required for bundler to find compositions
```

---

### ❌ Assets Not in Public Folder

**Problem:** 404 errors when loading audio/images during render.

**Wrong:**
```
media/
├── audio/
│   └── scene-01.mp3  ❌ Remotion can't access this
```

**Right:**
```
media/
├── public/
│   ├── audio/
│   │   └── scene-01.mp3  ✅ Accessible via staticFile("audio/scene-01.mp3")
```

---

## References

- **Remotion Official Skills:** https://github.com/remotion-dev/remotion/tree/main/packages/skills
- **Project Docs:** `media/docs/README.md` (folder structure)
- **TTS Comparison:** `media/docs/TTS-COMPARISON.md` (provider evaluation)
- **Template Usage:** `media/docs/TEMPLATE-USAGE.md` (Remotion patterns)
- **Troubleshooting:** `media/docs/TROUBLESHOOTING.md` (common issues)

---

## Quick Start Checklist

1. ✅ Install dependencies: `npm install remotion @remotion/media @remotion/media-utils`
2. ✅ Set up `.env` with TTS API keys (ElevenLabs, Google, or Azure)
3. ✅ Write video script in `media/scripts/video-scripts.json`
4. ✅ Generate audio: `node scripts/generate-audio.ts --composition=X --provider=elevenlabs`
5. ✅ Preview in Studio: `npx remotion studio`
6. ✅ Render to MP4: `npx remotion render X videos/output.mp4`
