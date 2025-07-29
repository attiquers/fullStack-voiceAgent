import { createStream } from "fastrtc-client"; // pseudo‑SDK

export function initRtc(onSound, onResponseAudio) {
  const stream = createStream({
    modality: "audio",
    mode: "send-receive",
    onUserAudio: onSound,
    onAiAudioChunk: onResponseAudio,
  });
  return stream;
}
