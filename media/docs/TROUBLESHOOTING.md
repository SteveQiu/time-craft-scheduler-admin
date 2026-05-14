# Troubleshooting Guide

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

Common issues with Remotion + TTS video generation and solutions.

---

## Remotion Issues

### Problem: "Cannot find module 'remotion'"

**Symptom:** Import errors when running Remotion Studio or render commands.

**Solution:**
```bash
npm install remotion @remotion/media @remotion/media-utils
```

**Root cause:** Remotion not installed in project.

---

### Problem: Blank output / nothing renders

**Symptoms:**
- Remotion Studio shows blank canvas
- Rendered video is black screen

**Checklist:**
1. **Check `staticFile()` paths:**
   ```tsx
   // ✅ Correct
   <Img src={staticFile("logo.png")} />
   
   // ❌ Wrong (relative path)
   <Img src="./public/logo.png" />
   ```

2. **Verify files exist in `public/` folder:**
   ```bash
   ls media/public/
   # Should see: logo.png, audio/, etc.
   ```

3. **Check browser console in Studio:**
   - Open DevTools (F12)
   - Look for 404 errors or React errors

4. **Test with simple content:**
   ```tsx
   return <div style={{ color: "white" }}>Hello World</div>;
   ```

---

### Problem: Audio not playing

**Symptom:** Video renders but no sound.

**Checklist:**
1. **Use `<Audio>` component (not HTML `<audio>`):**
   ```tsx
   import { Audio, staticFile } from "remotion";
   <Audio src={staticFile("audio/scene-01.mp3")} />
   ```

2. **Verify audio file format:** Must be MP3, WAV, or OGG
   ```bash
   file media/public/audio/scene-01.mp3
   # Should show: Audio file with ID3 version 2.4.0
   ```

3. **Check audio duration matches video:**
   ```tsx
   const duration = await getAudioDuration(staticFile("audio/scene-01.mp3"));
   console.log(duration); // Should be > 0
   ```

4. **Volume check:**
   ```tsx
   <Audio src={staticFile("audio/scene-01.mp3")} volume={1.0} />
   ```

---

### Problem: "CSS animations/transitions not working"

**Symptom:** Used CSS `@keyframes` or `transition` but nothing animates in rendered video.

**Root cause:** CSS animations are timing-based (real-time), but Remotion renders frame-by-frame. CSS animations don't work in non-realtime rendering.

**Solution:** Use `interpolate()` instead:
```tsx
// ❌ Wrong (CSS animation)
<div className="fade-in">Text</div>

// ✅ Correct (Remotion interpolate)
const opacity = interpolate(frame, [0, 30], [0, 1]);
<div style={{ opacity }}>Text</div>
```

---

### Problem: Slow rendering (takes forever)

**Symptoms:**
- Rendering 10 seconds takes 10+ minutes
- CPU usage very high

**Solutions:**

1. **Lower concurrency:**
   ```bash
   npx remotion render my-comp output.mp4 --concurrency=2
   ```

2. **Reduce preview quality:**
   ```bash
   npx remotion render my-comp output.mp4 --scale=0.5
   ```

3. **Optimize effects:**
   - Remove heavy CSS filters (blur, drop-shadow)
   - Reduce image sizes (use WebP, compress PNGs)
   - Limit layers (fewer overlapping elements)

4. **Use GPU acceleration (if available):**
   ```bash
   npx remotion render my-comp output.mp4 --gl=angle
   ```

---

## TTS Issues

### Problem: "ELEVENLABS_API_KEY not set"

**Symptom:** `generate-audio.ts` script fails with environment variable error.

**Solution:**
1. Create `.env` file in project root:
   ```env
   ELEVENLABS_API_KEY=your_key_here
   ```

2. Load `.env` in script:
   ```typescript
   import 'dotenv/config';
   ```

3. Verify key is loaded:
   ```typescript
   console.log(process.env.ELEVENLABS_API_KEY); // Should print key
   ```

**Security:** Add `.env` to `.gitignore` (never commit API keys).

---

### Problem: "ElevenLabs API error: 401 Unauthorized"

**Symptom:** TTS generation fails with 401 status code.

**Causes:**
1. Invalid API key
2. API key not activated
3. Free tier expired

**Solution:**
1. Verify key at https://elevenlabs.io/app/settings
2. Check quota: https://elevenlabs.io/app/usage
3. Regenerate key if needed

---

### Problem: "Rate limit exceeded"

**Symptom:** ElevenLabs returns 429 status code after multiple requests.

**Solution:**
1. Implement caching (don't regenerate unchanged audio):
   ```typescript
   if (existsSync(outputPath)) {
     console.log("Using cached audio");
     return;
   }
   ```

2. Add delay between requests:
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
   ```

3. Switch to higher-quota provider (Google Cloud TTS: 1M chars/month).

---

### Problem: Audio sounds robotic/low quality

**Symptom:** TTS output is choppy or unnatural.

**Solutions:**

1. **Use better voice model (ElevenLabs):**
   ```typescript
   model_id: "eleven_multilingual_v2" // Higher quality
   ```

2. **Adjust voice settings:**
   ```typescript
   voice_settings: {
     stability: 0.5,        // 0-1 (higher = more stable, less expressive)
     similarity_boost: 0.75, // 0-1 (higher = more consistent with voice sample)
     style: 0.3,            // 0-1 (higher = more exaggerated)
   }
   ```

3. **Try different voices:**
   - ElevenLabs: https://elevenlabs.io/voice-library
   - Google: `en-US-Neural2-C`, `en-US-Neural2-D`, `en-US-Neural2-F`

4. **Switch providers:** ElevenLabs > Google WaveNet > Azure Neural > Mozilla TTS

---

### Problem: Audio too fast/slow

**Symptom:** Voiceover pacing doesn't match video timing.

**Solutions:**

1. **Add pauses in script:**
   ```json
   {
     "text": "Welcome to Lemon Squeezy. [pause] The best payment platform."
   }
   ```

2. **Split long sentences into separate scenes:**
   ```json
   [
     { "id": "scene-01", "text": "Welcome to Lemon Squeezy." },
     { "id": "scene-02", "text": "The best payment platform." }
   ]
   ```

3. **Use SSML for fine-grained control (Google/Azure):**
   ```xml
   <speak>
     Welcome to Lemon Squeezy.
     <break time="500ms"/>
     The best payment platform.
   </speak>
   ```

---

## Integration Issues

### Problem: `calculateMetadata` not updating composition duration

**Symptom:** Video duration stays fixed at 100 frames despite audio being longer.

**Checklist:**
1. **Verify `calculateMetadata` is async:**
   ```tsx
   const calculateMetadata: CalculateMetadataFunction = async ({ props }) => {
     const duration = await getAudioDuration(staticFile("audio.mp3"));
     return { durationInFrames: Math.ceil(duration * 30) };
   };
   ```

2. **Check `calculateMetadata` is registered:**
   ```tsx
   <Composition
     id="my-comp"
     component={MyComp}
     fps={30}
     calculateMetadata={calculateMetadata} // Must be here!
   />
   ```

3. **Restart Remotion Studio after changes:**
   ```bash
   # Ctrl+C to stop
   npx remotion studio
   ```

---

### Problem: Audio and video out of sync

**Symptoms:**
- Voiceover plays before/after visuals
- Scenes don't line up with audio

**Solutions:**

1. **Measure exact audio durations:**
   ```tsx
   const durations = await Promise.all(
     scenes.map(s => getAudioDuration(staticFile(s.audioPath)))
   );
   ```

2. **Use cumulative frame offsets:**
   ```tsx
   let offset = 0;
   scenes.forEach((scene, i) => {
     <Sequence from={offset} durationInFrames={durations[i]}>
       <Audio src={staticFile(scene.audioPath)} />
     </Sequence>
     offset += durations[i];
   });
   ```

3. **Add manual delays if needed:**
   ```tsx
   <Sequence from={offset + 15}> {/* 0.5s delay at 30fps */}
   ```

---

## File Path Issues

### Problem: "ENOENT: no such file or directory"

**Symptom:** Script can't find files.

**Solutions:**

1. **Use absolute paths:**
   ```typescript
   import { join } from "path";
   const filePath = join(__dirname, "..", "public", "audio", "scene-01.mp3");
   ```

2. **Check current working directory:**
   ```typescript
   console.log(process.cwd());
   // Should be: C:\git\time-craft-scheduler-admin\media
   ```

3. **Verify file exists:**
   ```bash
   ls media/public/audio/
   # Should see: scene-01.mp3, scene-02.mp3, etc.
   ```

---

## Quality Issues

### Problem: Video looks pixelated/blurry

**Solutions:**

1. **Render at full resolution:**
   ```bash
   npx remotion render my-comp output.mp4 --scale=1
   ```

2. **Increase bitrate:**
   ```bash
   npx remotion render my-comp output.mp4 --video-bitrate=10M
   ```

3. **Use higher resolution assets:**
   - Images: 2× resolution (3840×2160 for 1920×1080 output)
   - Fonts: Use vector fonts (no rasterization)

---

### Problem: Output file size too large

**Symptom:** 15-second video is 200+ MB.

**Solutions:**

1. **Use H.264 codec (default):**
   ```bash
   npx remotion render my-comp output.mp4 --codec=h264
   ```

2. **Lower bitrate:**
   ```bash
   npx remotion render my-comp output.mp4 --video-bitrate=5M
   ```

3. **Compress output:**
   ```bash
   ffmpeg -i output.mp4 -vcodec libx264 -crf 23 output-compressed.mp4
   ```

---

## Getting Help

**Remotion Docs:** https://www.remotion.dev/docs  
**Remotion Discord:** https://remotion.dev/discord  
**ElevenLabs Support:** https://elevenlabs.io/support  
**Google Cloud TTS Docs:** https://cloud.google.com/text-to-speech/docs

**Team contact:** Newt (this folder) or Ripley (frontend integration).
