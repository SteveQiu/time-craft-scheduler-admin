# TTS & Media CLI Quick Reference

**Owner:** Newt (Media & Video Engineer)  
**Last Updated:** 2026-05-14  
**Purpose:** Quick-access CLI commands for generating audio, managing video scripts, and rendering Remotion compositions.

---

## ⚡ Quick Start — Generate Audio

### Using Existing Script (ElevenLabs, Google, Azure)

```bash
# Prerequisites
npm install @google-cloud/text-to-speech microsoft-cognitiveservices-speech-sdk

# ElevenLabs (best quality, limited free tier)
export ELEVENLABS_API_KEY=your_key_here
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs

# Google Cloud TTS (best free tier: 1M chars/month)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=google

# Azure TTS (0.5M chars/month free)
export AZURE_SPEECH_KEY=your_key_here
export AZURE_SPEECH_REGION=eastus
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=azure
```

---

## 📚 All Supported TTS Providers (CLI)

### 1. **ElevenLabs** ⭐⭐⭐⭐⭐ (Best Quality)
```bash
# Setup
npm install elevenlabs
export ELEVENLABS_API_KEY=sk_xxxxx

# Via TypeScript script (built-in)
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs

# Direct CLI (Node.js)
node -e "
const https = require('https');
const fs = require('fs');
const text = 'Welcome to Lemon Squeezy';
const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const options = {
  hostname: 'api.elevenlabs.io',
  path: '/v1/text-to-speech/' + voiceId,
  method: 'POST',
  headers: {
    'xi-api-key': process.env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  }
};
const req = https.request(options, (res) => {
  res.pipe(fs.createWriteStream('output.mp3'));
});
req.write(JSON.stringify({text, model_id: 'eleven_multilingual_v2'}));
req.end();
"

# Via Python
pip install elevenlabs
python -c "
from elevenlabs import ElevenLabs
client = ElevenLabs(api_key='sk_xxxxx')
audio = client.text_to_speech.convert(text='Welcome to Lemon Squeezy', voice_id='21m00Tcm4TlvDq8ikWAM')
with open('output.mp3', 'wb') as f: f.write(audio)
"

# Specs
# Free tier: 10,000 chars/month
# Latency: 2-4s
# Quality: Excellent (⭐⭐⭐⭐⭐ most natural)
# Voices: 100+ (Rachel, Andy, Bella, Gigi, etc.)
```

### 2. **Google Cloud TTS** ⭐⭐⭐⭐ (Best Free Tier)
```bash
# Setup
gcloud auth application-default login
npm install @google-cloud/text-to-speech
export GOOGLE_APPLICATION_CREDENTIALS=$HOME/.config/gcloud/application_default_credentials.json

# Via TypeScript script (built-in)
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=google

# Via gcloud CLI (direct)
gcloud text-to-speech synthesize-speech \
  --text="Welcome to Lemon Squeezy" \
  --language-code=en-US \
  --voice-gender=FEMALE \
  --audio-encoding=MP3 \
  --output-file=output.mp3

# Via Python
pip install google-cloud-text-to-speech
python -c "
from google.cloud import texttospeech
client = texttospeech.TextToSpeechClient()
synthesis_input = texttospeech.SynthesisInput(text='Welcome to Lemon Squeezy')
voice = texttospeech.VoiceSelectionParams(language_code='en-US', name='en-US-Neural2-C')
audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
response = client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
with open('output.mp3', 'wb') as out:
    out.write(response.audio_content)
"

# Specs
# Free tier: 1,000,000 chars/month (WaveNet voices)
# Latency: 1-2s
# Quality: Very good (⭐⭐⭐⭐ clear, professional)
# Voices: 30+ (Neural2-A, Neural2-C, Neural2-E, Wavenet, Standard)
```

### 3. **Microsoft Azure TTS** ⭐⭐⭐⭐
```bash
# Setup
npm install microsoft-cognitiveservices-speech-sdk
export AZURE_SPEECH_KEY=your_key_here
export AZURE_SPEECH_REGION=eastus

# Via TypeScript script (built-in)
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=azure

# Via Azure CLI (direct)
az cognitiveservices account show --name your-resource-name --resource-group your-group

# Via PowerShell
$speechConfig = New-Object Microsoft.CognitiveServices.Speech.SpeechConfig
$speechConfig.SpeechSynthesisVoiceName = "en-US-JennyNeural"
$synthesizer = New-Object Microsoft.CognitiveServices.Speech.SpeechSynthesizer -ArgumentList $speechConfig

# Via Python
pip install azure-cognitiveservices-speech
python -c "
import azure.cognitiveservices.speech as speechsdk
speech_config = speechsdk.SpeechConfig(subscription='key', region='eastus')
speech_config.speech_synthesis_voice_name = 'en-US-JennyNeural'
file_config = speechsdk.audio.AudioOutputConfig(filename='output.mp3')
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=file_config)
synthesizer.speak_text('Welcome to Lemon Squeezy')
"

# Specs
# Free tier: 500,000 chars/month (Neural voices)
# Latency: 1-3s
# Quality: Very good (⭐⭐⭐⭐ professional)
# Voices: 200+ (JennyNeural, GuyNeural, AriaNeural, etc.)
```

### 4. **Mozilla TTS / Coqui AI** ⭐⭐⭐ (Free, Local, No API Key)
```bash
# Setup (Python only, no Node.js version)
pip install TTS torch

# CLI (no API key required, runs locally)
tts --text "Welcome to Lemon Squeezy" \
  --model_name "tts_models/en/ljspeech/glow-tts" \
  --vocoder_name "vocoder_models/en/ljspeech/hifi_gan" \
  --out_path output.wav

# Alternative: Tacotron2 (slower, slightly better quality)
tts --text "Welcome to Lemon Squeezy" \
  --model_name "tts_models/en/ljspeech/tacotron2-DDC" \
  --out_path output.wav

# Batch process (directory of text files)
tts --text "Welcome to Lemon Squeezy" \
  --model_name "tts_models/en/ljspeech/glow-tts" \
  --gpu

# Via Python (programmatic)
python -c "
from TTS.api import TTS
tts = TTS(model_name='tts_models/en/ljspeech/glow-tts', gpu=True)
tts.tts_to_file(text='Welcome to Lemon Squeezy', file_path='output.wav')
"

# Specs
# Free tier: Unlimited (runs locally)
# Latency: 10-20s per request (CPU), 3-5s (GPU)
# Quality: Good (⭐⭐⭐ robotic at times)
# Voices: Limited (LJSpeech, Glow-TTS, Tacotron2, FastSpeech)
# GPU recommended for speed
```

### 5. **pyttsx3** ⭐⭐ (Offline, Robotic — Dev Only)
```bash
# Setup
pip install pyttsx3

# CLI (Python)
python -c "
import pyttsx3
engine = pyttsx3.init()
engine.save_to_file('Welcome to Lemon Squeezy', 'output.mp3')
engine.runAndWait()
"

# Specs
# Free tier: Unlimited (system TTS engine)
# Latency: <1s (very fast)
# Quality: Poor (⭐⭐ robotic, eSpeak/SAPI)
# Use case: DEV ONLY — not for marketing content
```

### 6. **gTTS (Google Translate TTS)** ⭐⭐⭐ (Unofficial, Free)
```bash
# Setup (Python)
pip install gtts

# CLI (simple, no API key required)
gtts-cli "Welcome to Lemon Squeezy" -o output.mp3 -l en

# Batch (multiple texts)
echo "Welcome to Lemon Squeezy" | gtts-cli - -o output.mp3

# Via Python
python -c "
from gtts import gTTS
tts = gTTS(text='Welcome to Lemon Squeezy', lang='en', slow=False)
tts.save('output.mp3')
"

# Specs
# Free tier: Unlimited (web scraping — unofficial)
# Latency: 2-5s
# Quality: Good (⭐⭐⭐ same as Google Translate)
# ⚠️ Risk: May break if Google changes API
```

### 7. **Voicebox (Facebook/Meta)** ⭐⭐⭐⭐
```bash
# Setup (research/experimental)
pip install torch torchaudio

# Via HuggingFace (no local CLI yet, Python only)
python -c "
import torch
from audiocraft.models import MusicGen
model = torch.hub.load('facebookresearch/encodec:main', 'encodec_24khz')
# Voicebox model not yet in torch.hub, check HuggingFace for latest
"

# Specs
# Free: Open-source (local)
# Latency: Varies (GPU required)
# Quality: Very good (⭐⭐⭐⭐ experimental)
# Note: Limited public CLI — mostly research stage
```

### 8. **Bark (Suno AI)** ⭐⭐⭐⭐ (Free, Open-Source)
```bash
# Setup (experimental, Python only)
pip install bark

# CLI (Python)
python -c "
from bark import SAMPLE_RATE, generate_audio, preload_models
preload_models()
audio_array = generate_audio('Welcome to Lemon Squeezy', history_prompt='en_speaker_1')
# Save using scipy
import scipy.io.wavfile as wavfile
wavfile.write('output.wav', SAMPLE_RATE, audio_array)
"

# Specs
# Free: Open-source, local
# Latency: 10-30s (CPU), faster on GPU
# Quality: Good (⭐⭐⭐⭐ natural, expressive)
# Voices: 10+ preset speakers
```

---

## 🎬 Remotion Video Rendering (CLI)

### Build Remotion video from template
```bash
# Development (preview in browser)
npm run dev

# Production render (MP4 output)
npx remotion render lemon-squeezy-intro output.mp4

# With custom settings
npx remotion render lemon-squeezy-intro output.mp4 \
  --frames 0-240 \
  --codec h264 \
  --crf 20 \
  --concurrency 4

# List all compositions
npx remotion compositions

# Render with audio input
npx remotion render lemon-squeezy-intro output.mp4 \
  --props '{"audioPath":"./media/audio/lemon-squeezy-intro/scene-1.mp3"}'
```

---

## 🔊 Audio Processing (FFmpeg)

### Merge audio with video
```bash
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4
```

### Concat multiple audio files
```bash
cat <<EOF > concat.txt
file 'scene-1.mp3'
file 'scene-2.mp3'
file 'scene-3.mp3'
EOF

ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp3
```

### Convert format
```bash
ffmpeg -i input.wav -acodec libmp3lame -q:a 9 output.mp3
ffmpeg -i input.mp3 -acodec pcm_s16le output.wav
```

### Add silence between clips
```bash
ffmpeg -i input.mp3 -af "pad=2:0:2,atrim=0:$(echo 'scale=2; ($(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp3 | cut -d. -f1) + 2) * 1000' | bc)" output.mp3
```

---

## 📝 Working with `video-scripts.json`

### Format
```json
{
  "lemon-squeezy-intro": {
    "scenes": [
      {
        "id": "scene-1",
        "text": "Welcome to Lemon Squeezy, the all-in-one payment platform.",
        "duration": 6
      },
      {
        "id": "scene-2",
        "text": "Accept payments from customers worldwide.",
        "duration": 5
      }
    ]
  }
}
```

### Generate audio for all scenes in composition
```bash
node --strip-types scripts/generate-audio.ts \
  --composition=lemon-squeezy-intro \
  --provider=google
```

### Check what's in your scripts
```bash
node -e "console.log(JSON.stringify(require('./scripts/video-scripts.json'), null, 2))"
```

---

## 🗂️ Media Folder Structure

```
media/
├── audio/                          # Generated TTS audio files
│   ├── lemon-squeezy-intro/        # Organized by composition
│   │   ├── scene-1.mp3
│   │   ├── scene-2.mp3
│   │   └── scene-3.mp3
│   └── ...
├── videos/                         # Final MP4 outputs
├── cache/                          # Remotion cache (gitignored)
├── templates/                      # Remotion composition components
│   ├── lemon-squeezy-intro.tsx
│   └── ...
├── assets/                         # Images, logos, fonts (tracked)
├── scripts/
│   ├── generate-audio.ts          # TTS entry point
│   └── video-scripts.json         # Scene text definitions
├── public/                         # Web-accessible files
├── docs/
│   ├── CLI-QUICK-REFERENCE.md     # This file
│   ├── TTS-COMPARISON.md          # Detailed provider comparison
│   ├── TTS-INTEGRATION.md         # Implementation details
│   ├── TTS-LOG.md                 # Usage tracking
│   └── ...
└── README.md                       # Quick-start guide
```

---

## 🔑 Environment Variables

### `.env` (gitignored)
```bash
# ElevenLabs
ELEVENLABS_API_KEY=sk_xxxxx

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=/Users/you/.config/gcloud/application_default_credentials.json

# Azure
AZURE_SPEECH_KEY=xxxxxxxxxxxxxxx
AZURE_SPEECH_REGION=eastus

# Optional: Default TTS provider
DEFAULT_TTS_PROVIDER=google
```

### Load .env
```bash
# Via Node (built into scripts/generate-audio.ts)
require('dotenv').config();

# Via bash
set -a && source .env && set +a

# Via PowerShell
Get-Content .env | ForEach-Object { $_ -match '^\s*(\w+)=(.+)$' | % { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2]) } }
```

---

## ✅ Workflow Example

### Generate a complete Lemon Squeezy intro video

```bash
# 1. Define your script (edit scripts/video-scripts.json)
cat > scripts/video-scripts.json << 'EOF'
{
  "lemon-squeezy-intro": {
    "scenes": [
      {"id": "intro", "text": "Welcome to Lemon Squeezy", "duration": 3},
      {"id": "features", "text": "The all-in-one payment platform", "duration": 3}
    ]
  }
}
EOF

# 2. Generate audio
export ELEVENLABS_API_KEY=sk_xxxxx
node --strip-types scripts/generate-audio.ts --composition=lemon-squeezy-intro --provider=elevenlabs

# 3. Render video
npx remotion render lemon-squeezy-intro ./media/videos/lemon-squeezy-intro.mp4

# 4. Verify
ls -lh media/audio/lemon-squeezy-intro/
ls -lh media/videos/
```

---

## 📊 Cost Estimate

| Provider | Free Tier | Cost for 10 Videos (60s @ 150 words) | Recommended Use |
|----------|-----------|----------------------------------------|-----------------|
| ElevenLabs | 10k chars | ✅ Free (7.5k chars used) | Final promo quality |
| Google Cloud | 1M chars | ✅ Free (7.5k chars used) | High volume testing |
| Azure | 0.5M chars | ✅ Free (7.5k chars used) | Backup/secondary |
| Mozilla TTS | Unlimited | ✅ Free (local) | Dev/testing only |
| pyttsx3 | Unlimited | ✅ Free (local) | Dev/testing only |
| Bark | Unlimited | ✅ Free (local) | Experimental |

---

## 🆘 Troubleshooting

### "API key not found"
```bash
# Check your .env is in root
ls -la .env
# Reload environment
export $(cat .env | xargs)
# Verify
echo $ELEVENLABS_API_KEY
```

### "Module not found: @google-cloud/text-to-speech"
```bash
npm install @google-cloud/text-to-speech microsoft-cognitiveservices-speech-sdk
```

### "Remotion render fails"
```bash
# Clear cache
rm -rf ./media/cache
# Verify template exists
ls -la ./media/templates/lemon-squeezy-intro.tsx
# Re-run
npx remotion render lemon-squeezy-intro ./media/videos/test.mp4 --concurrency 2
```

### "gTTS returns HTTP 403"
```bash
# gTTS may be blocked. Use official Google Cloud TTS instead
# Or wait a few hours before retrying
```

---

## 📚 Further Reading

- [Remotion Docs](https://www.remotion.dev/)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [Google Cloud TTS API](https://cloud.google.com/text-to-speech/docs/reference/rest)
- [Azure Speech TTS](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/text-to-speech)
- [Mozilla TTS/Coqui](https://github.com/coqui-ai/TTS)
- [FFmpeg Guide](https://ffmpeg.org/ffmpeg.html)
