import React from 'react';
import { X, Phone, Video, Mail, ShieldCheck, Calendar, Info } from 'lucide-react';

interface PartnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: any;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onOpenImageModal: (url: string) => void;
}

export const PartnerProfileModal: React.FC<PartnerProfileModalProps> = ({
  isOpen,
  onClose,
  partner,
  onStartAudioCall,
  onStartVideoCall,
  onOpenImageModal
}) => {
  if (!isOpen || !partner) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <h3 className="font-bold text-white text-base">Информация о собеседнике</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-center">
          
          {/* Avatar with click to view */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => onOpenImageModal(partner.photoURL)}>
              <img
                src={partner.photoURL || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
                alt={partner.displayName}
                className="w-28 h-28 rounded-full object-cover border-4 border-slate-800 shadow-2xl group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium">
                Открыть фото
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">{partner.displayName || 'Пользователь'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{partner.email}</p>
          </div>

          {/* Quick Call Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                onClose();
                onStartAudioCall();
              }}
              className="flex-1 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>Аудиозвонок</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onStartVideoCall();
              }}
              className="flex-1 py-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Video className="w-4 h-4" />
              <span>Видеозвонок</span>
            </button>
          </div>

          {/* Bio card */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 text-left space-y-1">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Био
            </span>
            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {partner.bio || 'Информация отсутствует'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
