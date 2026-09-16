import React, { useState, useEffect, useRef } from 'react';

interface VoiceOrbSquareProps {
  isActive: boolean;
  onStop: () => void;
  onTranscript?: (text: string) => void;
  size?: number;
}

export const VoiceOrbSquare: React.FC<VoiceOrbSquareProps> = ({
  isActive,
  onStop,
  onTranscript,
  size,
}) => {
  const [audioLevel, setAudioLevel] = useState(0.25);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Web Audio API volume listener + Live Speech Recognition
  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;

    // 1. Microphone Audio Visualizer
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          stream = s;
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(s);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkAudio = () => {
              if (!analyser) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
              }
              const average = sum / bufferLength;
              // Normalize from 0.15 (idle breath) to 1.0 (loud speech)
              const level = Math.min(1.0, Math.max(0.15, average / 56));
              setAudioLevel(level);
              animFrameRef.current = requestAnimationFrame(checkAudio);
            };
            checkAudio();
          }
        })
        .catch(() => {
          // Fallback organic breath pulse if mic access is simulated/pending
          const interval = setInterval(() => {
            setAudioLevel(0.2 + Math.random() * 0.4);
          }, 140);
          return () => clearInterval(interval);
        });
    }

    // 2. Real-time Live Speech Recognition (Web Speech API)
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript && onTranscript) {
            onTranscript(currentTranscript);
          }
        };

        recognition.onerror = () => {};
        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition error:', err);
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (e) {}
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isActive, onTranscript]);

  if (!isActive) return null;

  const scale = 0.85 + audioLevel * 0.45;
  const opacity = 0.75 + audioLevel * 0.25;

  return (
    <div
      onClick={onStop}
      title="Click to stop voice dictation"
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
        flexShrink: 0,
      }}
      className="shrink-0 aspect-square rounded-2xl bg-[#1c1c20] border border-white/10 shadow-2xl p-2 flex items-center justify-center relative overflow-hidden select-none cursor-pointer group hover:border-white/20 transition-all duration-150"
    >
      {/* SMALL ORGANIC AUDIO-REACTIVE MOVING GRADIENT */}
      <div className="relative flex items-center justify-center z-10">
        {/* DIFFUSED GRADIENT GLOW */}
        <div
          className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 blur-md pointer-events-none animate-fluid-flow"
          style={{
            transform: `scale(${scale * 1.5})`,
            opacity: opacity * 0.55,
          }}
        />

        {/* CORE SMALL MOVING GRADIENT LIQUID ELEMENT */}
        <div
          className="relative w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-tr from-cyan-400 via-indigo-400 to-fuchsia-400 animate-fluid-flow shadow-lg transition-transform duration-75"
          style={{
            transform: `scale(${scale})`,
            opacity,
            borderRadius: `${36 + audioLevel * 14}% ${64 - audioLevel * 12}% ${52 + audioLevel * 10}% ${48 - audioLevel * 12}% / ${48 + audioLevel * 14}% ${52 - audioLevel * 12}% ${58 + audioLevel * 8}% ${42 - audioLevel * 10}%`,
          }}
        />
      </div>
    </div>
  );
};
