---
name: "remotion-video-pipeline"
description: "End-to-end process for creating professional SaaS promotional videos using Remotion, Google Translate TTS, FFmpeg, Playwright, and Ken Burns effects on static screenshots"
domain: "media-production"
confidence: "high"
source: "earned — built and debugged end-to-end in production (premium-product-demo, 2026-05-14). Validated twice: 4-scene screenshot-only, then 7-scene hybrid (screenshots + PowerPoint-style slides)"
tools:
  - name: "remotion"
    description: "React-based video framework for composing and rendering MP4s"
    when: "Creating any programmatic video content"
  - name: "playwright"
    description: "Browser automation for screenshotting HTML mockups"
    when: "App requires auth or live screenshots are impractical"
  - name: "ffmpeg"
    description: "Audio speed adjustment (atempo filter)"
    when: "TTS audio needs pacing changes without pitch shift"
---

## Context

Use this skill when building a promotional or demo video for a SaaS product. The pipeline turns static screenshots + TTS voiceover into a polished Ken Burns–style video with scene titles, brand overlays, and dynamic duration synced to audio. Proven on Windows with Remotion 4.x, Node.js, and PowerShell.

**When this applies:**
- Creating product demo / explainer / promotional videos
- Need professional output without After Effects or manual editing
- Screenshots are the primary visual (not live screen recordings)
- App is behind auth, so real screenshots aren't easily captured

**What you get:**
- 1920×1080 H.264 MP4, 30fps
- Voiceover-synced scenes with Ken Burns zoom-pan
- Scene title cards with frosted-glass overlays
- Brand logo watermark
- ~1–10 MB output for 15–60s videos

---

## Patterns

### 1. File Structure (CRITICAL — placement matters)

```
{projectRoot}/
  remotion.config.ts              ← MUST be at project root (not media/)
  media/
    Root.tsx                      ← Remotion entry point (registerRoot)
    public/                       ← staticFile() serves from here
      audio/{project}/            ← MP3 files per scene
        scene-01-hook.mp3
        scene-02-solution.mp3
        ...
      screenshots/                ← PNG screenshots (1920×1080)
        browse-landing.png
        dashboard.png
        ...
    templates/
      {composition-id}.tsx        ← React composition component
    scripts/
      render-{project}.mjs        ← Programmatic render script
      mockup-pages.html           ← HTML mockups for screenshot capture
      screenshot-mockups.mjs      ← Playwright screenshot script
      generate-premium-audio.js   ← TTS + FFmpeg audio generation
    videos/
      {output}.mp4                ← Final rendered video
```

### 2. remotion.config.ts — MUST be at project root

Remotion looks for config at CWD. If it's inside `media/`, it's never found and `staticFile()` 404s for all assets.

```ts
// {projectRoot}/remotion.config.ts
import { Config } from "@remotion/cli/config";

Config.setPublicDir("media/public");
```

**Wrong:** `media/remotion.config.ts` — Remotion never finds it.

ESM syntax required for Remotion 4.x. Use relative string path (not `__dirname`-based) for cross-platform compatibility.

### 3. Root.tsx — Entry Point with Dynamic Duration

```tsx
import { Composition, CalculateMetadataFunction, staticFile, registerRoot } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";
import { MyVideo, MyVideoProps } from "./templates/my-composition";

const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<MyVideoProps> = async () => {
  const sceneFiles = [
    "audio/my-project/scene-01.mp3",
    "audio/my-project/scene-02.mp3",
    // ...
  ];

  const durations = await Promise.all(
    sceneFiles.map((file) => getAudioDuration(staticFile(file)))
  );

  const sceneDurations = durations.map((sec) => Math.ceil(sec * FPS));
  const totalFrames = sceneDurations.reduce((sum, d) => sum + d, 0);

  return {
    durationInFrames: totalFrames,
    props: { sceneDurations },
  };
};

export const RemotionRoot = () => (
  <Composition
    id="my-composition"
    component={MyVideo}
    fps={FPS}
    width={1920}
    height={1080}
    calculateMetadata={calculateMetadata}
    defaultProps={{ sceneDurations: [90, 150, 120, 100] }}
  />
);

registerRoot(RemotionRoot);
```

**Key:** `defaultProps` provides fallback durations when audio files aren't available yet. `calculateMetadata` overrides them at render time with actual MP3 lengths.

### 4. Composition Template — Ken Burns + Audio + Scene Titles

```tsx
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, Sequence, Audio, staticFile, Img,
} from "remotion";
import { Easing } from "remotion";

// Reusable Ken Burns layer
const KenBurnsShot = ({ src, frame, duration, zoomFrom = 1.0, zoomTo = 1.08,
  originX = "50%", originY = "50%" }) => {
  const scale = interpolate(frame, [0, duration], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: fadeIn }}>
      <Img src={src} style={{
        width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${scale})`, transformOrigin: `${originX} ${originY}`,
      }} />
    </div>
  );
};

// Scene title with frosted-glass card
const SceneTitle = ({ frame, title, subtitle, delayFrames = 15 }) => {
  const opacity = interpolate(frame, [delayFrames, delayFrames + 25], [0, 1], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const y = interpolate(frame, [delayFrames, delayFrames + 25], [24, 0], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div style={{
      position: "absolute", bottom: 72, left: 0, right: 0, zIndex: 10,
      padding: "0 80px", opacity, transform: `translateY(${y}px)`,
    }}>
      <div style={{
        display: "inline-block", background: "rgba(15,23,42,0.82)",
        backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "20px 36px", maxWidth: 900,
      }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 22, color: "#94a3b8", marginTop: 8 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

// Full scene component
const Scene = ({ duration, audioFile, screenshotFile, title, subtitle, originX, originY }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Audio src={staticFile(audioFile)} />
      <AbsoluteFill>
        <KenBurnsShot
          src={staticFile(screenshotFile)}
          frame={frame} duration={duration}
          originX={originX} originY={originY}
        />
        {/* Dark gradient for text legibility */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.08) 100%)",
        }} />
        <SceneTitle frame={frame} title={title} subtitle={subtitle} />
      </AbsoluteFill>
    </>
  );
};

// Main composition — chain scenes with Sequence
export const MyVideo = ({ sceneDurations = [90, 150, 120, 100] }) => {
  const [s1, s2, s3, s4] = sceneDurations;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Sequence from={0} durationInFrames={s1}>
        <Scene duration={s1} audioFile="audio/proj/scene-01.mp3"
          screenshotFile="screenshots/landing.png"
          title="Hook headline" subtitle="Supporting text" originX="60%" originY="40%" />
      </Sequence>
      <Sequence from={s1} durationInFrames={s2}>
        <Scene duration={s2} audioFile="audio/proj/scene-02.mp3"
          screenshotFile="screenshots/dashboard.png"
          title="Solution headline" originX="50%" originY="30%" />
      </Sequence>
      {/* ... more scenes */}
    </AbsoluteFill>
  );
};
```

**Animation rules:**
- ALL animations must use `interpolate()` + `useCurrentFrame()`. CSS transitions/animations do NOT work in frame-by-frame rendering.
- Always `extrapolateRight: "clamp"` to prevent overshoot.
- `Easing.bezier(0.16, 1, 0.3, 1)` for smooth, natural motion.
- `Easing.out(Easing.quad)` for Ken Burns zoom (decelerating).

### 5. TTS Audio Pipeline (Google Translate — No Auth)

```js
import https from 'https';
import fs from 'fs';

async function generateTTS(text, outputPath) {
  const encoded = encodeURIComponent(text);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`;

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(outputPath, Buffer.concat(chunks));
        resolve();
      });
    }).on('error', reject);
  });
}
```

**Speed adjustment with FFmpeg:**
```powershell
ffmpeg -i input.mp3 -filter:a "atempo=1.15" -y output.mp3
```
- `atempo=1.15` = 15% faster, pitch preserved
- Range: 0.5–2.0 per filter; chain for more extreme changes

**Important:**
- Rate limit: 1 second between requests to avoid being blocked
- Audio output goes to `media/public/audio/{project}/` (not `media/audio/`)
- Google Translate TTS is unofficial — may break. For production, use ElevenLabs or Google Cloud TTS.
- Max ~200 chars per request. Split longer text into multiple calls.

### 6. HTML Mockup Screenshots (When App Requires Auth)

When the app is behind authentication, create HTML mockups instead of live screenshots.

**mockup-pages.html pattern:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1920">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    section[data-page] {
      position: absolute; top: 0; left: 0;
      width: 1920px; height: 1080px;
      overflow: hidden; display: none;
    }
    /* ... app-matching styles (sidebar, cards, etc.) */
  </style>
</head>
<body>
  <section data-page="1"><!-- Page 1: Landing --></section>
  <section data-page="2"><!-- Page 2: Dashboard --></section>
  <section data-page="3"><!-- Page 3: Settings --></section>
</body>
</html>
```

**screenshot-mockups.mjs (Playwright):**
```js
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_FILE = join(__dirname, 'mockup-pages.html');
const OUT_DIR = join(__dirname, '..', 'public', 'screenshots');
mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  { id: 1, name: 'landing.png' },
  { id: 2, name: 'dashboard.png' },
  { id: 3, name: 'settings.png' },
];

const browser = await chromium.launch({ headless: true });
for (const p of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const fileUrl = 'file:///' + HTML_FILE.replace(/\\/g, '/') + '#' + p.id;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.evaluate((id) => {
    document.querySelectorAll('section[data-page]').forEach(s => {
      s.style.display = s.dataset.page == id ? 'block' : 'none';
    });
  }, p.id.toString());
  await page.waitForTimeout(800);
  const file = join(OUT_DIR, p.name);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  const size = statSync(file).size;
  console.log(`✓ ${p.name} (${Math.round(size / 1024)}KB)`);
  await page.close();
}
await browser.close();
```

**Quality check:** Real mockup screenshots should be 100–669 KB. If they're ~8 KB, the page rendered blank (fonts not loaded, wrong section visible).

**Design tips:**
- Match the app's real design system (colors from `src/index.css`, component patterns)
- Include sidebar, nav items, stat cards, badges, avatars — make it look like real product UI
- Use the same font the app uses (e.g., Inter from Google Fonts)
- Each section is exactly 1920×1080 to match video resolution

### 7. Programmatic Render Script

```js
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compositionId = "my-composition";

const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, "../Root.tsx"),
  publicDir: path.resolve(__dirname, "../public"),
  webpackOverride: (config) => config,
});

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
});

const outputLocation = path.resolve(__dirname, "../videos/output.mp4");

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: "h264",
  outputLocation,
  onProgress: ({ progress }) => {
    process.stdout.write(`\rProgress: ${(progress * 100).toFixed(1)}%`);
  },
});
```

**Why programmatic over CLI:** PowerShell execution policy can block `npx`/`npm` scripts on Windows. The programmatic approach (`node render-script.mjs`) always works.

---

## Commands

### Render video (CLI)
```powershell
node_modules\.bin\remotion.cmd render media/Root.tsx {compositionId} media/videos/{output}.mp4 --overwrite
```

### Render video (programmatic — preferred on Windows)
```powershell
node media/scripts/render-{project}.mjs
```

### Preview in Remotion Studio
```powershell
node_modules\.bin\remotion.cmd studio media/Root.tsx --port 3001
```

### Generate TTS audio
```powershell
node media/scripts/generate-premium-audio.js
```

### Capture mockup screenshots
```powershell
node media/scripts/screenshot-mockups.mjs
```

### Full pipeline (in order)
```powershell
# 1a. Generate TTS audio for screenshot scenes
node media/scripts/generate-premium-audio.js

# 1b. Generate TTS audio for slide scenes
node media/scripts/generate-slide-audio.mjs

# 2. Capture screenshots from HTML mockups
node media/scripts/screenshot-mockups.mjs

# 3. Preview in Studio (optional)
node_modules\.bin\remotion.cmd studio media/Root.tsx --port 3001

# 4. Render final video
node media/scripts/render-premium-demo.mjs
```

---

## Anti-Patterns

### ❌ Config file in wrong location
```
media/remotion.config.ts  ← Remotion NEVER finds this
```
`staticFile()` will 404 for all assets. Config MUST be at `{projectRoot}/remotion.config.ts`.

### ❌ Audio files outside public dir
```
media/audio/scene-01.mp3  ← staticFile() can't reach this
```
Must be in `media/public/audio/` (or wherever `Config.setPublicDir()` points).

### ❌ CSS animations in Remotion
```tsx
// WRONG — CSS transitions don't work in frame-by-frame rendering
<div style={{ transition: "opacity 0.5s", opacity: visible ? 1 : 0 }}>
```
Use `interpolate(frame, ...)` for ALL animations.

### ❌ Using bash-style binary path on Windows
```powershell
./node_modules/.bin/remotion render ...   # ← bash script, fails on Windows
npx remotion render ...                    # ← may fail due to execution policy
```
Use `node_modules\.bin\remotion.cmd` or programmatic rendering.

### ❌ Tiny screenshot files (~8 KB)
Means the mockup rendered blank. Check:
- Font loading (add `waitForTimeout(800)` after navigation)
- Section visibility toggling
- Viewport size matches section dimensions (1920×1080)

### ❌ Using `__dirname` in remotion.config.ts
```ts
Config.setPublicDir(path.resolve(__dirname, "media/public"));  // ← unnecessary complexity
```
Just use the relative string: `Config.setPublicDir("media/public")`.

### ❌ Hardcoded video duration
```tsx
<Composition durationInFrames={900} ... />  // ← will desync from audio
```
Use `calculateMetadata` + `getAudioDuration()` for dynamic duration.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `staticFile()` returns 404 | Config not at project root | Move `remotion.config.ts` to `{projectRoot}/` |
| Audio doesn't play in Studio | Files not in publicDir | Move to `media/public/audio/` |
| Blank video output | Screenshots 404 or wrong path | Verify files exist in `media/public/screenshots/` |
| CSS animation doesn't animate | CSS transitions incompatible | Replace with `interpolate()` + `useCurrentFrame()` |
| `remotion` command not found | Wrong binary path on Windows | Use `node_modules\.bin\remotion.cmd` |
| Zod version warning | Remotion 4.x wants zod 4.x | Safe to ignore; Studio works with zod 3.x |
| Multiple lockfile warning | bun.lock + package-lock.json | Safe to ignore; Remotion works fine |
| Video/audio desync | Hardcoded duration | Use `calculateMetadata` with `getAudioDuration()` |
| Render fails silently | Missing `registerRoot()` | Add `registerRoot(RemotionRoot)` at end of Root.tsx |
| Chrome download on first render | Normal — Remotion downloads headless Chrome | Wait ~1 min, subsequent renders are instant |
| Screenshots are 8 KB | Blank page captured | Add `waitForTimeout(800)`, check section visibility |

---

## Performance Notes

- **Render time:** ~3 min for 530 frames (17.8s video) on a standard machine
- **Output size:** ~1.6 MB for 17.8s H.264 (clean, no heavy effects)
- **Preview:** Use `--scale=0.5` for half-resolution quick previews
- **Parallelism:** `--concurrency=N` for multi-core rendering
- **First render:** Downloads Chrome Headless Shell (~150 MB, cached after)

---

## Dependencies

```json
{
  "remotion": "4.0.x",
  "@remotion/cli": "4.0.x",
  "@remotion/bundler": "4.0.x",
  "@remotion/renderer": "4.0.x",
  "@remotion/media-utils": "4.0.x",
  "playwright": "^1.x"
}
```

Optional: `ffmpeg` (system binary) for audio speed adjustment.

---

## Proven Output

- **Project:** PikAppoint Premium Product Demo
- **Duration:** 17.80s (534 frames @ 30fps)
- **Resolution:** 1920×1080
- **Codec:** H.264 MP4
- **File size:** 1.60 MB
- **Scenes:** 4 (Hook → Solution → Benefits → CTA)
- **Audio:** Google Translate TTS, 4 MP3 files
- **Screenshots:** 5 HTML mockup captures via Playwright

### 7-Scene Hybrid (v2)
- **Project:** PikAppoint Premium Product Demo (expanded)
- **Duration:** 46.07s (1382 frames @ 30fps)
- **Resolution:** 1920×1080
- **Codec:** H.264 MP4
- **File size:** 11.37 MB
- **Scenes:** 7 (Hook → Feature Highlights → Solution → Benefits → Social Proof → Pricing → CTA)
- **Audio:** Google Translate TTS, 7 MP3 files (4 screenshot + 3 slide scenes)
- **Screenshots:** 5 HTML mockup captures via Playwright
- **Slides:** 3 PowerPoint-style pure React/CSS animated scenes (no external assets)

---

## PowerPoint-Style Slide Scenes

### When to Use Slides vs Screenshots

| Content Type | Use | Why |
|---|---|---|
| Product UI, app walkthrough | Screenshot scene (Ken Burns) | Shows real product, builds trust |
| Features list, value props | Slide scene | "Official" feel, no app UI needed |
| Stats, social proof | Slide scene | Clean data presentation |
| Pricing comparison | Slide scene | Side-by-side cards, premium glow effects |
| CTA, call to action | Screenshot scene | Ends on product, drives action |

### Slide Scene Structure

Slides are pure React components — no screenshots, no external image assets. Each slide needs:

1. **Dark gradient background:** `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)`
2. **Animated content:** Cards, stats, or pricing — all animated with `interpolate()` + `useCurrentFrame()`
3. **Audio:** Each slide still needs its own TTS MP3 file
4. **Brand logo:** Reuse shared `BrandLogo` component (top-right watermark)

```tsx
const SlideScene = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Audio src={staticFile("audio/project/slide-name.mp3")} />
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
      }}>
        <BrandLogo />
        {/* Animated content here — use interpolate() for all motion */}
      </AbsoluteFill>
    </>
  );
};
```

---

## Multi-Scene Composition Architecture (7-Scene Pattern)

The proven scene order for a SaaS promotional video:

```
1. Hook (screenshot)        — Grab attention, show the problem/market
2. Feature Highlights (slide) — What the product does (3 feature cards)
3. Solution (screenshot)     — Show the product solving the problem
4. Benefits (screenshot)     — Show premium/advanced features in action
5. Social Proof (slide)      — Stats, ratings, trust signals
6. Pricing (slide)           — Clear upgrade path (Free vs Premium)
7. CTA (screenshot)          — Call to action, end on the product
```

**Why this order works:**
- Opens and closes on product UI (screenshot scenes) — bookends with real product
- Middle slides provide "official" content that doesn't need UI mockups
- Alternating screenshot/slide/screenshot keeps visual variety

**Sequence wiring pattern:**
```tsx
export const MyVideo = ({ sceneDurations }: Props) => {
  const [s1, s2, s3, s4, s5, s6, s7] = sceneDurations;
  const starts = [0, s1, s1+s2, s1+s2+s3, s1+s2+s3+s4, s1+s2+s3+s4+s5, s1+s2+s3+s4+s5+s6];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Sequence from={starts[0]} durationInFrames={s1}>
        <ScreenshotScene ... />   {/* Hook */}
      </Sequence>
      <Sequence from={starts[1]} durationInFrames={s2}>
        <SlideScene_Features ... />  {/* Slide A */}
      </Sequence>
      {/* ... remaining 5 scenes */}
    </AbsoluteFill>
  );
};
```

**Root.tsx update:** `calculateMetadata` must list all 7 audio files and return 7-element `sceneDurations` array.

---

## Slide Component Patterns (Proven)

### Feature Highlights Slide

Glass-morphism cards with staggered reveal:

- **Background:** `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)`
- **Headline:** Frames 0–25, fade-in + slide-up from y=30
- **Cards stagger:** Card 1 at frame 30, Card 2 at frame 45, Card 3 at frame 60 (15-frame gaps)
- **Card style:** `rgba(15,23,42,0.85)` bg, `backdrop-filter: blur(12px)`, rounded 20px, shadow
- **Card animation:** opacity 0→1, translateY 40→0, scale 0.9→1, over 20 frames per card
- **Content per card:** emoji icon (56px) + title (26px bold) + subtitle (18px slate)

**Alternate variant (amber border):**
- Left border: `4px solid #f59e0b` instead of centered card layout
- Icon + title on one line, subtitle below

### Social Proof / Stats Slide

Count-up animated stat counters:

- **Stats stagger:** Stat 1 at frame 15, Stat 2 at frame 35, Stat 3 at frame 55
- **Count-up:** `interpolate(frame, [delay, delay+40], [0, value])` with `Easing.out(Easing.cubic)`
- **Number formatting:** `toLocaleString()` for thousands separators, `.toFixed(1)` for decimals
- **Stat display:** Large number (72px, white) + suffix in amber (`#f59e0b`), label below (22px, slate)
- **Container:** Glass-morphism card, `blur(16px)`, rounded 24px, deep shadow
- **Sub-headline:** Appears at ~frame 85, fade-in + slide-up

### Pricing Slide

Side-by-side plan comparison:

- **Two cards:** FREE (340px wide) vs PREMIUM (400px wide, slightly larger)
- **Card animation:** Slide up from y=60, 25-frame duration, FREE at frame 20, PREMIUM at frame 40
- **FREE card:** Neutral border `rgba(255,255,255,0.1)`, muted text
- **PREMIUM card:**
  - Amber border: `2px solid rgba(245,158,11,0.5)`
  - Amber glow pulse: `box-shadow: 0 0 80px rgba(245,158,11,${glowIntensity})`
  - Glow oscillates via `Math.sin((frame / fps) * Math.PI * 1.5)` mapped to [0.15, 0.35]
  - "Most Popular" badge: amber gradient pill, positioned `top: -16px`, centered
- **Features list:** Checkmarks (✓) in amber for premium, slate for free
- **Price display:** Large centered price, period suffix in smaller slate text

---

## Audio Duration Planning

### Google Translate TTS Duration Reality

Google Translate TTS (without FFmpeg `atempo` speed-up) produces audio **significantly longer** than naive estimates:

| Estimated Duration | Actual TTS Duration | Ratio |
|---|---|---|
| 4s (slide script) | 8.2s (245 frames) | ~2.0x |
| 5s (slide script) | 9.6s (289 frames) | ~1.9x |
| 5s (slide script) | 10.5s (314 frames) | ~2.1x |

**Planning guidance:**
- Plan for **8–10 seconds per slide scene**, not 3–5s
- If FFmpeg `atempo` is unavailable, accept longer scenes or write shorter TTS scripts
- Scene animations should fill the full duration — add generous "hold" time at the end
- `calculateMetadata` handles this automatically, but default props should reflect realistic durations

**If you need shorter scenes:**
```powershell
ffmpeg -i slide-raw.mp3 -filter:a "atempo=1.3" -y slide-final.mp3
```
This brings a 10s clip down to ~7.7s without pitch shift.

---

## Bishop ↔ Newt Collaboration Pattern

For videos with PowerPoint-style slides, use this handoff:

1. **Bishop writes slide design spec** → `.squad/agents/bishop/slide-design-spec.md`
   - TTS scripts (exact wording for audio generation)
   - JSX component structure with exact props
   - Frame timing tables (which element appears when)
   - Color values, font sizes, spacing
   - Animation easing and duration per element

2. **Newt implements directly from spec**
   - No design guesswork — spec is implementation-ready
   - Generate TTS audio from provided scripts
   - Copy JSX patterns, adjust frame timings to match actual audio duration
   - Render and verify

**Why this works:** Bishop's spec is essentially pseudocode. Newt translates it to working Remotion with minimal iteration. This saved significant back-and-forth vs. Newt designing slides from scratch.

**Spec file convention:** `.squad/agents/bishop/slide-design-spec.md` (one spec per video project, covers all slides)

---

## Asset Management & gitignore Policy

### What is committed vs what is gitignored

| Category | Path | Committed? | Reason |
|---|---|---|---|
| TTS generation scripts | `media/scripts/generate-premium-audio.js` | ✅ Yes | Source of truth, small |
| Slide audio script | `media/scripts/generate-slide-audio.mjs` | ✅ Yes | Source of truth, small |
| Screenshot script | `media/scripts/screenshot-mockups.mjs` | ✅ Yes | Source of truth, small |
| Render script | `media/scripts/render-premium-demo.mjs` | ✅ Yes | Source of truth, small |
| HTML mockups | `media/scripts/mockup-pages.html` | ✅ Yes | Source of truth, small |
| Remotion compositions | `media/templates/*.tsx` | ✅ Yes | Source of truth |
| Remotion config/root | `media/Root.tsx`, `remotion.config.ts` | ✅ Yes | Source of truth |
| Generated TTS audio | `media/public/audio/**/*.mp3` | ❌ No | Large, regeneratable from scripts |
| Rendered videos | `media/videos/*.mp4`, `*.webm` | ❌ No | Large, regeneratable |
| Captured screenshots | `media/public/screenshots/*.png` | ❌ No | Regeneratable via Playwright |
| Audio cache | `media/audio/cache/` | ❌ No | Ephemeral build artifact |

### Why this policy

Generated files (MP3s, MP4s, PNGs) are **large and deterministically regeneratable** from the committed source scripts. Committing them would bloat the repo with binary files that change on every re-render. The source scripts are small text files that capture all the logic needed to reproduce outputs at identical quality.

### gitignore rules (in project `.gitignore`)

```
media/audio/*.mp3
media/audio/**/*.mp3
media/audio/cache/
media/public/audio/
media/videos/*.mp4
media/videos/*.webm
```

> **Note:** `media/public/screenshots/` is also not committed — Playwright regenerates these from `mockup-pages.html`. The screenshots are ~100–669KB each and change whenever the HTML mockups are updated.

---

## Full Quality Reproduction Checklist

Complete step-by-step to go from a fresh clone to the proven 7-scene, 46s video output.

### Steps

**1. Install dependencies**
```powershell
npm install
npx playwright install chromium
```

**2. Generate screenshot-scene TTS audio (scenes 1–4)**
```powershell
node media/scripts/generate-premium-audio.js
```
Produces 4 MP3 files in `media/public/audio/premium-product-demo/`.

**3. Generate slide-scene TTS audio (slide-a, slide-b, slide-c)**
```powershell
node media/scripts/generate-slide-audio.mjs
```
Produces 3 MP3 files in `media/public/audio/premium-product-demo/`.

**4. Capture HTML mockup screenshots**
```powershell
node media/scripts/screenshot-mockups.mjs
```
Produces PNG screenshots in `media/public/screenshots/`.

**5. Verify asset counts**
- **7 MP3 files** in `media/public/audio/premium-product-demo/` (4 screenshot scenes + 3 slide scenes)
- **PNG screenshots** in `media/public/screenshots/` (one per mockup page)

**6. (Optional) Preview in Remotion Studio**
```powershell
node_modules\.bin\remotion.cmd studio media/Root.tsx --port 3001
```
Opens browser preview at `http://localhost:3001`. Verify all scenes render, audio plays, timing looks correct.

**7. Render final video**
```powershell
node media/scripts/render-premium-demo.mjs
```
Renders H.264 MP4 to `media/videos/premium-product-demo.mp4`. Takes ~3 minutes.

**8. Verify output**
- File size should be **8–12 MB** for the 7-scene, ~46s video
- Play in VLC or browser to confirm video and audio are present and synced

### Quality Verification

| Asset | Check | Healthy | Failed |
|---|---|---|---|
| MP3 files | File size | > 30 KB each | ~1 KB = TTS fetch failed |
| PNG screenshots | File size | 100–669 KB each | ~8 KB = Playwright captured blank page |
| MP4 video | File size | 8–12 MB for 46s video | < 1 MB = render failed or truncated |
| MP4 video | Playback | Plays in VLC/browser, audio synced | Black frames, no audio, or won't open |

### Troubleshooting

- **TTS fetch fails (MP3 ~1 KB):** Google Translate rate-limits aggressive requests. Wait 30 seconds and retry. The scripts include inter-request delays but bursts can still trigger limits.
- **Screenshots blank (PNG ~8 KB):** Playwright couldn't render the HTML mockup. Ensure `npx playwright install chromium` completed successfully. Check that `mockup-pages.html` loads correctly in a browser.
- **Video too small (< 1 MB):** Render likely failed mid-way. Check console output for errors. Ensure all 7 MP3 files exist before rendering.
- **Audio out of sync:** Delete all MP3s, regenerate from scratch (steps 2–3), then re-render. The `calculateMetadata` function auto-sizes to actual audio duration.
