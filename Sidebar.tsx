import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  LogOut, 
  Search, 
  Video, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Sparkles,
  HelpCircle,
  Pin
} from 'lucide-react';
import { sounds } from '../services/soundEffects';

interface SidebarProps {
  currentUser: any;
  userProfileData: any;
  chats: any[];
  activeChatId: string | null;
  onSelectChat: (chatId: string, partner: any) => void;
  onOpenNewChat: () => void;
  onOpenMyProfile: () => void;
  onOpenVideoSetup: () => void;
  onSignOut: () => void;
  onDeleteChat: (chatId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  userProfileData,
  chats,
  activeChatId,
  onSelectChat,
  onOpenNewChat,
  onOpenMyProfile,
  onOpenVideoSetup,
  onSignOut,
  onDeleteChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const toggleSound = () => {
    const next = !isMuted;
    sounds.setMuted(next);
    setIsMuted(next);
  };

  const filteredChats = chats.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (c.partner.displayName && c.partner.displayName.toLowerCase().includes(term)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(term))
    );
  });

  const formatChatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-800/80 flex flex-col bg-slate-900/70 backdrop-blur-md z-10 h-full">
      
      {/* Top Header: Current User */}
      <div 
        onClick={onOpenMyProfile}
        className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 cursor-pointer hover:bg-slate-800/50 transition"
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="relative flex-shrink-0">
            <img
              src={userProfileData?.photoURL || currentUser?.photoURL || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/40"
            />
            <div className="w-3 h-3 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-slate-900" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-semibold text-xs text-white truncate">
              {userProfileData?.displayName || currentUser?.displayName || 'Пользователь'}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {userProfileData?.email || currentUser?.email}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              isMuted ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200 bg-slate-800'
            }`}
            title={isMuted ? 'Звук выключен' : 'Звук включен'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Video Setup Guide Button */}
          <button
            onClick={onOpenVideoSetup}
            className="w-8 h-8 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 flex items-center justify-center transition border border-blue-500/30"
            title="Настройка видео & Инструкция"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Profile Settings */}
          <button
            onClick={onOpenMyProfile}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            title="Профиль"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center transition"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/50 bg-slate-900/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск диалогов..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Chats Title Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Сообщения
        </span>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
          {chats.length}
        </span>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-64">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3 text-slate-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-400">Нет активных чатов</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Нажмите кнопку «+» внизу, чтобы найти собеседника и начать диалог.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id, chat.partner)}
                className={`p-3 flex items-center space-x-3 cursor-pointer transition border-b border-slate-800/30 hover:bg-slate-800/40 ${
                  isActive ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={chat.partner.photoURL || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
                    alt={chat.partner.displayName}
                    className="w-12 h-12 rounded-full object-cover border border-slate-700/60"
                  />
                  {chat.partner.isOnline && (
                    <div className="w-3 h-3 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-slate-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-xs text-white truncate">
                      {chat.partner.displayName}
                    </h4>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatChatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {chat.lastMessage || 'Сообщений пока нет'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add New Chat Button */}
      <div className="p-4 border-t border-slate-800/60 flex items-center justify-between bg-slate-900/60">
        <button
          onClick={onOpenVideoSetup}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Настройка видео</span>
        </button>

        <button
          onClick={onOpenNewChat}
          className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center transition transform hover:scale-105 active:scale-95"
          title="Новый чат"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
