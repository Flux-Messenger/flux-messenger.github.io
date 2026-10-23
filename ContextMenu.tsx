import React, { useEffect, useRef } from 'react';
import { 
  Reply, 
  Edit3, 
  Trash2, 
  Pin, 
  Copy, 
  ChevronRight, 
  Smile, 
  Share2 
} from 'lucide-react';

export interface ContextMenuTarget {
  id: string;
  type: 'message' | 'chat';
  text?: string;
  isMe?: boolean;
  senderName?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  isPinned?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onClose: () => void;
  onReaction: (emoji: string) => void;
  onOpenStickerMenu: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin?: () => void;
  onCopy?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  target,
  onClose,
  onReaction,
  onOpenStickerMenu,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onCopy
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or escape
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust coordinates so menu does not overflow viewport
  const safeX = Math.min(Math.max(10, x), window.innerWidth - 240);
  const safeY = Math.min(Math.max(10, y), window.innerHeight - 300);

  const quickReactions = ['👍', '❤️', '😂', '🎉', '🔥', '🚀'];

  return (
    <div 
      ref={menuRef}
      style={{ left: safeX, top: safeY }}
      className="fixed z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Reaction Pill with Arrow Button on the right */}
      {target.type === 'message' && (
        <div className="mb-1.5 flex items-center gap-1.5 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-2.5 py-1.5 shadow-2xl">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              className="text-lg hover:scale-130 active:scale-95 transition transform px-1"
              title={`Реакция ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          {/* THE ARROW BUTTON REQUESTED BY THE USER TO EXPAND 1000+ STICKERS */}
          <button
            onClick={onOpenStickerMenu}
            className="w-7 h-7 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white flex items-center justify-center transition transform hover:scale-110 active:scale-90 ml-1 border border-blue-500/30 shadow-sm group"
            title="Открыть тысячи стикеров и эмодзи"
          >
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {/* Main Context Menu Body */}
      <div className="w-52 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 flex flex-col space-y-0.5 text-xs text-slate-200">
        
        {target.type === 'message' && (
          <>
            <button
              onClick={onReply}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 rounded-xl transition w-full text-left font-medium"
            >
              <Reply className="w-4 h-4 text-blue-400" />
              <span>Ответить</span>
            </button>

            {onCopy && target.text && (
              <button
                onClick={onCopy}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 rounded-xl transition w-full text-left font-medium"
              >
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Копировать текст</span>
              </button>
            )}

            {onTogglePin && (
              <button
                onClick={onTogglePin}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 rounded-xl transition w-full text-left font-medium"
              >
                <Pin className={`w-4 h-4 ${target.isPinned ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                <span>{target.isPinned ? 'Открепить' : 'Закрепить'}</span>
              </button>
            )}

            {target.isMe && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 rounded-xl transition w-full text-left font-medium"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Редактировать</span>
              </button>
            )}

            <button
              onClick={onOpenStickerMenu}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 rounded-xl transition w-full text-left font-medium"
            >
              <Smile className="w-4 h-4 text-orange-400" />
              <span>Все стикеры и реакции</span>
            </button>

            <div className="border-t border-slate-700/60 my-1"></div>

            <button
              onClick={onDelete}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/20 text-red-400 rounded-xl transition w-full text-left font-medium"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Удалить сообщение</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
