import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  User 
} from './services/firebase';
import { webrtc, CallState } from './services/webrtc';
import { sounds } from './services/soundEffects';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { AuthModal } from './components/AuthModal';
import { CallOverlay } from './components/CallOverlay';
import { StickerPickerModal } from './components/StickerPickerModal';
import { VideoSetupModal } from './components/VideoSetupModal';
import { ProfileModal } from './components/ProfileModal';
import { PartnerProfileModal } from './components/PartnerProfileModal';
import { NewChatModal } from './components/NewChatModal';
import { StickerItem } from './data/stickers';
import { Send, MessageSquare } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfileData, setUserProfileData] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isPartnerTyping, setIsPartnerTyping] = useState<boolean>(false);
  const [partnerPresence, setPartnerPresence] = useState<{ isOnline?: boolean; lastSeen?: any }>({});

  // WebRTC Call State
  const [callState, setCallState] = useState<CallState>('idle');
  const [callPartnerInfo, setCallPartnerInfo] = useState<{
    name: string;
    photo: string;
    isVideo?: boolean;
    incomingCallId?: string | null;
  }>({
    name: '',
    photo: '',
    isVideo: false,
    incomingCallId: null
  });

  // Modals state
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [stickerModalTargetMsgId, setStickerModalTargetMsgId] = useState<string | null>(null);
  const [stickerModalMode, setStickerModalMode] = useState<'reaction' | 'send'>('send');
  const [isVideoSetupOpen, setIsVideoSetupOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPartnerProfileOpen, setIsPartnerProfileOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // Lightbox from partner modal
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  // References for unsubs
  const chatsUnsubRef = useRef<(() => void) | null>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const callUnsubRef = useRef<(() => void) | null>(null);
  const typingUnsubRef = useRef<(() => void) | null>(null);
  const partnerPresenceUnsubRef = useRef<(() => void) | null>(null);
  const typingTimerRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  // 1. Auth & Profile Sync
  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await syncUserProfile(user);
        listenToUserProfile(user.uid);
        listenToUserChats(user.uid);
        listenToGlobalIncomingCalls(user.uid);
      } else {
        setCurrentUser(null);
        setUserProfileData(null);
        setChats([]);
        setActiveChatId(null);
        setActivePartner(null);
        setMessages([]);

        chatsUnsubRef.current?.();
        messagesUnsubRef.current?.();
        profileUnsubRef.current?.();
        callUnsubRef.current?.();
        typingUnsubRef.current?.();
      }
    });

    return () => {
      authUnsub();
      chatsUnsubRef.current?.();
      messagesUnsubRef.current?.();
      profileUnsubRef.current?.();
      callUnsubRef.current?.();
      typingUnsubRef.current?.();
    };
  }, []);

  // Listen to WebRTC Manager State
  useEffect(() => {
    webrtc.setCallbacks((state, details) => {
      setCallState(state);
      if (details?.error) {
        alert(details.error);
      }
    }, () => {});
  }, []);

  const syncUserProfile = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const defaultPhoto = `https://placehold.co/100x100/3b82f6/ffffff?text=${(user.displayName || user.email || 'U')[0].toUpperCase()}`;
      const googlePhoto = user.photoURL || defaultPhoto;

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Пользователь',
          email: user.email,
          photoURL: googlePhoto,
          googlePhotoURL: googlePhoto,
          defaultPhotoURL: defaultPhoto,
          bio: 'Всем привет! Я использую Flux Messenger Ultra.',
          lastSeen: serverTimestamp()
        });
      } else {
        await updateDoc(userRef, {
          lastSeen: serverTimestamp(),
          googlePhotoURL: googlePhoto
        });
      }
    } catch (e) {
      console.warn('Sync profile error:', e);
    }
  };

  const listenToUserProfile = (uid: string) => {
    profileUnsubRef.current?.();
    profileUnsubRef.current = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        setUserProfileData(snap.data());
      }
    });
  };

  // 2. Real-time Chats list
  const listenToUserChats = (uid: string) => {
    chatsUnsubRef.current?.();
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', uid));
    chatsUnsubRef.current = onSnapshot(q, async (snapshot) => {
      const list: any[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const partnerId = data.participants.find((pId: string) => pId !== uid);
        let partnerData: any = {
          uid: partnerId,
          displayName: 'Пользователь',
          photoURL: 'https://placehold.co/100x100/3b82f6/ffffff?text=U'
        };
        if (partnerId) {
          const pDoc = await getDoc(doc(db, 'users', partnerId));
          if (pDoc.exists()) partnerData = pDoc.data();
        }
        list.push({
          id: d.id,
          partner: partnerData,
          lastMessage: data.lastMessage || 'Сообщений пока нет',
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
        });
      }
      list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setChats(list);
    });
  };

  // 3. Listen to incoming WebRTC calls (FIXED TO DETECT CALLS FROM PHONE TO COMPUTER)
  const listenToGlobalIncomingCalls = (uid: string) => {
    callUnsubRef.current?.();
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', uid),
      where('status', '==', 'ringing')
    );

    callUnsubRef.current = onSnapshot(callsQuery, async (snapshot) => {
      const incoming = snapshot.docs.find((d) => d.data().callerId !== uid);
      if (incoming && callState === 'idle') {
        const callData = incoming.data();
        let callerName = callData.callerName || 'Собеседник';
        let callerPhoto = callData.callerPhoto || 'https://placehold.co/150x150/3b82f6/ffffff?text=U';

        try {
          const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
          if (callerDoc.exists()) {
            callerName = callerDoc.data().displayName || callerName;
            callerPhoto = callerDoc.data().photoURL || callerPhoto;
          }
        } catch (e) {}

        setCallPartnerInfo({
          name: callerName,
          photo: callerPhoto,
          isVideo: callData.isVideoCall || false,
          incomingCallId: incoming.id
        });
        setCallState('incoming');
        sounds.startIncomingRingtone();
      } else if (!incoming && callState === 'incoming') {
        sounds.stopRingtone();
        setCallState('idle');
      }
    });
  };

  // Heartbeat presence update for current user
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const markOnline = async () => {
      try {
        await updateDoc(doc(db, 'users', uid), {
          isOnline: true,
          lastSeen: serverTimestamp()
        });
      } catch (e) {}
    };

    const markOffline = async () => {
      try {
        await updateDoc(doc(db, 'users', uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      } catch (e) {}
    };

    markOnline();
    const heartbeat = setInterval(markOnline, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markOnline();
      } else {
        markOffline();
      }
    };

    const handleBeforeUnload = () => {
      markOffline();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      markOffline();
    };
  }, [currentUser]);

  // 4. Select active chat and listen to messages & presence
  const handleSelectChat = (chatId: string, partner: any) => {
    setActiveChatId(chatId);
    setActivePartner(partner);
    listenToMessages(chatId);
    listenToTyping(chatId, partner.uid);
    listenToPartnerPresence(partner.uid);
  };

  const listenToPartnerPresence = (partnerUid: string) => {
    partnerPresenceUnsubRef.current?.();
    partnerPresenceUnsubRef.current = onSnapshot(doc(db, 'users', partnerUid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPartnerPresence({
          isOnline: d.isOnline,
          lastSeen: d.lastSeen
        });
      }
    });
  };

  const listenToMessages = (chatId: string) => {
    messagesUnsubRef.current?.();
    const msgsQuery = query(collection(db, 'chats', chatId, 'messages'));
    
    messagesUnsubRef.current = onSnapshot(msgsQuery, async (snapshot) => {
      const msgs: any[] = [];
      const unreadIds: string[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        msgs.push({ id: d.id, ...data });

        if (currentUser && data.senderId !== currentUser.uid && data.status !== 'read') {
          unreadIds.push(d.id);
        }
      });

      // Mark unread as read
      for (const id of unreadIds) {
        try {
          await updateDoc(doc(db, 'chats', chatId, 'messages', id), { status: 'read' });
        } catch (e) {}
      }

      msgs.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tA - tB;
      });

      setMessages(msgs);
    });
  };

  const listenToTyping = (chatId: string, partnerUid: string) => {
    typingUnsubRef.current?.();
    typingUnsubRef.current = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      if (snap.exists()) {
        const typingMap = snap.data().typing || {};
        setIsPartnerTyping(typingMap[partnerUid] === true);
      }
    });
  };

  // Send Typing Heartbeat
  const handleTypingHeartbeat = async () => {
    if (!activeChatId || !currentUser) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      try {
        await updateDoc(doc(db, 'chats', activeChatId), {
          [`typing.${currentUser.uid}`]: true
        });
      } catch (e) {}
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'chats', activeChatId), {
          [`typing.${currentUser.uid}`]: false
        });
      } catch (e) {}
    }, 2500);
  };

  // 5. Send message action
  const handleSendMessage = async (msgData: {
    text?: string;
    type: 'text' | 'image' | 'video' | 'video_note' | 'voice' | 'sticker';
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    stickerEmoji?: string;
    duration?: number;
    replyTo?: any;
  }) => {
    if (!activeChatId || !currentUser) return;

    try {
      await updateDoc(doc(db, 'chats', activeChatId), {
        [`typing.${currentUser.uid}`]: false
      });
    } catch (e) {}

    const payload = {
      ...msgData,
      senderId: currentUser.uid,
      status: 'sent',
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'chats', activeChatId, 'messages'), payload);

    let summary = msgData.text || '';
    if (msgData.type === 'image') summary = '[Фотография]';
    if (msgData.type === 'video') summary = '[Видеозапись]';
    if (msgData.type === 'video_note') summary = '[Кружочек]';
    if (msgData.type === 'voice') summary = '[Голосовое сообщение]';
    if (msgData.type === 'sticker') summary = `Стикер ${msgData.stickerEmoji || '🐱'}`;

    await updateDoc(doc(db, 'chats', activeChatId), {
      lastMessage: summary,
      updatedAt: serverTimestamp()
    });

    sounds.playMessageSent();
  };

  // Edit message
  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!activeChatId) return;
    await updateDoc(doc(db, 'chats', activeChatId, 'messages', msgId), {
      text: newText,
      edited: true
    });
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChatId) return;
    await deleteDoc(doc(db, 'chats', activeChatId, 'messages', msgId));
  };

  // Toggle Reaction on message
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!activeChatId || !currentUser) return;
    const msgRef = doc(db, 'chats', activeChatId, 'messages', msgId);
    try {
      const snap = await getDoc(msgRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const reactions = data.reactions || {};
      const usersForEmoji = (reactions[emoji] || []) as string[];

      if (usersForEmoji.includes(currentUser.uid)) {
        const nextUsers = usersForEmoji.filter((id) => id !== currentUser.uid);
        if (nextUsers.length === 0) delete reactions[emoji];
        else reactions[emoji] = nextUsers;
      } else {
        // remove my reaction from any other emoji to keep clean
        for (const k in reactions) {
          reactions[k] = reactions[k].filter((id: string) => id !== currentUser.uid);
          if (reactions[k].length === 0) delete reactions[k];
        }
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji].push(currentUser.uid);
      }

      await updateDoc(msgRef, { reactions });
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Pin Message
  const handleTogglePinMessage = async (msgId: string, isPinned: boolean) => {
    if (!activeChatId) return;
    // Unpin other messages if pinning this one
    if (isPinned) {
      for (const m of messages) {
        if (m.isPinned && m.id !== msgId) {
          await updateDoc(doc(db, 'chats', activeChatId, 'messages', m.id), { isPinned: false });
        }
      }
    }
    await updateDoc(doc(db, 'chats', activeChatId, 'messages', msgId), { isPinned });
  };

  // Start Audio Call (Fixed phone-to-computer logic)
  const handleStartAudioCall = async () => {
    if (!activePartner || !currentUser) return;
    setCallPartnerInfo({
      name: activePartner.displayName,
      photo: activePartner.photoURL,
      isVideo: false
    });
    await webrtc.startCall({
      callerId: currentUser.uid,
      callerName: userProfileData?.displayName || currentUser.displayName || 'Пользователь',
      callerPhoto: userProfileData?.photoURL || currentUser.photoURL || '',
      receiverId: activePartner.uid,
      partnerName: activePartner.displayName,
      partnerPhoto: activePartner.photoURL,
      isVideo: false
    });
  };

  // Start Video Call
  const handleStartVideoCall = async () => {
    if (!activePartner || !currentUser) return;
    setCallPartnerInfo({
      name: activePartner.displayName,
      photo: activePartner.photoURL,
      isVideo: true
    });
    await webrtc.startCall({
      callerId: currentUser.uid,
      callerName: userProfileData?.displayName || currentUser.displayName || 'Пользователь',
      callerPhoto: userProfileData?.photoURL || currentUser.photoURL || '',
      receiverId: activePartner.uid,
      partnerName: activePartner.displayName,
      partnerPhoto: activePartner.photoURL,
      isVideo: true
    });
  };

  // Answer Incoming Call (Fixed callerCandidates synchronization!)
  const handleAnswerIncomingCall = async (callId: string, isVideo?: boolean) => {
    await webrtc.answerCall(callId, isVideo);
  };

  // Hang up
  const handleHangUpCall = async () => {
    await webrtc.hangUp();
    sounds.stopRingtone();
    setCallState('idle');
  };

  // Save profile edits
  const handleSaveProfile = async (name: string, bio: string, photoURL: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName: name,
      bio,
      photoURL
    });
  };

  // Start chat with a user from search modal
  const handleStartChatWithUser = async (partnerUser: any) => {
    if (!currentUser) return;
    // Check if chat already exists
    const existing = chats.find((c) => c.partner.uid === partnerUser.uid);
    if (existing) {
      handleSelectChat(existing.id, existing.partner);
      return;
    }

    // Create new chat
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participants: [currentUser.uid, partnerUser.uid],
      lastMessage: '',
      updatedAt: serverTimestamp()
    });
    handleSelectChat(newChatRef.id, partnerUser);
  };

  // Delete chat
  const handleDeleteChat = async () => {
    if (!activeChatId) return;
    if (confirm('Вы уверены, что хотите удалить этот чат?')) {
      const chatIdToDelete = activeChatId;
      setActiveChatId(null);
      setActivePartner(null);
      await deleteDoc(doc(db, 'chats', chatIdToDelete));
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* AUTH MODAL IF NOT LOGGED IN */}
      <AuthModal isOpen={!currentUser} />

      {/* MAIN APP CONTAINER */}
      {currentUser && (
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* SIDEBAR (CHATS LIST) */}
          <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0 h-full`}>
            <Sidebar
              currentUser={currentUser}
              userProfileData={userProfileData}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onOpenNewChat={() => setIsNewChatOpen(true)}
              onOpenMyProfile={() => setIsProfileModalOpen(true)}
              onOpenVideoSetup={() => setIsVideoSetupOpen(true)}
              onSignOut={() => signOut(auth)}
              onDeleteChat={handleDeleteChat}
            />
          </div>

          {/* CHAT VIEW (ACTIVE CHAT) OR PLACEHOLDER */}
          <div className={`${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
            {activeChatId && activePartner ? (
              <ChatView
                chatId={activeChatId}
                partner={activePartner}
                currentUser={currentUser}
                messages={messages}
                isPartnerTyping={isPartnerTyping}
                partnerPresence={partnerPresence}
                onSendMessage={handleSendMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onToggleReaction={handleToggleReaction}
                onTogglePinMessage={handleTogglePinMessage}
                onStartAudioCall={handleStartAudioCall}
                onStartVideoCall={handleStartVideoCall}
                onOpenPartnerProfile={() => setIsPartnerProfileOpen(true)}
                onDeleteChat={handleDeleteChat}
                onBackMobile={() => {
                  setActiveChatId(null);
                  setActivePartner(null);
                }}
                onOpenVideoSetup={() => setIsVideoSetupOpen(true)}
                onOpenStickerModalForTarget={(msgId) => {
                  setStickerModalTargetMsgId(msgId);
                  setStickerModalMode('reaction');
                  setIsStickerModalOpen(true);
                }}
                onOpenStickerModalForInput={() => {
                  setStickerModalTargetMsgId(null);
                  setStickerModalMode('send');
                  setIsStickerModalOpen(true);
                }}
                onTyping={handleTypingHeartbeat}
              />
            ) : (
              /* No chat selected placeholder */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 bg-slate-950">
                <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-blue-500 shadow-xl shadow-blue-500/10">
                  <Send className="w-9 h-9" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 mb-1">
                  Flux Messenger Ultra
                </h3>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
                  Выберите диалог из списка слева или нажмите «+», чтобы начать общение с видео, звонками и стикерами.
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Найти собеседника
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* WEBRTC CALL OVERLAY */}
      <CallOverlay
        callState={callState}
        partnerName={callPartnerInfo.name}
        partnerPhoto={callPartnerInfo.photo}
        isVideoCall={callPartnerInfo.isVideo}
        incomingCallId={callPartnerInfo.incomingCallId}
        onHangUp={handleHangUpCall}
        onAnswer={handleAnswerIncomingCall}
      />

      {/* FULL STICKER & EMOJI PICKER MODAL (1000+ items) */}
      <StickerPickerModal
        isOpen={isStickerModalOpen}
        onClose={() => {
          setIsStickerModalOpen(false);
          setStickerModalTargetMsgId(null);
        }}
        targetMessageId={stickerModalTargetMsgId}
        mode={stickerModalMode}
        onSelectEmoji={(emoji) => {
          if (stickerModalTargetMsgId) {
            handleToggleReaction(stickerModalTargetMsgId, emoji);
          } else {
            handleSendMessage({
              type: 'sticker',
              stickerEmoji: emoji
            });
          }
        }}
        onSelectSticker={(sticker: StickerItem) => {
          handleSendMessage({
            type: 'sticker',
            stickerEmoji: sticker.emoji || '✨'
          });
        }}
      />

      {/* VIDEO SETUP & CONFIGURATION GUIDE MODAL */}
      <VideoSetupModal
        isOpen={isVideoSetupOpen}
        onClose={() => setIsVideoSetupOpen(false)}
      />

      {/* CURRENT USER PROFILE MODAL */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        userProfileData={userProfileData}
        onSaveProfile={handleSaveProfile}
      />

      {/* PARTNER USER PROFILE MODAL */}
      <PartnerProfileModal
        isOpen={isPartnerProfileOpen}
        onClose={() => setIsPartnerProfileOpen(false)}
        partner={activePartner}
        onStartAudioCall={handleStartAudioCall}
        onStartVideoCall={handleStartVideoCall}
        onOpenImageModal={(url) => setImageModalUrl(url)}
      />

      {/* NEW CHAT MODAL */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUserId={currentUser?.uid || ''}
        onStartChat={handleStartChatWithUser}
      />

      {/* IMAGE LIGHTBOX MODAL */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
        >
          <img
            src={imageModalUrl}
            alt="Просмотр"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
          />
        </div>
      )}

    </div>
  );
}
