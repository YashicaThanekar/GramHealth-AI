import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import {
  downsampleBuffer,
  floatTo16BitPCM,
  base64ToAudioBuffer,
  AudioQueue,
  VoiceWebSocketManager,
} from "./utils/audioUtils";
import "./VoiceAgent.css";

const VOICE_WS_URL = "ws://localhost:8002/api/ws/voice";

const VoiceAgent = ({ onClose }) => {
  const { t } = useLanguage();

  // Connection & recording state
  const [status, setStatus] = useState("idle"); // idle | connecting | ready | listening | processing | error
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  // Refs for audio pipeline
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioQueueRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  /**
   * Connect to voice agent backend & start audio pipeline
   */
  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    setMessages([]);

    try {
      // 1. Create AudioContext
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000,
      });
      audioContextRef.current = audioCtx;
      audioQueueRef.current = new AudioQueue(audioCtx);

      // 2. Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Connect WebSocket to backend
      const ws = new VoiceWebSocketManager(VOICE_WS_URL);

      ws.onMessage = (data) => {
        switch (data.type) {
          case "ready":
            setStatus("ready");
            startRecording();
            break;

          case "user":
            setMessages((prev) => [
              ...prev,
              { role: "user", text: data.text, time: new Date() },
            ]);
            setStatus("processing");
            break;

          case "agent":
            setMessages((prev) => [
              ...prev,
              { role: "agent", text: data.text, time: new Date() },
            ]);
            setStatus("listening");
            break;

          case "audio":
            // Play audio response from Gemini
            if (audioContextRef.current && audioQueueRef.current) {
              try {
                const audioBuffer = base64ToAudioBuffer(
                  data.audio,
                  audioContextRef.current
                );
                audioQueueRef.current.addToQueue(audioBuffer);
              } catch (e) {
                console.error("Audio playback error:", e);
              }
            }
            break;

          case "error":
            setError(data.message);
            setStatus("error");
            break;
        }
      };

      ws.onClose = () => {
        if (isRecordingRef.current) {
          setStatus("idle");
          stopRecording();
        }
      };

      ws.onError = () => {
        setError("Connection lost. Check if voice server is running on port 8002.");
        setStatus("error");
      };

      await ws.connect();
      wsRef.current = ws;
    } catch (err) {
      console.error("Voice connection failed:", err);
      const msg = err.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone permission."
        : "Could not connect to voice server. Make sure the backend is running on port 8002.";
      setError(msg);
      setStatus("error");
    }
  }, []);

  /**
   * Start capturing & streaming microphone audio
   */
  const startRecording = useCallback(() => {
    const audioCtx = audioContextRef.current;
    const stream = mediaStreamRef.current;
    if (!audioCtx || !stream) return;

    const source = audioCtx.createMediaStreamSource(stream);

    // Use ScriptProcessorNode (widely supported) for audio capture
    // Buffer size 4096 gives ~85ms chunks at 48kHz - good balance of latency vs overhead
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!isRecordingRef.current || !wsRef.current) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Downsample from browser rate to 16kHz for Gemini
      const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
      const pcmBase64 = floatTo16BitPCM(downsampled);

      wsRef.current.send({
        type: "audio",
        audio: pcmBase64,
      });
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    processorRef.current = { source, processor };
    isRecordingRef.current = true;
    setStatus("listening");
  }, []);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (processorRef.current) {
      const { source, processor } = processorRef.current;
      try {
        source.disconnect();
        processor.disconnect();
      } catch { /* already disconnected */ }
      processorRef.current = null;
    }
  }, []);

  /**
   * Full disconnect - cleanup everything
   */
  const disconnect = useCallback(() => {
    stopRecording();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioQueueRef.current) {
      audioQueueRef.current.reset();
      audioQueueRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isRecordingRef.current = false;
    setStatus("idle");
  }, [stopRecording]);

  // Status label + icon
  const statusConfig = {
    idle: { label: "Start Voice Assistant", icon: "🎙️", color: "#6b7280" },
    connecting: { label: "Connecting...", icon: "⏳", color: "#f59e0b" },
    ready: { label: "Initializing...", icon: "⚙️", color: "#3b82f6" },
    listening: { label: "Listening... Speak now", icon: "🔴", color: "#ef4444" },
    processing: { label: "Thinking...", icon: "🧠", color: "#8b5cf6" },
    error: { label: "Error", icon: "⚠️", color: "#ef4444" },
  };

  const currentStatus = statusConfig[status] || statusConfig.idle;
  const isActive = ["connecting", "ready", "listening", "processing"].includes(status);

  return (
    <div className="voice-agent-overlay">
      <div className="voice-agent-panel">
        {/* Header */}
        <div className="voice-agent-header">
          <div className="voice-agent-title-row">
            <span className="voice-agent-icon">🩺</span>
            <h3>GramHealth Voice Assistant</h3>
          </div>
          <button
            className="voice-agent-close"
            onClick={() => {
              disconnect();
              onClose();
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Status Bar */}
        <div
          className="voice-agent-status"
          style={{ borderColor: currentStatus.color }}
        >
          <span className="status-icon">{currentStatus.icon}</span>
          <span className="status-text" style={{ color: currentStatus.color }}>
            {currentStatus.label}
          </span>
          {status === "listening" && (
            <div className="voice-wave">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="voice-agent-error">
            <p>{error}</p>
            <button onClick={() => { setError(null); setStatus("idle"); }}>
              Dismiss
            </button>
          </div>
        )}

        {/* Conversation Messages */}
        <div className="voice-agent-messages">
          {messages.length === 0 && status === "idle" && (
            <div className="voice-agent-placeholder">
              <p>🎙️ Tap the button below to start talking to your AI health assistant.</p>
              <p className="voice-hint">
                Try saying: <em>"I have a headache and fever since morning"</em>
              </p>
            </div>
          )}
          {messages.length === 0 && status === "listening" && (
            <div className="voice-agent-placeholder">
              <p>🔊 I'm listening... Describe your symptoms.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`voice-msg voice-msg-${msg.role}`}>
              <div className="voice-msg-avatar">
                {msg.role === "user" ? "🗣️" : "🩺"}
              </div>
              <div className="voice-msg-content">
                <span className="voice-msg-role">
                  {msg.role === "user" ? "You" : "GramHealth AI"}
                </span>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="voice-agent-controls">
          {!isActive ? (
            <button className="voice-start-btn" onClick={connect}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              Start Voice Assistant
            </button>
          ) : (
            <button
              className="voice-stop-btn"
              onClick={disconnect}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="voice-agent-disclaimer">
          Voice guidance only — not a medical diagnosis. Visit a doctor for serious symptoms.
        </p>
      </div>
    </div>
  );
};

export default VoiceAgent;
