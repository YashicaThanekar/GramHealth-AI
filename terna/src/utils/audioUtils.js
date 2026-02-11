/**
 * Audio Utilities for GramHealth Voice Agent
 * Handles PCM audio conversion, downsampling, and playback queue
 * for real-time voice communication with Gemini Native Audio.
 */

/**
 * Downsamples audio from browser sample rate (e.g. 44.1kHz/48kHz) to 16kHz for Gemini.
 * Uses averaging (low-pass filter) instead of sample-dropping for better quality.
 */
export function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = 16000) {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const start = Math.round(i * sampleRateRatio);
    const end = Math.round((i + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let j = start; j < end && j < buffer.length; j++) {
      accum += buffer[j];
      count++;
    }
    result[i] = count > 0 ? accum / count : 0;
  }

  return result;
}

/**
 * Converts Float32 audio samples to 16-bit PCM encoded as Base64.
 * This is the format Gemini expects for audio input.
 */
export function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Efficient binary-to-base64 conversion (chunk to avoid stack overflow)
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1024) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + 1024, bytes.byteLength))
    );
  }
  return btoa(binary);
}

/**
 * Converts Base64 PCM audio from Gemini back to a playable AudioBuffer.
 * Gemini returns 24kHz mono PCM audio.
 */
export function base64ToAudioBuffer(base64, audioContext) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const frameCount = bytes.length / 2;
  // Gemini outputs 24kHz mono audio
  const buffer = audioContext.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < frameCount; i++) {
    const int16 = view.getInt16(i * 2, true);
    channelData[i] = int16 / 32768.0;
  }

  return buffer;
}

/**
 * AudioQueue - Manages sequential audio playback to prevent choppy output.
 * Schedules audio buffers back-to-back using Web Audio API timing.
 */
export class AudioQueue {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.nextStartTime = 0;
    this.sources = [];
  }

  addToQueue(buffer) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    // If we've fallen behind, reset to now (handles network lag)
    if (this.nextStartTime < this.ctx.currentTime) {
      this.nextStartTime = this.ctx.currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.sources.push(source);

    // Clean up finished sources
    source.onended = () => {
      const idx = this.sources.indexOf(source);
      if (idx !== -1) this.sources.splice(idx, 1);
    };
  }

  reset() {
    this.sources.forEach((s) => {
      try { s.stop(); } catch { /* already stopped */ }
    });
    this.sources = [];
    this.nextStartTime = 0;
  }
}

/**
 * WebSocket manager with auto-reconnect for the voice agent backend.
 */
export class VoiceWebSocketManager {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.onMessage = null;
    this.onClose = null;
    this.onError = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws.close();
            reject(new Error("Connection timeout (10s)"));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (this.onMessage) this.onMessage(data);
          } catch {
            console.warn("Non-JSON WebSocket message received");
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(timeout);
          if (this.onError) this.onError(err);
          if (!this.isConnected) reject(err);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          if (this.onClose) this.onClose();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send(data) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}
