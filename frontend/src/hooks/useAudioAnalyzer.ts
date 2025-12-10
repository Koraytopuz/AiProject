import { useEffect, useRef, useState } from 'react';

export interface VoiceMetrics {
  rms: number; // Root Mean Square energy
  zcr: number; // Zero-Crossing Rate
  pitchHz: number | null; // Basic pitch estimate via autocorrelation
}

export function useAudioAnalyzer(stream: MediaStream | null) {
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!stream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceRef.current = source;
    bufferRef.current = buffer;

    const update = () => {
      if (!analyserRef.current || !bufferRef.current) return;
      analyserRef.current.getFloatTimeDomainData(bufferRef.current);

      const samples = bufferRef.current;
      const rms = calcRMS(samples);
      const zcr = calcZCR(samples, audioContextRef.current?.sampleRate || 44100);
      const pitchHz = calcPitch(samples, audioContextRef.current?.sampleRate || 44100);

      setVoiceMetrics({
        rms: Number(rms.toFixed(4)),
        zcr: Number(zcr.toFixed(2)),
        pitchHz: pitchHz ? Number(pitchHz.toFixed(1)) : null,
      });

      rafRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return voiceMetrics;
}

function calcRMS(samples: Float32Array) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function calcZCR(samples: Float32Array, sampleRate: number) {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1] === 0) continue;
    if (Math.sign(samples[i - 1]) !== Math.sign(samples[i])) crossings++;
  }
  const durationSec = samples.length / sampleRate;
  return durationSec > 0 ? crossings / durationSec : 0;
}

// Simple autocorrelation pitch detection (basic heuristic)
function calcPitch(samples: Float32Array, sampleRate: number): number | null {
  const size = samples.length;
  const autocorr = new Float32Array(size);

  for (let lag = 0; lag < size; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += samples[i] * samples[i + lag];
    }
    autocorr[lag] = sum;
  }

  // Find peak after zero lag
  let peakIndex = -1;
  let peakValue = 0;
  for (let i = 1; i < size; i++) {
    if (autocorr[i] > peakValue) {
      peakValue = autocorr[i];
      peakIndex = i;
    }
  }

  if (peakIndex <= 0) return null;
  return sampleRate / peakIndex;
}

