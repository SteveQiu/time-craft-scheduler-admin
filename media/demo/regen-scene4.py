import os, sys, shutil, numpy as np

try:
    import torch, torch.serialization
    import numpy.core.multiarray
    torch.serialization.add_safe_globals([numpy.core.multiarray.scalar])
    _orig = torch.load
    def _patched(*a, **kw):
        if "weights_only" not in kw:
            kw["weights_only"] = False
        return _orig(*a, **kw)
    torch.load = _patched
except Exception:
    pass

from bark import generate_audio, preload_models
from scipy.io.wavfile import write as write_wav, read as read_wav_check

VOICE = "v2/en_speaker_6"
OUTPUT_DIR = r"C:\git\time-craft-scheduler-admin\media\demo\audio"
PUBLIC_DIR = r"C:\git\time-craft-scheduler-admin\media\public\demo\audio"

REGEN = [
    ("scene4a", "After the service is delivered, find the confirmed reservation in your Appointments tab and click Mark Complete. The status updates to Completed."),
    ("scene4b", "You can optionally upload payment proof for record keeping. That is the full booking flow in PikAppoint."),
]

print("Loading Bark models...")
preload_models()
print("Models loaded.")

for i, (name, text) in enumerate(REGEN, 1):
    print(f"[{i}/{len(REGEN)}] Generating {name}...")
    audio = generate_audio(text, history_prompt=VOICE)
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        target = 0.9
        audio = np.clip(audio * (target / peak), -1.0, 1.0)
    path = os.path.join(OUTPUT_DIR, f"{name}.wav")
    write_wav(path, 24000, audio)
    _r, _d = read_wav_check(path)
    dur = len(_d) / _r
    print(f"      Duration: {dur:.1f}s")
    if dur > 20:
        print(f"      WARNING: {name} is {dur:.1f}s (>20s limit)")
    shutil.copy(path, os.path.join(PUBLIC_DIR, f"{name}.wav"))
    print(f"      Copied to public/")

print("Done.")
