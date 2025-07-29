import os
import tempfile
import base64
import asyncio
import soundfile as sf

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from fastwhisper_stt import FastWhisperSTT
from kokoro_tts import KokoroTTS

# Choose LLM backend
try:
    from llm_ollama import get_response
except ImportError:
    from llm_openrouter import get_response

# Init models
stt = FastWhisperSTT()
tts = KokoroTTS()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ WebSocket connection opened")

    audio_data = b""

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                chunk = message["bytes"]
                audio_data += chunk
                print(f"🎧 Received audio chunk ({len(chunk)} bytes)")

            elif "text" in message:
                text = message["text"]
                print(f"📝 Received text message: {text}")

                if text.strip() == "<END>":
                    print("🔄 Finalizing audio stream for transcription...")

                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                        tmp.write(audio_data)
                        audio_path = tmp.name
                        print(f"💾 Audio saved to {audio_path}")

                    print("🗣️ Starting transcription...")
                    transcript = stt.transcribe(audio_path)
                    print(f"✅ Transcription result: {transcript}")
                    os.remove(audio_path)

                    print("🤖 Sending prompt to LLM...")
                    response = get_response(transcript)
                    print(f"🧠 LLM response:\n{response}")

                    sentences = [s.strip() for s in response.split('.') if s.strip()]

                    # Stream each TTS sentence immediately after synthesis
                    for i, sentence in enumerate(sentences):
                        print(f"🔊 Synthesizing sentence {i+1}/{len(sentences)}: {sentence}")
                        audio = tts.synthesize(sentence)

                        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_audio:
                            sf.write(tmp_audio.name, audio, samplerate=24000)
                            with open(tmp_audio.name, "rb") as f:
                                b64 = base64.b64encode(f.read()).decode()

                        await websocket.send_json({
                            "type": "tts",
                            "sentence": sentence,
                            "audio_base64": b64
                        })
                        print(f"📤 TTS sent for sentence {i+1}/{len(sentences)}")

                        # Optional: allow small delay for smoother UX overlap
                        await asyncio.sleep(0.1)

                    # Notify frontend all TTS is sent
                    await websocket.send_json({"type": "done"})
                    print("✅ Session complete.")

                    audio_data = b""  # Reset buffer

    except WebSocketDisconnect:
        print("❌ WebSocket disconnected")

    except Exception as e:
        print(f"💥 Error: {e}")
        await websocket.close()
