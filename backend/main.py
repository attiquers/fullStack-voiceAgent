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

# Initialize modules
stt = FastWhisperSTT()
tts = KokoroTTS()

app = FastAPI()

# CORS config for local dev
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
    chat_history = []  # 🧠 Maintain (role, content) for user/AI messages

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                chunk = message["bytes"]
                audio_data += chunk
                print(f"🎧 Received audio chunk ({len(chunk)} bytes)")

            elif "text" in message:
                if message["text"].strip() == "<END>":
                    await websocket.send_json({"type": "status", "text": "Processing Speech to Text..."})

                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
                        tmp.write(audio_data)
                        audio_path = tmp.name

                    transcript = stt.transcribe(audio_path)
                    os.remove(audio_path)

                    print(f"🗣️ Transcript: {transcript}")
                    await websocket.send_json({"type": "transcript", "text": transcript})
                    chat_history.append({"role": "user", "content": transcript})

                    await websocket.send_json({"type": "status", "text": "Fetching response from LLM..."})
                    response = get_response(chat_history)  # 🔁 Use full history now
                    print(f"🤖 LLM response: {response}")
                    chat_history.append({"role": "assistant", "content": response})

                    sentences = [s.strip() for s in response.split('.') if s.strip()]
                    total = len(sentences)

                    for i, sentence in enumerate(sentences):
                        await websocket.send_json({
                            "type": "status",
                            "text": f"Synthesizing sentence {i+1}/{total}..."
                        })

                        print(f"🔊 Synthesizing: {sentence}")
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

                        await asyncio.sleep(0.1)

                    await websocket.send_json({"type": "done"})
                    print("✅ Session complete.")
                    audio_data = b""

    except WebSocketDisconnect:
        print("❌ WebSocket disconnected")
    except Exception as e:
        print(f"💥 Error: {e}")
        await websocket.close()
