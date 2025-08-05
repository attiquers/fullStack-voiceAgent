import { useEffect, useRef, useState, useCallback } from "react";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [awaitingTTS, setAwaitingTTS] = useState(false);
  const [chat, setChat] = useState([]);
  const [wsStatus, setWsStatus] = useState("connecting"); // "connected", "disconnected"

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioQueueRef = useRef([]);
  const currentAudioElementRef = useRef(null);
  const isPlayingAudioRef = useRef(false);

  const playNextAudio = useCallback(() => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;

    isPlayingAudioRef.current = true;
    const audioUrl = audioQueueRef.current.shift();

    if (!currentAudioElementRef.current) {
      currentAudioElementRef.current = new Audio();

      currentAudioElementRef.current.onended = () => {
        URL.revokeObjectURL(currentAudioElementRef.current.src);
        isPlayingAudioRef.current = false;
        playNextAudio();
      };

      currentAudioElementRef.current.onerror = (e) => {
        console.error("❌ Audio playback error:", e);
        URL.revokeObjectURL(currentAudioElementRef.current.src);
        isPlayingAudioRef.current = false;
        playNextAudio();
      };
    }

    currentAudioElementRef.current.src = audioUrl;
    currentAudioElementRef.current.play().catch(error => {
      console.error("❌ Error playing audio:", error);
      URL.revokeObjectURL(audioUrl);
      isPlayingAudioRef.current = false;
      playNextAudio();
    });
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log("🔌 Connecting to WebSocket...");
    setWsStatus("connecting");
    const ws = new WebSocket("ws://localhost:8000/ws/audio");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "transcript") {
          setChat(prev => [...prev, { sender: "user", text: msg.text }]);
        } else if (msg.type === "tts") {
          setChat(prev => [...prev, { sender: "ai", text: msg.sentence }]);

          const audioBytes = Uint8Array.from(atob(msg.audio_base64), c => c.charCodeAt(0));
          const blob = new Blob([audioBytes], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          audioQueueRef.current.push(url);
          playNextAudio();
        } else if (msg.type === "done") {
          setAwaitingTTS(false);
        }
      } catch (err) {
        console.error("❌ Failed to parse message", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("⚠️ WebSocket error:", err.message || err);
    };

    ws.onclose = (event) => {
      console.warn(`❌ WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      setWsStatus("disconnected");

      if (event.code !== 1000 && event.code !== 1001) {
        console.log("♻️ Reconnecting in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
      }
    };
  }, [playNextAudio]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      wsRef.current?.close(1000, "Component unmounting");
    };
  }, [connectWebSocket]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data);
        }
      };

      recorder.onstop = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send("<END>");
          setAwaitingTTS(true);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      setRecording(true);
    } catch (error) {
      alert("Microphone permission error.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 font-sans">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">🎙️ Voice Chat</h1>

        <div className="text-center text-sm text-gray-600">
          WebSocket Status:{" "}
          <span className={
            wsStatus === "connected"
              ? "text-green-600"
              : wsStatus === "connecting"
              ? "text-yellow-600"
              : "text-red-600"
          }>
            {wsStatus}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg shadow max-h-[400px] overflow-y-auto space-y-2">
          {chat.map((msg, i) => (
            <div key={i} className={`text-left p-2 rounded ${msg.sender === "user" ? "bg-blue-100 text-blue-800 self-start" : "bg-green-100 text-green-800 self-end"}`}>
              <strong>{msg.sender === "user" ? "You" : "AI"}:</strong> {msg.text}
            </div>
          ))}
        </div>

        <div className="text-center">
          {recording ? (
            <button onClick={stopRecording} className="bg-red-500 text-white py-2 px-4 rounded-lg">
              ⏹️ Stop Recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={awaitingTTS || wsStatus !== "connected"}
              className={`py-2 px-4 rounded-lg ${
                awaitingTTS || wsStatus !== "connected"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white"
              }`}
            >
              🎤 {awaitingTTS ? "Waiting for TTS..." : "Start Recording"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
