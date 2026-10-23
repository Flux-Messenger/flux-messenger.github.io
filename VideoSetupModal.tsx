import React, { useState } from 'react';
import { 
  X, 
  Video, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  UploadCloud, 
  Copy, 
  Check, 
  Info,
  PlaySquare,
  FileVideo
} from 'lucide-react';
import { uploadVideoFile } from '../services/mediaUpload';

interface VideoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VideoSetupModal: React.FC<VideoSetupModalProps> = ({ isOpen, onClose }) => {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const storageRulesSnippet = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /voices/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(storageRulesSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsTesting(true);
    setTestStatus('Идет проверка отправки тестового видео...');
    try {
      const res = await uploadVideoFile(file, 'test_video.mp4', (pct, msg) => {
        setTestStatus(`${msg} (${pct}%)`);
      });
      setTestStatus(`✅ Видео успешно загружено и доступно! URL: ${res.videoUrl.substring(0, 45)}...`);
    } catch (err: any) {
      setTestStatus(`❌ Ошибка проверки: ${err.message || 'Проверьте соединение'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Хранилище медиа: Видео, Голосовые и Кружочки</h3>
              <p className="text-xs text-slate-400">Где и как хранятся голосовые и видеосообщения в Firebase</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          
          {/* Card 1: Ready to use */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 flex items-start gap-3.5">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-white text-sm">Отправка видео уже работает прямо сейчас!</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Мы внедрили многоуровневую систему отправки: при нажатии на скрепку в чате выберите видео (MP4, WebM, MOV). 
                Мессенджер автоматически сгенерирует превью-кадр, оптимизирует файл и отправит его с красивым плеером.
              </p>
            </div>
          </div>

          {/* Step 1: Firebase Storage Rules */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                1. Правила Firebase Storage (для неограниченного облака)
              </span>
              <button 
                onClick={copyRules}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSnippet ? 'Скопировано!' : 'Копировать правила'}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Чтобы видео любого размера сохранялись в ваш проект <code className="text-blue-300 bg-slate-800 px-1.5 py-0.5 rounded">w10mmesseger</code> в Firebase Console:
              откройте <b>Build → Storage → Rules</b> и вставьте:
            </p>
            <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs text-blue-300/90 overflow-x-auto">
              <pre>{storageRulesSnippet}</pre>
            </div>
          </div>

          {/* Storage Architecture Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              Где физически хранятся файлы:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-semibold block text-[11px]">🎤 Голосовые аудиосообщения</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  Bucket: <span className="text-slate-300">w10mmesseger.firebasestorage.app</span><br/>
                  Папка: <span className="text-blue-300">/voices/[timestamp]_voice.webm</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-blue-400 font-semibold block text-[11px]">📹 Видео и «Кружочки»</span>
                <p className="text-[11px] text-slate-400 font-mono">
                  Bucket: <span className="text-slate-300">w10mmesseger.firebasestorage.app</span><br/>
                  Папка: <span className="text-indigo-300">/videos/[timestamp]_video.mp4</span>
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              В базу данных <b>Cloud Firestore</b> (<code className="text-blue-300">chats/{'{chatId}'}/messages</code>) записывается не сам тяжелый файл, а <b>зашифрованный URL-адрес</b> для мгновенного стриминга и воспроизведения.
            </p>
          </div>

          {/* Step 2: Multi-layer fallbacks */}
          <div className="space-y-2">
            <span className="font-semibold text-white text-sm flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              2. Умный автоматический резервный режим (Fallback)
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Если в Firebase Storage отключены права или нет подключения к Google Cloud, мессенджер автоматически переключает голосовые сообщения в компактный Base64 Data URL, а видео — на защищенный шлюз доставки, поэтому сообщения никогда не теряются.
            </p>
          </div>

          {/* Step 3: Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <PlaySquare className="w-4 h-4 text-emerald-400" />
                Встроенный видеоплеер
              </div>
              <p className="text-[11px] text-slate-400">
                Полноэкранный режим, перемотка, регулировка звука, таймлайн и поддержка Picture-in-Picture.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <FileVideo className="w-4 h-4 text-amber-400" />
                Кружочки и Заметки
              </div>
              <p className="text-[11px] text-slate-400">
                Запись коротких видеосообщений в кружочке (как в Telegram) прямо с фронтальной или веб-камеры.
              </p>
            </div>
          </div>

          {/* Interactive Test Upload */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                Тест загрузки видео
              </div>
              <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md shadow-blue-600/20">
                {isTesting ? 'Загрузка...' : 'Выбрать видео для теста'}
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  disabled={isTesting}
                  onChange={handleTestUpload}
                />
              </label>
            </div>
            {testStatus && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                {testStatus}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-blue-500/20 active:scale-95"
          >
            Понятно, закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
