import React, { useRef, useState } from "react";

const AudioStream = () => {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const mediaRecorderRef = useRef(null);
  const websocketRef = useRef(null);

  const handleStart = async () => {
    setRecording(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ws = new WebSocket("ws://localhost:8000/ws/audio");
    websocketRef.current.binaryType = "arraybuffer";

    websocketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "tts") {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.play();
        setMessages((prev) => [...prev, { ai: data.sentence }]);
      } else if (data.type === "done") {
        setRecording(false);
      }
    };

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm"
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && websocketRef.current.readyState === 1) {
        event.data.arrayBuffer().then((buffer) => {
          websocketRef.current.send(buffer);
        });
      }
    };

    mediaRecorder.start(300); // send every 300ms chunk
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    if (websocketRef.current && websocketRef.current.readyState === 1) {
      websocketRef.current.send("<END>");
    }

    setRecording(false);
  };

  return (
    <div>
      <button onClick={recording ? handleStop : handleStart}>
        {recording ? "🛑 Stop Recording" : "🎙️ Start Recording"}
      </button>

      <div style={{ marginTop: "1rem" }}>
        {messages.map((m, i) => (
          <p key={i}>
            <strong>🤖:</strong> {m.ai}
          </p>
        ))}
      </div>
    </div>
  );
};

export default AudioStream;
