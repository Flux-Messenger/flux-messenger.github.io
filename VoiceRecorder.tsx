import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { uploadAudioVoice } from '../services/mediaUpload';

interface VoiceRecorderProps {
  onSendVoice: (audioUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(150);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.error('Mic access error', e);
      alert('Не удалось получить доступ к микрофону для записи.');
      onCancel();
    }
  };

  const stopAndSave = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  const handleSend = async () => {
    if (isRecording) {
      stopAndSave();
    }
    const finalBlob = audioBlob || (chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'audio/webm' }) : null);
    if (!finalBlob) return;

    setIsSending(true);
    try {
      const url = await uploadAudioVoice(finalBlob);
      onSendVoice(url, seconds || 1);
    } catch (e) {
      alert('Ошибка при отправке голосового сообщения');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-xl animate-in fade-in duration-150">
      <div className="flex items-center gap-3">
        <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-xs text-white font-semibold">
          {formatTime(seconds)}
        </span>
        <div className="flex items-center gap-0.5 h-5 px-2">
          {[4, 12, 18, 8, 14, 20, 10, 16, 22, 12, 6].map((h, i) => (
            <div
              key={i}
              style={{ height: `${Math.max(4, (h * (seconds % 3 + 1)) % 22)}px` }}
              className="w-1 bg-blue-500 rounded-full transition-all duration-150"
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          title="Отменить"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSending ? 'Отправка...' : 'Отправить'}</span>
        </button>
      </div>
    </div>
  );
};
