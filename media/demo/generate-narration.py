#!/usr/bin/env python3
"""Generate Bark TTS narration for PikAppoint demo video.

Uses Bark (https://github.com/suno-ai/bark) — fully offline after model download.
First run downloads ~1.5GB models to ~/.cache/suno/bark_v0/

Usage:
    python media/demo/generate-narration.py

Output:
    media/demo/audio/scene1a.wav (Step 1 first half)
    media/demo/audio/scene1b.wav (Step 1 second half)
    media/demo/audio/scene2a.wav (Step 2 first half)
    media/demo/audio/scene2b.wav (Step 2 second half)
    media/demo/audio/scene3.wav  (Step 3)
    media/demo/audio/scene4a.wav (Step 4 first half)
    media/demo/audio/scene4b.wav (Step 4 second half)
    media/public/demo/audio/*.wav (copies for Remotion staticFile())
"""

import os
import sys
import shutil
import numpy as np

# PyTorch 2.6+ compat: allowlist numpy globals blocked by weights_only=True default
try:
    import torch
    import torch.serialization
    import numpy.core.multiarray
    torch.serialization.add_safe_globals([numpy.core.multiarray.scalar])
    # Bark calls torch.load without weights_only arg — patch to default False
    _orig_torch_load = torch.load
    def _patched_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _orig_torch_load(*args, **kwargs)
    torch.load = _patched_torch_load
except Exception:
    pass

try:
    from bark import generate_audio, preload_models
    from scipy.io.wavfile import write as write_wav
    from scipy.io.wavfile import read as read_wav_check
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install bark scipy numpy")
    sys.exit(1)

VOICE = "v2/en_speaker_6"  # Neutral professional voice
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "audio")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "demo", "audio")

# Narration text from NARRATION.md
NARRATIONS = [
    (
        "scene1a",
        "Welcome to PikAppoint. Let's see how providers create openings. From the admin dashboard, navigate to the Opening page. Click 'Add Opening' to schedule a new time slot."
    ),
    (
        "scene1b",
        "Fill in the date, start time, end time, service type, and worker name. Click Save. Your opening now appears on the calendar, ready for customers to book."
    ),
    (
        "scene2a",
        "Customers can browse available openings on the booking page. They can filter by service, date, or location."
    ),
    (
        "scene2b",
        "When they find a slot, they click Book. A confirmation dialog shows the appointment details. Click Confirm, and the reservation is now pending provider approval."
    ),
    (
        "scene3",
        "Back on the provider side, navigate to the Appointments tab. Pending reservations show with a yellow badge. Click on the appointment to review the details, then click Approve. The status changes to Confirmed."
    ),
    (
        "scene4a",
        "After the service is delivered, find the confirmed reservation in your Appointments tab and click Mark Complete. The status updates to Completed."
    ),
    (
        "scene4b",
        "You can optionally upload payment proof for record keeping. That is the full booking flow in PikAppoint."
    ),
]

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    print("🔊 Bark TTS — PikAppoint Demo Video")
    print(f"Voice: {VOICE}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Public: {PUBLIC_DIR}")
    print("")
    print("⏳ Loading Bark models (first run downloads ~1.5GB)...")
    
    try:
        preload_models()
    except Exception as e:
        print(f"❌ Failed to load models: {e}")
        print("Ensure you have ~2GB free disk space and internet on first run.")
        sys.exit(1)

    print("✅ Models loaded")
    print("")

    for i, (name, text) in enumerate(NARRATIONS, 1):
        print(f"[{i}/{len(NARRATIONS)}] Generating {name}...")
        try:
            audio = generate_audio(text, history_prompt=VOICE)

            # Normalize: target peak ~0.7 (-3dBFS) — prevents too-quiet output
            peak = float(np.max(np.abs(audio)))
            if peak > 0:
                target_peak = 0.9
                if peak < target_peak:  # too quiet — boost
                    audio = np.clip(audio * (target_peak / peak), -1.0, 1.0)

            # Save to audio/ folder
            path = os.path.join(OUTPUT_DIR, f"{name}.wav")
            write_wav(path, 24000, audio)
            print(f"      ✅ Saved: {path}")

            # Validate duration
            _rate, _data = read_wav_check(path)
            duration_s = len(_data) / _rate
            print(f"      ⏱  Duration: {duration_s:.1f}s")
            if duration_s > 20:
                print(f"      ⚠️  WARNING: {name}.wav is {duration_s:.1f}s (>20s limit). Consider splitting.")

            # Copy to public/ folder for Remotion
            public_path = os.path.join(PUBLIC_DIR, f"{name}.wav")
            shutil.copy(path, public_path)
            print(f"      📋 Copied to: {public_path}")
        except Exception as e:
            print(f"      ❌ Failed: {e}")
            continue

    print("")
    print("🎉 Done! Audio files in media/demo/audio/ and media/public/demo/audio/")
    print("Next: Render video with Remotion")

if __name__ == "__main__":
    main()
