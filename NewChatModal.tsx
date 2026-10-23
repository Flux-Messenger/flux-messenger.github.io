import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquarePlus, User, Loader2 } from 'lucide-react';
import { db, collection, getDocs } from '../services/firebase';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onStartChat: (partner: any) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onStartChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      snap.forEach((d) => {
        if (d.id !== currentUserId) {
          list.push({ uid: d.id, ...d.data() });
        }
      });
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (u.displayName && u.displayName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md h-[500px] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-blue-400" />
            Новый чат
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3.5 border-b border-slate-800/60 bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Загрузка пользователей...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Пользователи не найдены
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.uid}
                onClick={() => {
                  onStartChat(user);
                  onClose();
                }}
                className="p-3 flex items-center justify-between rounded-2xl hover:bg-slate-800/60 cursor-pointer transition group"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={user.photoURL || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
                    alt={user.displayName}
                    className="w-11 h-11 rounded-full object-cover border border-slate-700/80 group-hover:border-blue-500 transition"
                  />
                  <div>
                    <div className="font-semibold text-xs text-white group-hover:text-blue-400 transition">
                      {user.displayName || 'Пользователь'}
                    </div>
                    <div className="text-[11px] text-slate-400">{user.email}</div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 group-hover:bg-blue-600 text-blue-400 group-hover:text-white flex items-center justify-center transition">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
