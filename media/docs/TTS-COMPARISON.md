# TTS Provider Comparison — Free Tier Analysis

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14

## Objective

Evaluate free/open-source TTS solutions for Lemon Squeezy promotional videos. Criteria: cost, latency, voice quality, integration ease, SaaS product demo tone fit.

---

## Comparison Matrix

| Provider | Free Tier Limit | Latency | Voice Quality | Integration | Tone Fit | Recommendation |
|----------|----------------|---------|---------------|-------------|----------|----------------|
| **ElevenLabs** | 10k chars/month | ~2-4s per request | ⭐⭐⭐⭐⭐ Excellent (most natural) | REST API, simple | ⭐⭐⭐⭐⭐ Professional, expressive | **✅ Best for high-quality promos** |
| **Google Cloud TTS** | 1M chars/month | ~1-2s per request | ⭐⭐⭐⭐ Very good (WaveNet voices) | REST API, gcloud SDK | ⭐⭐⭐⭐ Clear, professional | **✅ Best for volume/cost** |
| **Microsoft Azure TTS** | 0.5M chars/month | ~1-3s per request | ⭐⭐⭐⭐ Very good (Neural voices) | REST API, Azure SDK | ⭐⭐⭐⭐ Professional | ✅ Good balance |
| **Mozilla TTS** (Coqui) | Unlimited (local) | ~10-20s per request | ⭐⭐⭐ Good (robotic at times) | Python CLI/API, local install | ⭐⭐⭐ Acceptable for tech demos | ⚠️ Use if no API access |
| **pyttsx3** | Unlimited (local) | <1s per request | ⭐⭐ Fair (very robotic) | Python library, offline | ⭐⭐ Not suitable for marketing | ❌ Avoid for promotional content |
| **gTTS** (Google TTS unofficial) | Unlimited (web scraping) | ~2-5s per request | ⭐⭐⭐ Good (standard Google voices) | Python library, simple | ⭐⭐⭐ Acceptable | ⚠️ Unofficial, may break |

---

## Detailed Evaluation

### 1. ElevenLabs
**Free Tier:** 10,000 characters/month (≈5-7 minutes of audio)  
**Pricing:** $5/month for 30k chars, $22/month for 100k chars  

**Pros:**
- Best-in-class voice quality (indistinguishable from human for short clips)
- Wide voice library (expressive, professional, various accents)
- Excellent API docs, TypeScript SDK available
- Emotionally nuanced (great for engaging product demos)

**Cons:**
- Lowest free tier limit (10k chars ≈1,500 words ≈5-7 min audio)
- Rate-limited (may need caching strategy)
- Requires API key (environment variable management)

**Tone Fit:** ⭐⭐⭐⭐⭐  
Perfect for Lemon Squeezy's approachable, premium SaaS positioning. Voices sound warm and professional.

**Integration:**
```ts
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Welcome to Lemon Squeezy.",
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  }
);
const audioBuffer = Buffer.from(await response.arrayBuffer());
writeFileSync("output.mp3", audioBuffer);
```

**Recommendation:** ✅ **Use for final promotional videos** (limited by 10k/month, so reserve for high-quality marketing content).

---

### 2. Google Cloud TTS
**Free Tier:** 1 million characters/month (WaveNet voices: 1M chars, Standard: 4M chars)  
**Pricing:** $0.000016/char (WaveNet) after free tier  

**Pros:**
- Huge free tier (1M chars ≈150k words ≈500+ minutes audio)
- Fast API (1-2s latency)
- WaveNet voices sound very natural
- Reliable (Google infrastructure)
- Good language/accent coverage

**Cons:**
- Not quite as expressive as ElevenLabs
- Requires Google Cloud account + credentials (JSON key file)
- Slight "TTS sheen" on WaveNet voices (detectably synthetic on close listen)

**Tone Fit:** ⭐⭐⭐⭐  
Professional, clear, authoritative. Excellent for tutorials and explainer videos. Slightly less "warm" than ElevenLabs.

**Integration:**
```ts
const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();

const [response] = await client.synthesizeSpeech({
  input: { text: "Welcome to Lemon Squeezy." },
  voice: { languageCode: 'en-US', name: 'en-US-Neural2-C' },
  audioConfig: { audioEncoding: 'MP3' },
});

writeFileSync('output.mp3', response.audioContent, 'binary');
```

**Recommendation:** ✅ **Best for high-volume testing and tutorial videos** (free tier supports hundreds of videos).

---

### 3. Microsoft Azure TTS
**Free Tier:** 0.5 million characters/month (Neural voices: 0.5M chars)  
**Pricing:** $0.000016/char (Neural) after free tier  

**Pros:**
- Neural voices are excellent quality
- Good free tier (0.5M chars ≈75k words ≈250 minutes audio)
- Fast API (1-3s latency)
- SSML support for fine-grained control (pitch, rate, emphasis)

**Cons:**
- Requires Azure account + subscription (even for free tier)
- Slightly more complex auth (subscription key + region)
- Voice library smaller than ElevenLabs

**Tone Fit:** ⭐⭐⭐⭐  
Professional and clear. Good for corporate/SaaS content.

**Integration:**
```ts
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY!,
  process.env.AZURE_SPEECH_REGION!
);
speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
synthesizer.speakTextAsync("Welcome to Lemon Squeezy.", result => {
  writeFileSync('output.mp3', Buffer.from(result.audioData));
});
```

**Recommendation:** ✅ **Good middle ground** (quality + generous free tier).

---

### 4. Mozilla TTS (Coqui AI)
**Free Tier:** Unlimited (runs locally)  
**Pricing:** Free (open-source)  

**Pros:**
- No API costs or rate limits
- Runs offline (no internet dependency)
- Open-source, privacy-friendly

**Cons:**
- Significantly slower (10-20s per request on CPU, 3-5s on GPU)
- Voice quality inconsistent (robotic for complex sentences)
- Requires Python + model download (~1-2 GB)
- Limited voice options

**Tone Fit:** ⭐⭐⭐  
Acceptable for technical demos, but not polished enough for marketing.

**Integration:**
```bash
pip install TTS
tts --text "Welcome to Lemon Squeezy." --model_name "tts_models/en/ljspeech/tacotron2-DDC" --out_path output.wav
```

**Recommendation:** ⚠️ **Use only if API access is unavailable** (fallback for dev/testing).

---

### 5. pyttsx3
**Free Tier:** Unlimited (local)  
**Pricing:** Free (offline)  

**Pros:**
- Instant (<1s latency)
- Zero API dependencies
- Simple Python API

**Cons:**
- Very robotic (uses OS-level TTS engines: eSpeak on Linux, SAPI on Windows)
- Not suitable for any public-facing content
- Limited voice control

**Tone Fit:** ⭐⭐  
Sounds like early 2000s GPS navigation. Avoid.

**Recommendation:** ❌ **Do not use for Lemon Squeezy** (acceptable only for internal testing/debugging).

---

### 6. gTTS (Google TTS unofficial)
**Free Tier:** Unlimited (web scraping)  
**Pricing:** Free (uses Google Translate TTS endpoint)  

**Pros:**
- Simple Python library
- No API key required
- Fast (2-5s latency)

**Cons:**
- Unofficial (may break if Google changes API)
- Limited voice options (standard Google voices only)
- No commercial use guarantee

**Tone Fit:** ⭐⭐⭐  
Decent quality (same as Google Translate voice), but less control than official Google Cloud TTS.

**Integration:**
```python
from gtts import gTTS
tts = gTTS(text="Welcome to Lemon Squeezy.", lang='en')
tts.save("output.mp3")
```

**Recommendation:** ⚠️ **Use for prototyping only** (not production-ready due to unofficial status).

---

## Final Recommendations

### For Lemon Squeezy Promotional Videos:

**Primary:** **ElevenLabs** (10k chars/month free)
- Use for final high-quality marketing videos
- Best voice quality, most engaging
- Cache aggressively to stay within free tier

**Secondary:** **Google Cloud TTS** (1M chars/month free)
- Use for tutorial/explainer videos (higher volume)
- Excellent quality at scale
- Cost-effective for iteration

**Fallback:** **Azure TTS** (0.5M chars/month free)
- Use if Google quota exhausted
- Similar quality, slightly smaller free tier

**Dev/Testing Only:** **Mozilla TTS** or **gTTS**
- Use for local development before calling paid APIs
- Not suitable for final output

---

## Recommended Workflow

1. **Script development:** Use gTTS for rapid iteration (free, fast, no API key)
2. **Preview:** Generate with Google Cloud TTS (free tier covers testing)
3. **Final production:** Render with ElevenLabs (highest quality for public release)

**Cost estimate for 10 videos (each 60 seconds, ~150 words):**
- Total chars: 10 × 150 words × 5 chars/word = **7,500 chars**
- ElevenLabs free tier: **10k chars** → **✅ Fits within free tier**
- Google Cloud TTS: **1M chars** → **✅ 133x headroom**

---

## Next Steps

1. Obtain API keys:
   - ElevenLabs: https://elevenlabs.io/sign-up
   - Google Cloud TTS: https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries
   - Azure TTS: https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/

2. Store keys in `.env` (gitignored):
   ```env
   ELEVENLABS_API_KEY=your_key_here
   GOOGLE_APPLICATION_CREDENTIALS=path/to/gcloud-key.json
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=eastus
   ```

3. Implement `scripts/generate-audio.ts` with provider selection logic

4. Test each provider with a sample script, compare output quality

5. Document final choice in `TTS-LOG.md`
