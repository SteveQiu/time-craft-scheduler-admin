# TTS Integration Workflow

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

## Overview

How to wire TTS-generated audio into Remotion video compositions.

---

## Workflow Diagram

```
1. Write script (text)
   ↓
2. Generate TTS audio (scripts/generate-audio.ts)
   ↓
3. Save to media/public/audio/
   ↓
4. Measure audio duration
   ↓
5. Remotion calculateMetadata() reads duration
   ↓
6. Composition auto-sizes to match audio
   ↓
7. Render video with synced voiceover
```

---

## Step-by-Step Integration

### Step 1: Write Video Script

Create `media/scripts/video-scripts.json`:

```json
{
  "lemon-squeezy-intro": {
    "scenes": [
      {
        "id": "scene-01",
        "text": "Welcome to Lemon Squeezy, the payment platform built for digital creators.",
        "duration": null
      },
      {
        "id": "scene-02",
        "text": "Sell products, manage subscriptions, and get paid globally—all in one place.",
        "duration": null
      },
      {
        "id": "scene-03",
        "text": "Start your free trial today.",
        "duration": null
      }
    ]
  }
}
```

---

### Step 2: Generate TTS Audio

Run `scripts/generate-audio.ts` (see implementation below):

```bash
node --strip-types media/scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs
```

**Output:**
- `media/public/audio/lemon-squeezy-intro/scene-01.mp3`
- `media/public/audio/lemon-squeezy-intro/scene-02.mp3`
- `media/public/audio/lemon-squeezy-intro/scene-03.mp3`
- Updates `video-scripts.json` with audio durations

---

### Step 3: Implement `generate-audio.ts`

Create `media/scripts/generate-audio.ts`:

```typescript
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// TTS provider interfaces
interface TTSProvider {
  name: string;
  generate(text: string, voiceId: string): Promise<Buffer>;
}

// ElevenLabs provider
class ElevenLabsProvider implements TTSProvider {
  name = "elevenlabs";
  apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM"): Promise<Buffer> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

// Google Cloud TTS provider
class GoogleTTSProvider implements TTSProvider {
  name = "google";

  async generate(text: string, voiceName: string = "en-US-Neural2-C"): Promise<Buffer> {
    const textToSpeech = require("@google-cloud/text-to-speech");
    const client = new textToSpeech.TextToSpeechClient();

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { languageCode: "en-US", name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    });

    return Buffer.from(response.audioContent);
  }
}

// Main generation function
async function generateAudio(
  compositionId: string,
  provider: TTSProvider
) {
  const scriptsPath = join(__dirname, "video-scripts.json");
  const scripts = JSON.parse(readFileSync(scriptsPath, "utf-8"));
  const composition = scripts[compositionId];

  if (!composition) {
    throw new Error(`Composition "${compositionId}" not found in video-scripts.json`);
  }

  const outputDir = join(__dirname, "..", "public", "audio", compositionId);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Generating audio for "${compositionId}" using ${provider.name}...`);

  for (const scene of composition.scenes) {
    const outputPath = join(outputDir, `${scene.id}.mp3`);

    // Check cache
    if (existsSync(outputPath)) {
      console.log(`  ✓ ${scene.id}.mp3 (cached)`);
      continue;
    }

    console.log(`  Generating ${scene.id}.mp3...`);
    const audioBuffer = await provider.generate(scene.text);
    writeFileSync(outputPath, audioBuffer);
    console.log(`  ✓ ${scene.id}.mp3 (${audioBuffer.length} bytes)`);
  }

  console.log(`\nAudio generation complete. Files saved to ${outputDir}`);
}

// CLI entry point
const args = process.argv.slice(2);
const compositionId = args.find((a) => a.startsWith("--composition="))?.split("=")[1];
const providerName = args.find((a) => a.startsWith("--provider="))?.split("=")[1] || "elevenlabs";

if (!compositionId) {
  console.error("Usage: node generate-audio.ts --composition=<id> [--provider=elevenlabs|google]");
  process.exit(1);
}

let provider: TTSProvider;
if (providerName === "elevenlabs") {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable not set");
  }
  provider = new ElevenLabsProvider(apiKey);
} else if (providerName === "google") {
  provider = new GoogleTTSProvider();
} else {
  throw new Error(`Unknown provider: ${providerName}`);
}

generateAudio(compositionId, provider);
```

**Usage:**
```bash
# ElevenLabs
ELEVENLABS_API_KEY=your_key node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs

# Google Cloud TTS
GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=google
```

---

### Step 4: Measure Audio Duration in Remotion

Update `media/Root.tsx` to use `calculateMetadata`:

```tsx
import { Composition, CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "@remotion/media-utils";
import { LemonSqueezyIntro } from "./templates/lemon-squeezy-intro";

const FPS = 30;

const calculateMetadata: CalculateMetadataFunction<any> = async () => {
  const sceneFiles = [
    "audio/lemon-squeezy-intro/scene-01.mp3",
    "audio/lemon-squeezy-intro/scene-02.mp3",
    "audio/lemon-squeezy-intro/scene-03.mp3",
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
      id="lemon-squeezy-intro"
      component={LemonSqueezyIntro}
      fps={FPS}
      width={1920}
      height={1080}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

---

### Step 5: Use Scene Durations in Composition

Update `media/templates/lemon-squeezy-intro.tsx`:

```tsx
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";

interface Props {
  sceneDurations: number[]; // Frames per scene
}

export const LemonSqueezyIntro = ({ sceneDurations }: Props) => {
  const [scene1Frames, scene2Frames, scene3Frames] = sceneDurations;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* Scene 1 */}
      <Sequence from={0} durationInFrames={scene1Frames}>
        <Audio src={staticFile("audio/lemon-squeezy-intro/scene-01.mp3")} />
        <div style={{ color: "white", fontSize: 60, textAlign: "center", marginTop: 400 }}>
          Welcome to Lemon Squeezy
        </div>
      </Sequence>

      {/* Scene 2 */}
      <Sequence from={scene1Frames} durationInFrames={scene2Frames}>
        <Audio src={staticFile("audio/lemon-squeezy-intro/scene-02.mp3")} />
        <div style={{ color: "white", fontSize: 50, textAlign: "center", marginTop: 400 }}>
          Sell products, manage subscriptions
        </div>
      </Sequence>

      {/* Scene 3 */}
      <Sequence from={scene1Frames + scene2Frames} durationInFrames={scene3Frames}>
        <Audio src={staticFile("audio/lemon-squeezy-intro/scene-03.mp3")} />
        <div style={{ color: "#FFD700", fontSize: 70, textAlign: "center", marginTop: 400 }}>
          Start your free trial today
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
```

---

## Caching Strategy

**Problem:** TTS API calls cost money/quota. Don't regenerate unchanged audio.

**Solution:** Check if MP3 exists before calling API.

In `generate-audio.ts`:
```typescript
if (existsSync(outputPath)) {
  console.log(`  ✓ ${scene.id}.mp3 (cached)`);
  continue; // Skip API call
}
```

**Manual cache invalidation:**
```bash
rm -rf media/public/audio/lemon-squeezy-intro/
```

---

## Logging TTS Usage

Create `media/docs/TTS-LOG.md` to track API calls:

```markdown
# TTS API Usage Log

| Date | Composition | Provider | Chars | Cost | Notes |
|------|-------------|----------|-------|------|-------|
| 2026-05-14 | lemon-squeezy-intro | ElevenLabs | 180 | $0 (free tier) | Initial test |
| 2026-05-15 | lemon-squeezy-intro | Google | 180 | $0 (free tier) | Comparison test |
```

**Add logging to `generate-audio.ts`:**
```typescript
const charCount = scene.text.length;
const logEntry = `| ${new Date().toISOString().split('T')[0]} | ${compositionId} | ${provider.name} | ${charCount} | $0 (free tier) | ${scene.id} |\n`;
appendFileSync("docs/TTS-LOG.md", logEntry);
```

---

## Troubleshooting

**Audio not playing in Remotion Studio**
- Ensure audio files are in `media/public/audio/` (not `media/audio/`)
- Use `staticFile()` to reference audio, not relative paths
- Check browser console for 404 errors

**Audio out of sync**
- Verify `calculateMetadata` is returning correct durations
- Use `getAudioDuration()` from `@remotion/media-utils`
- Check audio format is MP3 (not WAV or OGG)

**API rate limits hit**
- Implement caching (check if file exists before generating)
- Use lower-cost provider (Google 1M chars vs ElevenLabs 10k chars)
- Pre-generate audio before rendering (don't call API during render)

---

## Next Steps

1. Set up `.env` with API keys
2. Run `generate-audio.ts` for test composition
3. Verify audio files in `media/public/audio/`
4. Preview in Remotion Studio (`npx remotion studio`)
5. Render final video (`npx remotion render`)
6. Log usage to TTS-LOG.md

See also:
- **TTS-COMPARISON.md** — Choose a TTS provider
- **TEMPLATE-USAGE.md** — Remotion composition patterns
