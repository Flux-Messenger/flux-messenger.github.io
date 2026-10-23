import React, { useEffect, useRef, useState } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  MonitorUp, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { webrtc, CallState } from '../services/webrtc';

interface CallOverlayProps {
  callState: CallState;
  partnerName: string;
  partnerPhoto: string;
  isVideoCall?: boolean;
  incomingCallId?: string | null;
  onHangUp: () => void;
  onAnswer: (callId: string, isVideo?: boolean) => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  partnerName,
  partnerPhoto,
  isVideoCall,
  incomingCallId,
  onHangUp,
  onAnswer
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Bind WebRTC streams to video & audio elements
  useEffect(() => {
    webrtc.setCallbacks(
      (state, details) => {
        if (state === 'connected' && details?.duration !== undefined) {
          setDuration(details.duration);
        }
      },
      (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        const hasVid = remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks().some(t => t.enabled);
        setRemoteHasVideo(hasVid);

        remoteStream.getVideoTracks().forEach(track => {
          track.onmute = () => setRemoteHasVideo(false);
          track.onunmute = () => setRemoteHasVideo(true);
        });
      }
    );
  }, []);

  // Update local video element when localStream changes
  useEffect(() => {
    if (webrtc.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webrtc.localStream;
    }
  }, [webrtc.localStream, isCameraOn, isSharingScreen]);

  if (callState === 'idle') return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    const muted = webrtc.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = async () => {
    const cam = await webrtc.toggleCamera();
    setIsCameraOn(cam);
    if (webrtc.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webrtc.localStream;
    }
  };

  const handleSwitchCamera = async () => {
    await webrtc.switchCamera();
    if (webrtc.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = webrtc.localStream;
    }
  };

  const handleToggleScreen = async () => {
    const sharing = await webrtc.toggleScreenShare();
    setIsSharingScreen(sharing);
  };

  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-4 md:p-8 animate-in fade-in duration-200">
      
      {/* Hidden audio element for WebRTC sound */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* FULLSCREEN REMOTE VIDEO (when video is available) */}
      <div className={`absolute inset-0 bg-slate-950 overflow-hidden flex items-center justify-center ${remoteHasVideo ? 'block' : 'hidden'}`}>
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* PICTURE-IN-PICTURE (Local Camera / Screen Share) */}
      {(isCameraOn || isSharingScreen) && (
        <div className="absolute top-6 right-6 w-32 h-44 md:w-48 md:h-64 bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl z-30 group">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover mirror"
          />
          {/* Flip camera button for mobile phones */}
          <button
            onClick={handleSwitchCamera}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-slate-950/80 hover:bg-slate-800 text-white flex items-center justify-center text-xs transition shadow-md border border-slate-700/60"
            title="Переключить камеру"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP BAR: Status & Timer */}
      <div className="text-center z-20 pt-4">
        <span className="inline-block px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-blue-400 border border-slate-700/50 mb-2">
          {callState === 'incoming' && 'Входящий вызов'}
          {callState === 'outgoing' && 'Исходящий вызов...'}
          {callState === 'connecting' && 'Соединение...'}
          {callState === 'connected' && 'Разговор'}
        </span>
        {callState === 'connected' && (
          <div className="text-sm font-mono text-slate-300 drop-shadow">
            {formatTimer(duration)}
          </div>
        )}
      </div>

      {/* CENTER: Audio Mode Avatar & Name (Shown when remote video is not transmitting) */}
      {!remoteHasVideo && (
        <div className="flex flex-col items-center space-y-4 z-20 my-auto">
          <div className="relative">
            <img 
              src={partnerPhoto || 'https://placehold.co/150x150/3b82f6/ffffff?text=U'} 
              alt={partnerName}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-blue-500/40 shadow-2xl"
            />
            {callState !== 'connected' && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/40 animate-ping pointer-events-none" />
            )}
          </div>

          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow">
              {partnerName}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {callState === 'incoming' && 'Хочет поговорить с вами'}
              {callState === 'outgoing' && 'Ожидание ответа...'}
              {callState === 'connecting' && 'Установка безопасного P2P соединения...'}
              {callState === 'connected' && 'P2P зашифрованный звонок'}
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS */}
      <div className="w-full max-w-lg flex items-center justify-around z-30 pb-4 md:pb-6 bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-3.5 shadow-2xl">
        
        {/* If incoming, answer or decline */}
        {callState === 'incoming' ? (
          <>
            <button
              onClick={onHangUp}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-2xl transition shadow-xl shadow-red-600/30 active:scale-95"
              title="Отклонить"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            <button
              onClick={() => incomingCallId && onAnswer(incomingCallId, false)}
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-2xl transition shadow-xl shadow-emerald-600/30 active:scale-95 animate-bounce"
              title="Ответить"
            >
              <Phone className="w-7 h-7" />
            </button>
          </>
        ) : (
          /* Active Call Controls */
          <>
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMute}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                isMuted 
                  ? 'bg-red-600/30 text-red-400 border border-red-500/40' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={handleToggleCamera}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                isCameraOn 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isCameraOn ? 'Выключить камеру' : 'Включить камеру'}
            >
              {isCameraOn ? <VideoIcon className="w-5 h-5 md:w-6 md:h-6" /> : <VideoOff className="w-5 h-5 md:w-6 md:h-6" />}
            </button>

            {/* Screen Share (Especially for computer / desktop) */}
            <button
              onClick={handleToggleScreen}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                isSharingScreen 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isSharingScreen ? 'Остановить трансляцию' : 'Демонстрация экрана'}
            >
              <MonitorUp className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Speaker Sound Toggle */}
            <button
              onClick={handleToggleSpeaker}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition shadow-lg ${
                !isSpeakerOn 
                  ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isSpeakerOn ? 'Заглушить звук' : 'Включить звук'}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5 md:w-6 md:h-6" /> : <VolumeX className="w-5 h-5 md:w-6 md:h-6" />}
            </button>

            {/* Hang Up Button */}
            <button
              onClick={onHangUp}
              className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition shadow-xl shadow-red-600/30 active:scale-95"
              title="Завершить звонок"
            >
              <PhoneOff className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          </>
        )}

      </div>

    </div>
  );
};
