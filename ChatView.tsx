import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  ArrowLeft, 
  Paperclip, 
  Send, 
  Smile, 
  Mic, 
  Image as ImageIcon, 
  FileVideo, 
  Check, 
  CheckCheck, 
  Pin, 
  X, 
  Reply, 
  Sparkles,
  HelpCircle,
  Download,
  Play
} from 'lucide-react';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoNoteRecorderModal } from './VideoNoteRecorderModal';
import { ContextMenu, ContextMenuTarget } from './ContextMenu';
import { StickerItem } from '../data/stickers';
import { uploadImageFile, uploadVideoFile } from '../services/mediaUpload';
import { formatUserPresenceStatus } from '../utils/presence';

interface ChatViewProps {
  chatId: string;
  partner: any;
  currentUser: any;
  messages: any[];
  isPartnerTyping: boolean;
  partnerPresence?: { isOnline?: boolean; lastSeen?: any };
  onSendMessage: (data: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'video_note' | 'voice' | 'sticker';
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    stickerEmoji?: string;
    duration?: number;
    replyTo?: any;
  }) => Promise<void>;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onTogglePinMessage: (messageId: string, isPinned: boolean) => Promise<void>;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
  onOpenPartnerProfile: () => void;
  onDeleteChat: () => void;
  onBackMobile: () => void;
  onOpenVideoSetup: () => void;
  onOpenStickerModalForTarget: (messageId: string) => void;
  onOpenStickerModalForInput: () => void;
  onTyping: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chatId,
  partner,
  currentUser,
  messages,
  isPartnerTyping,
  partnerPresence,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePinMessage,
  onStartAudioCall,
  onStartVideoCall,
  onOpenPartnerProfile,
  onDeleteChat,
  onBackMobile,
  onOpenVideoSetup,
  onOpenStickerModalForTarget,
  onOpenStickerModalForInput,
  onTyping
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isVideoNoteModalOpen, setIsVideoNoteModalOpen] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);

  // Upload status
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Context Menu state
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);

  // Image Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Find pinned message
  const pinnedMessage = messages.find((m) => m.isPinned);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !editTarget) return;

    if (editTarget) {
      await onEditMessage(editTarget.id, inputText.trim());
      setEditTarget(null);
      setInputText('');
      return;
    }

    const text = inputText.trim();
    setInputText('');
    const currentReply = replyTarget;
    setReplyTarget(null);

    await onSendMessage({
      text,
      type: 'text',
      replyTo: currentReply
        ? {
            id: currentReply.id,
            text: currentReply.text || (currentReply.type === 'video' ? '[Видео]' : '[Картинка]'),
            senderName: currentReply.senderName
          }
        : undefined
    });
  };

  // Image attachment
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowAttachMenu(false);

    setUploadProgress(10);
    setUploadStatusText('Загрузка изображения...');
    try {
      const url = await uploadImageFile(file, (pct, msg) => {
        setUploadProgress(pct);
        setUploadStatusText(msg);
      });
      await onSendMessage({
        type: 'image',
        imageUrl: url,
        text: file.name
      });
    } catch (err: any) {
      alert('Ошибка при загрузке: ' + (err.message || 'Сбой сети'));
    } finally {
      setUploadProgress(null);
      setUploadStatusText('');
    }
  };

  // Video attachment
  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowAttachMenu(false);

    setUploadProgress(15);
    setUploadStatusText('Подготовка видео...');
    try {
      const res = await uploadVideoFile(file, file.name, (pct, msg) => {
        setUploadProgress(pct);
        setUploadStatusText(msg);
      });

      await onSendMessage({
        type: 'video',
        videoUrl: res.videoUrl,
        imageUrl: res.thumbnailUrl,
        text: file.name
      });
    } catch (err: any) {
      alert('Ошибка при отправке видео: ' + (err.message || 'Сбой сети'));
    } finally {
      setUploadProgress(null);
      setUploadStatusText('');
    }
  };

  // Handle right-click / context menu on message
  const handleMessageContextMenu = (e: React.MouseEvent, msg: any, isMe: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuTarget({
      id: msg.id,
      type: 'message',
      text: msg.text,
      isMe,
      senderName: isMe ? 'Вы' : partner.displayName,
      isPinned: msg.isPinned,
      imageUrl: msg.imageUrl,
      videoUrl: msg.videoUrl
    });
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full relative overflow-hidden">
      
      {/* 1. TOP HEADER */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between flex-shrink-0 relative z-30">
        
        {/* Partner Info */}
        <div 
          onClick={onOpenPartnerProfile}
          className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition flex-1 min-w-0 pr-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBackMobile();
            }}
            className="md:hidden w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mr-1 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="relative shrink-0">
            <img
              src={partner.photoURL || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
              alt={partner.displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            {(() => {
              const lastSeenDate = partnerPresence?.lastSeen?.toDate 
                ? partnerPresence.lastSeen.toDate() 
                : (partnerPresence?.lastSeen ? new Date(partnerPresence.lastSeen) : null);
              const pStatus = formatUserPresenceStatus(isPartnerTyping, partnerPresence?.isOnline, lastSeenDate);
              return pStatus.isOnline ? (
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute bottom-0 right-0 border-2 border-slate-900" />
              ) : null;
            })()}
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-xs text-white truncate">
              {partner.displayName || 'Собеседник'}
            </h2>
            <p className="text-[11px] truncate">
              {(() => {
                const lastSeenDate = partnerPresence?.lastSeen?.toDate 
                  ? partnerPresence.lastSeen.toDate() 
                  : (partnerPresence?.lastSeen ? new Date(partnerPresence.lastSeen) : null);
                const pStatus = formatUserPresenceStatus(isPartnerTyping, partnerPresence?.isOnline, lastSeenDate);

                if (pStatus.isTyping) {
                  return <span className="text-blue-400 font-medium animate-pulse">печатает...</span>;
                }
                if (pStatus.isOnline) {
                  return <span className="text-emerald-400 font-medium">в сети</span>;
                }
                return <span className="text-slate-400">{pStatus.text}</span>;
              })()}
            </p>
          </div>
        </div>

        {/* Action Buttons: Audio Call, Video Call, Header Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Audio Call Button */}
          <button
            onClick={onStartAudioCall}
            className="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition"
            title="Аудиозвонок"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call Button */}
          <button
            onClick={onStartVideoCall}
            className="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center transition"
            title="Видеозвонок"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* More Header Options Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHeaderMenu(!showHeaderMenu);
              }}
              className="w-9 h-9 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showHeaderMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-52 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-50 text-xs"
              >
                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    onOpenPartnerProfile();
                  }}
                  className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-slate-700/80 flex items-center gap-2.5 transition"
                >
                  <Smile className="w-4 h-4 text-blue-400" />
                  <span>Профиль собеседника</span>
                </button>

                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    onOpenVideoSetup();
                  }}
                  className="w-full text-left px-4 py-2.5 text-slate-200 hover:bg-slate-700/80 flex items-center gap-2.5 transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Настройка отправки видео</span>
                </button>

                <div className="border-t border-slate-700/60 my-1" />

                <button
                  onClick={() => {
                    setShowHeaderMenu(false);
                    onDeleteChat();
                  }}
                  className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-red-500/20 flex items-center gap-2.5 transition"
                >
                  <X className="w-4 h-4 text-red-400" />
                  <span>Удалить чат</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 2. PINNED MESSAGE BAR */}
      {pinnedMessage && (
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between z-20 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 overflow-hidden mr-2">
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <div className="overflow-hidden truncate">
              <span className="font-semibold text-amber-400 mr-1.5 text-[11px]">Закреплено:</span>
              <span className="text-slate-300 truncate text-[11px]">
                {pinnedMessage.text || (pinnedMessage.type === 'video' ? 'Видеофайл' : 'Вложение')}
              </span>
            </div>
          </div>
          <button
            onClick={() => onTogglePinMessage(pinnedMessage.id, false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Открепить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. UPLOAD PROGRESS BAR */}
      {uploadProgress !== null && (
        <div className="bg-blue-600/20 border-b border-blue-500/40 px-4 py-2 flex items-center justify-between text-xs text-blue-300 z-20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>{uploadStatusText}</span>
          </div>
          <span className="font-mono font-semibold">{uploadProgress}%</span>
        </div>
      )}

      {/* 4. MESSAGES CONTAINER */}
      <div 
        onClick={() => {
          setShowHeaderMenu(false);
          setShowAttachMenu(false);
        }}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/70 relative z-10"
      >
        {messages.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 text-blue-500/60">
              <Smile className="w-6 h-6" />
            </div>
            <p className="font-medium text-slate-400">Сообщений пока нет</p>
            <p className="text-[11px] text-slate-500 mt-1">Отправьте сообщение, видео или стикер первым!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            const timeStr = msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  onContextMenu={(e) => handleMessageContextMenu(e, msg, isMe)}
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md relative transition-transform duration-100 ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  {/* Pinned badge */}
                  {msg.isPinned && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-300 font-semibold mb-1">
                      <Pin className="w-3 h-3 fill-amber-300" />
                      <span>Закреплено</span>
                    </div>
                  )}

                  {/* Reply Quote preview */}
                  {msg.replyTo && (
                    <div className="mb-2 p-2 rounded-xl bg-slate-900/60 border-l-4 border-blue-400 text-xs overflow-hidden">
                      <div className="font-semibold text-blue-300 text-[10px] truncate">
                        {msg.replyTo.senderName}
                      </div>
                      <div className="text-slate-300 truncate text-[11px]">
                        {msg.replyTo.text}
                      </div>
                    </div>
                  )}

                  {/* 1. Image Message */}
                  {msg.type === 'image' && msg.imageUrl && (
                    <div 
                      onClick={() => setLightboxUrl(msg.imageUrl)}
                      className="overflow-hidden rounded-xl cursor-pointer mb-1 border border-slate-700/40"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Фото"
                        className="max-w-xs max-h-72 rounded-xl object-cover hover:scale-102 transition"
                      />
                    </div>
                  )}

                  {/* 2. Video Message */}
                  {msg.type === 'video' && msg.videoUrl && (
                    <div className="mb-1">
                      <CustomVideoPlayer 
                        src={msg.videoUrl} 
                        poster={msg.imageUrl} 
                      />
                    </div>
                  )}

                  {/* 3. Circular Video Note Message ("кружочек") */}
                  {msg.type === 'video_note' && msg.videoUrl && (
                    <div className="my-1">
                      <CustomVideoPlayer 
                        src={msg.videoUrl} 
                        isCircular={true} 
                      />
                    </div>
                  )}

                  {/* 4. Voice Audio Message */}
                  {msg.type === 'voice' && msg.audioUrl && (
                    <VoiceMessagePlayer 
                      src={msg.audioUrl} 
                      duration={msg.duration} 
                      isMe={isMe} 
                    />
                  )}

                  {/* 5. Sticker Message */}
                  {msg.type === 'sticker' && (
                    <div className="py-1">
                      <span className="text-5xl filter drop-shadow inline-block transform hover:scale-110 transition">
                        {msg.stickerEmoji || '🐱'}
                      </span>
                    </div>
                  )}

                  {/* 6. Text message */}
                  {msg.text && msg.type !== 'image' && msg.type !== 'video' && (
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Reactions List */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1">
                      {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => {
                        const count = users.length;
                        const hasMy = users.includes(currentUser.uid);
                        return (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleReaction(msg.id, emoji);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition active:scale-90 ${
                              hasMy
                                ? 'bg-blue-500/30 border border-blue-400 text-blue-200'
                                : 'bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] font-semibold">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Message info: timestamp, edited, status */}
                  <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] opacity-80">
                    {msg.edited && <span className="italic mr-0.5">(изм.)</span>}
                    <span className={isMe ? 'text-blue-200' : 'text-slate-400'}>{timeStr}</span>
                    {isMe && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300 inline" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-blue-200/80 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. REPLY / EDIT ACTION BAR */}
      {(replyTarget || editTarget) && (
        <div className="border-t border-slate-800 bg-slate-900/90 px-4 py-2 flex items-center justify-between border-l-4 border-l-blue-500 z-20">
          <div className="overflow-hidden mr-2">
            <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
              {editTarget ? 'Редактирование сообщения:' : `Ответ (${replyTarget?.senderName}):`}
            </div>
            <p className="text-xs text-slate-300 truncate max-w-md mt-0.5">
              {editTarget?.text || replyTarget?.text || '[Вложение]'}
            </p>
          </div>
          <button
            onClick={() => {
              setReplyTarget(null);
              setEditTarget(null);
              setInputText('');
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. INPUT BAR (OR VOICE RECORDER) */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex-shrink-0 relative z-20">
        {isRecordingVoice ? (
          <VoiceRecorder
            onSendVoice={async (audioUrl, duration) => {
              setIsRecordingVoice(false);
              await onSendMessage({
                type: 'voice',
                audioUrl,
                duration
              });
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <form onSubmit={handleSendText} className="flex items-center space-x-2 w-full mx-auto relative">
            
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              className="hidden"
              onChange={handleVideoFile}
            />

            {/* Attachments Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center transition shrink-0"
                title="Прикрепить файл"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {showAttachMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-200 hover:bg-slate-700/80 rounded-xl flex items-center gap-2.5 transition"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Отправить фото</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      videoInputRef.current?.click();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-200 hover:bg-slate-700/80 rounded-xl flex items-center gap-2.5 transition"
                  >
                    <FileVideo className="w-4 h-4 text-blue-400" />
                    <span>Отправить видеофайл</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      setIsVideoNoteModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-200 hover:bg-slate-700/80 rounded-xl flex items-center gap-2.5 transition"
                  >
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>Записать кружочек</span>
                  </button>

                  <div className="border-t border-slate-700/60 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachMenu(false);
                      onOpenVideoSetup();
                    }}
                    className="w-full text-left px-3.5 py-2 text-indigo-300 hover:bg-indigo-600/20 rounded-xl flex items-center gap-2.5 transition"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <span>Инструкция по видео</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sticker / Emoji Picker Button (Smile Icon) */}
            <button
              type="button"
              onClick={onOpenStickerModalForInput}
              className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center transition shrink-0"
              title="Стикеры и эмодзи"
            >
              <Smile className="w-5 h-5 text-orange-400" />
            </button>

            {/* Message Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                onTyping();
              }}
              placeholder={editTarget ? 'Измените текст...' : 'Напишите сообщение...'}
              className="flex-1 bg-slate-950/90 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />

            {/* Voice Record Button or Send Button */}
            {!inputText.trim() && !editTarget ? (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Circular Video note trigger */}
                <button
                  type="button"
                  onClick={() => setIsVideoNoteModalOpen(true)}
                  className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-2xl flex items-center justify-center transition shadow-md"
                  title="Кружочек (Видеозаметка)"
                >
                  <Video className="w-5 h-5" />
                </button>

                {/* Microphone trigger */}
                <button
                  type="button"
                  onClick={() => setIsRecordingVoice(true)}
                  className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-2xl flex items-center justify-center transition shadow-md"
                  title="Голосовое сообщение"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 transition transform active:scale-95 shrink-0"
                title="Отправить"
              >
                <Send className="w-5 h-5" />
              </button>
            )}

          </form>
        )}
      </div>

      {/* Circular Video Note Recorder Modal */}
      <VideoNoteRecorderModal
        isOpen={isVideoNoteModalOpen}
        onClose={() => setIsVideoNoteModalOpen(false)}
        onSendVideoNote={async (videoUrl, duration) => {
          await onSendMessage({
            type: 'video_note',
            videoUrl,
            duration
          });
        }}
      />

      {/* Message Context Menu */}
      {contextMenuPos && contextMenuTarget && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          target={contextMenuTarget}
          onClose={() => {
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onReaction={(emoji) => {
            onToggleReaction(contextMenuTarget.id, emoji);
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onOpenStickerMenu={() => {
            const targetId = contextMenuTarget.id;
            setContextMenuPos(null);
            setContextMenuTarget(null);
            onOpenStickerModalForTarget(targetId);
          }}
          onReply={() => {
            setReplyTarget(contextMenuTarget);
            setEditTarget(null);
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onEdit={() => {
            setEditTarget(contextMenuTarget);
            setReplyTarget(null);
            setInputText(contextMenuTarget.text || '');
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onDelete={() => {
            onDeleteMessage(contextMenuTarget.id);
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onTogglePin={() => {
            onTogglePinMessage(contextMenuTarget.id, !contextMenuTarget.isPinned);
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
          onCopy={() => {
            if (contextMenuTarget.text) {
              navigator.clipboard.writeText(contextMenuTarget.text);
            }
            setContextMenuPos(null);
            setContextMenuTarget(null);
          }}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-12 left-0 w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center shadow-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="absolute -top-12 right-0 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition"
              title="Скачать"
            >
              <Download className="w-4 h-4" />
            </a>
            <img
              src={lightboxUrl}
              alt="Увеличенное изображение"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}

    </div>
  );
};
