import os
import tempfile
import base64
import soundfile as sf
import subprocess

from fastwhisper_stt import FastWhisperSTT
from kokoro_tts import KokoroTTS

# Choose backend
try:
    from llm_ollama import get_response
except ImportError:
    from llm_openrouter import get_response

stt = FastWhisperSTT()
tts = KokoroTTS()

def convert_to_wav(input_path, output_path):
    subprocess.run([
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "16000", "-ac", "1",  # 16kHz mono
        output_path
    ], check=True)

async def handle_audio_stream(websocket):
    await websocket.accept()
    audio_data = b""

    try:
        while True:
            chunk = await websocket.receive_bytes()
            if chunk == b"<END>":
                # Save input (e.g., .webm)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_in:
                    tmp_in.write(audio_data)
                    input_path = tmp_in.name

                # Convert to .wav for Whisper
                output_path = input_path.replace(".webm", ".wav")
                convert_to_wav(input_path, output_path)

                transcript = stt.transcribe(output_path)
                print("[Transcript]", transcript)

                response = get_response(transcript)
                sentences = [s.strip() for s in response.split('.') if s.strip()]

                for sentence in sentences:
                    audio = tts.synthesize(sentence)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_out:
                        sf.write(tmp_out.name, audio, samplerate=24000)
                        with open(tmp_out.name, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode()

                    await websocket.send_json({
                        "type": "tts",
                        "sentence": sentence,
                        "audio_base64": b64
                    })

                await websocket.send_json({"type": "done"})

                # Cleanup
                os.remove(input_path)
                os.remove(output_path)
                audio_data = b""
            else:
                audio_data += chunk

    except Exception as e:
        await websocket.close()
        print("WebSocket error:", e)
