import os
import numpy as np

VAD_BACKEND = "silero"
# VAD_BACKEND = "webrtc"

if VAD_BACKEND == "silero":
    import torch
    import torchaudio
    from silero_vad import VoiceActivityDetector

    vad_model, utils = torch.hub.load(
        repo_or_dir='snakers4/silero-vad',
        model='silero_vad',
        force_reload=False
    ), None
    vad = VoiceActivityDetector(vad_model)

elif VAD_BACKEND == "webrtc":
    import webrtcvad
    vad = webrtcvad.Vad(2)  # 0-3 (aggressiveness)

else:
    raise ValueError(f"Unsupported VAD_BACKEND: {VAD_BACKEND}")


def is_speech(chunk: bytes, sample_rate: int = 16000) -> bool:
    if VAD_BACKEND == "silero":
        waveform = torch.from_numpy(np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0)
        return vad.is_speech(waveform.unsqueeze(0), sample_rate=sample_rate)

    elif VAD_BACKEND == "webrtc":
        # Ensure 16-bit mono PCM @ 16kHz, 10/20/30ms frame
        return vad.is_speech(chunk, sample_rate)

    return False
