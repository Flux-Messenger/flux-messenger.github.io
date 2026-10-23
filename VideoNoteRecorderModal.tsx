import React, { useState, useRef, useEffect } from 'react';
import { X, Video, RotateCcw, Send, Trash2 } from 'lucide-react';
import { uploadVideoFile } from '../services/mediaUpload';

interface VideoNoteRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVideoNote: (videoUrl: string, duration: number) => void;
}

export const VideoNoteRecorderModal: React.FC<VideoNoteRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVideoNote
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      initCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const initCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 480 },
          height: { ideal: 480 },
          aspectRatio: 1
        },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error('Camera error', e);
      alert('Не удалось получить доступ к камере для видеосообщения.');
      onClose();
    }
  };

  const stopCamera = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordedBlob(null);
    setSeconds(0);
  };

  const startRecord = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      setRecordedBlob(blob);
    };

    recorder.start(100);
    setIsRecording(true);
    setSeconds(0);

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s >= 59) {
          // Max 60 seconds for video note
          stopRecord();
          return 60;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode((f) => (f === 'user' ? 'environment' : 'user'));
  };

  const handleSend = async () => {
    if (isRecording) {
      stopRecord();
    }
    const blobToSend = recordedBlob || (chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'video/mp4' }) : null);
    if (!blobToSend) return;

    setIsUploading(true);
    setUploadStatus('Загрузка видеосообщения...');
    try {
      const res = await uploadVideoFile(blobToSend, 'video_note.mp4', (pct, msg) => {
        setUploadStatus(`${msg}`);
      });
      onSendVideoNote(res.videoUrl, seconds || 1);
      onClose();
    } catch (e: any) {
      alert('Ошибка при отправке: ' + (e.message || 'Сбой сети'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-400" />
          Видеосообщение (Кружочек)
        </h3>

        {/* Circular Video Preview Frame */}
        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl bg-black mb-4 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`}
          />
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse pointer-events-none" />
          )}

          {/* Flip camera on mobile */}
          {!isRecording && (
            <button
              onClick={toggleCameraFacing}
              className="absolute bottom-3 right-8 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center transition shadow-lg border border-slate-700"
              title="Переключить камеру"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Timer */}
        <div className="font-mono text-sm font-semibold text-white mb-4">
          00:{String(seconds).padStart(2, '0')} / 01:00
        </div>

        {uploadStatus && (
          <div className="text-xs text-blue-400 mb-3 animate-pulse">{uploadStatus}</div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {!isRecording && !recordedBlob ? (
            <button
              onClick={startRecord}
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-lg shadow-red-600/30 flex items-center gap-2 active:scale-95"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>Начать запись</span>
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecord}
              className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700 flex items-center gap-2"
            >
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Остановить</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setRecordedBlob(null);
                  setSeconds(0);
                }}
                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Перезаписать"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleSend}
                disabled={isUploading}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isUploading ? 'Отправка...' : 'Отправить кружочек'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
