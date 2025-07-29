import { useEffect, useRef, useState, useCallback } from "react";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [awaitingTTS, setAwaitingTTS] = useState(false); // Wait for TTS completion
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
      console.log("✅ WebSocket already open or connecting, skipping re-initialization.");
      return;
    }

    console.log("Attempting to connect WebSocket...");
    const ws = new WebSocket("ws://localhost:8000/ws/audio");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WebSocket connected");

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "tts" && msg.audio_base64) {
          console.log("🔊 Received TTS:", msg.sentence || "");
          const audioBytes = Uint8Array.from(atob(msg.audio_base64), c => c.charCodeAt(0));
          const blob = new Blob([audioBytes], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          audioQueueRef.current.push(url);
          playNextAudio();
        } else if (msg.type === "done") {
          console.log("✅ Backend indicated TTS stream is complete.");
          setAwaitingTTS(false); // Done waiting
        } else {
          console.log("📩 Other message:", msg);
        }
      } catch (err) {
        console.error("❌ Failed to parse message", err);
      }
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket error", err);
    };

    ws.onclose = (event) => {
      console.log(`❎ WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      if (event.code !== 1000 && event.code !== 1001) {
        console.log("Attempting to reconnect WebSocket in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
      }
    };
  }, [playNextAudio]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Component unmounting");
      }

      audioQueueRef.current.forEach(url => URL.revokeObjectURL(url));
      audioQueueRef.current = [];

      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current.src = "";
        currentAudioElementRef.current.load();
        currentAudioElementRef.current = null;
      }
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
          console.log("📤 Sent <END> to backend");
          setAwaitingTTS(true); // Start waiting for response
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      setRecording(true);
      console.log("🎙️ Recording started");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
      alert("Could not start recording. Please ensure microphone access is granted.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    console.log("🛑 Recording stopped");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🎙️ Voice Assistant</h1>

        {recording ? (
          <button
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            ⏹️ Stop Recording
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={awaitingTTS} // Prevent new recording during TTS playback
            className={`${
              awaitingTTS ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            } text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75`}
          >
            🎤 {awaitingTTS ? "Waiting for TTS..." : "Start Recording"}
          </button>
        )}
      </div>
    </div>
  );
}
