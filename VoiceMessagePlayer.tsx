import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string;
  duration?: number;
  isMe?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  src,
  duration = 0,
  isMe = false
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentSec(Math.floor(audioRef.current.currentTime));
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentSec(0);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalDuration = duration || 5;
  const progressPercent = audioRef.current && audioRef.current.duration 
    ? (audioRef.current.currentTime / audioRef.current.duration) * 100 
    : 0;

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] max-w-xs">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition transform active:scale-95 ${
          isMe
            ? 'bg-white text-blue-600 hover:bg-slate-100'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-0.5 h-6">
          {[12, 18, 8, 22, 14, 26, 16, 20, 10, 24, 18, 12, 28, 14, 20, 16, 8, 14].map((h, i) => {
            const barProgress = (i / 18) * 100;
            const isPlayed = barProgress <= progressPercent;
            return (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className={`w-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? isMe ? 'bg-white' : 'bg-blue-400'
                    : isMe ? 'bg-white/40' : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        <div className={`text-[10px] font-mono flex items-center justify-between ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
          <span>{formatSec(currentSec)}</span>
          <span>{formatSec(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};
