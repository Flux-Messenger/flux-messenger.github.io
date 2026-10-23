import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  isCircular?: boolean;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  isCircular = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(isCircular); // Circular videos default muted like Telegram
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setProgress((cur / dur) * 100);

    const curMins = Math.floor(cur / 60);
    const curSecs = Math.floor(cur % 60);
    setCurrentTime(`${curMins}:${String(curSecs).padStart(2, '0')}`);

    const durMins = Math.floor(dur / 60);
    const durSecs = Math.floor(dur % 60);
    setDuration(`${durMins}:${String(durSecs).padStart(2, '0')}`);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  // If it's a circular video note ("кружочек")
  if (isCircular) {
    return (
      <div 
        onClick={togglePlay}
        className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-2 border-blue-500/80 shadow-xl cursor-pointer group bg-black"
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          playsInline
          loop
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-cover"
        />
        
        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition">
            <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
              <Play className="w-6 h-6 ml-1 fill-white" />
            </div>
          </div>
        )}

        {/* Progress Ring border */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="300"
            strokeDashoffset={300 - (300 * progress) / 100}
            className="text-blue-400 transition-all duration-100"
          />
        </svg>

        {/* Sound toggle button */}
        <button
          onClick={toggleMute}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  // Standard Video Player
  return (
    <div className="relative max-w-sm sm:max-w-md rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl group bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="w-full max-h-72 object-cover cursor-pointer"
      />

      {/* Central Play overlay when paused */}
      {!isPlaying && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition active:scale-95">
            <Play className="w-6 h-6 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-2.5 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition"
      >
        {/* Progress seek bar */}
        <div 
          onClick={handleSeek}
          className="w-full h-1.5 bg-slate-700/70 hover:h-2.5 rounded-full cursor-pointer relative overflow-hidden transition-all"
        >
          <div 
            style={{ width: `${progress}%` }}
            className="h-full bg-blue-500 rounded-full"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlay}
              className="hover:text-white transition"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button 
              onClick={toggleMute}
              className="hover:text-white transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="font-mono text-[10px] text-slate-400">
              {currentTime} / {duration}
            </span>
          </div>

          <button 
            onClick={handleFullscreen}
            className="hover:text-white transition"
            title="Во весь экран"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
