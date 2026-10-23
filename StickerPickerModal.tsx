import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Smile, 
  Heart, 
  Flame, 
  Dog, 
  Cat, 
  Gamepad2, 
  Utensils, 
  Compass, 
  Lightbulb, 
  Layers
} from 'lucide-react';
import { 
  STICKER_PACKS, 
  EMOJI_CATEGORIES, 
  StickerItem, 
  searchStickersAndEmojis 
} from '../data/stickers';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: StickerItem) => void;
  targetMessageId?: string | null;
  mode?: 'reaction' | 'send';
}

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  onSelectSticker,
  targetMessageId,
  mode = 'reaction'
}) => {
  const [activeTab, setActiveTab] = useState<string>('all_stickers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'reaction' | 'send'>(mode);

  // Sync mode if changed from props
  React.useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchStickersAndEmojis(searchQuery);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    onClose();
  };

  const handleStickerClick = (sticker: StickerItem) => {
    if (currentMode === 'send') {
      onSelectSticker(sticker);
    } else {
      // If in reaction mode, react with the sticker's emoji/icon
      onSelectEmoji(sticker.emoji || '✨');
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl h-[560px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {currentMode === 'reaction' ? 'Каталог реакций и стикеров' : 'Выбор стикера для отправки'}
              </h3>
              <p className="text-[11px] text-slate-400">Тысячи стикеров и эмодзи</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {targetMessageId && (
              <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCurrentMode('reaction')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    currentMode === 'reaction'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Реакция
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMode('send')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    currentMode === 'send'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  В чат
                </button>
              </div>
            )}

            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск среди тысячи стикеров (кот, огонь, смех, любовь...)"
              className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        {!searchQuery && (
          <div className="px-3 py-2 border-b border-slate-800/50 bg-slate-900/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab('all_stickers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'all_stickers'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Стикеры</span>
            </button>

            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === cat.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* SEARCH RESULTS VIEW */}
          {searchQuery && searchResults && (
            <div className="space-y-4">
              {searchResults.stickers.length === 0 && searchResults.emojis.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Ничего не найдено по запросу «{searchQuery}»
                </div>
              ) : (
                <>
                  {searchResults.stickers.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Найденные стикеры ({searchResults.stickers.length})
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {searchResults.stickers.map((stk) => (
                          <button
                            key={stk.id}
                            onClick={() => handleStickerClick(stk)}
                            className="p-2.5 rounded-2xl bg-slate-800/50 hover:bg-blue-600/20 border border-slate-700/50 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1.5 transition transform hover:scale-110 active:scale-95 group"
                          >
                            <span className="text-3xl filter drop-shadow group-hover:scale-110 transition">{stk.emoji}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-full group-hover:text-white">{stk.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.emojis.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Эмодзи ({searchResults.emojis.length})
                      </span>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {searchResults.emojis.map((em, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleEmojiClick(em.emoji)}
                            title={em.name}
                            className="w-11 h-11 rounded-2xl bg-slate-800/40 hover:bg-slate-700/80 flex items-center justify-center text-2xl transition transform hover:scale-125 active:scale-95"
                          >
                            {em.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* NORMAL CATEGORY VIEW */}
          {!searchQuery && activeTab === 'all_stickers' && (
            <div className="space-y-6">
              {STICKER_PACKS.map((pack) => (
                <div key={pack.id} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-semibold text-xs border-b border-slate-800 pb-1.5">
                    <span className="text-base">{pack.icon}</span>
                    <span>{pack.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({pack.stickers.length})</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                    {pack.stickers.map((stk) => (
                      <button
                        key={stk.id}
                        onClick={() => handleStickerClick(stk)}
                        className="p-3 rounded-2xl bg-slate-800/40 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/40 flex flex-col items-center justify-center gap-1.5 transition transform hover:scale-105 active:scale-95 group shadow-sm"
                      >
                        <span className="text-3xl filter drop-shadow group-hover:scale-110 transition">{stk.emoji}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-full group-hover:text-blue-300 font-medium">
                          {stk.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searchQuery && activeTab !== 'all_stickers' && (
            <div>
              {(() => {
                const cat = EMOJI_CATEGORIES.find((c) => c.id === activeTab);
                if (!cat) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs border-b border-slate-800 pb-2">
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({cat.emojis.length})</span>
                    </div>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 gap-2">
                      {cat.emojis.map((em, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiClick(em.emoji)}
                          title={em.name}
                          className="w-11 h-11 rounded-2xl bg-slate-800/30 hover:bg-slate-700/80 flex items-center justify-center text-2xl transition transform hover:scale-125 active:scale-95 shadow-sm"
                        >
                          {em.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-5 py-2.5 border-t border-slate-800/80 bg-slate-900/90 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span>Нажмите на любой стикер или эмодзи</span>
          <span className="text-slate-500">Flux Messenger Ultra</span>
        </div>

      </div>
    </div>
  );
};
