import React, { useState } from 'react';
import { X, Camera, RefreshCw, User, Mail, FileText, Check, Shield } from 'lucide-react';
import { uploadImageFile } from '../services/mediaUpload';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfileData: any;
  onSaveProfile: (name: string, bio: string, photoURL: string) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfileData,
  onSaveProfile
}) => {
  const [name, setName] = useState(userProfileData?.displayName || currentUser?.displayName || '');
  const [bio, setBio] = useState(userProfileData?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfileData?.photoURL || currentUser?.photoURL || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (userProfileData) {
      setName(userProfileData.displayName || '');
      setBio(userProfileData.bio || '');
      setAvatarUrl(userProfileData.photoURL || '');
    }
  }, [userProfileData]);

  if (!isOpen) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const url = await uploadImageFile(file);
      setAvatarUrl(url);
    } catch (e) {
      alert('Ошибка загрузки фотографии');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResetToGoogle = () => {
    const googlePic = userProfileData?.googlePhotoURL || currentUser?.photoURL || `https://placehold.co/100x100/3b82f6/ffffff?text=${(name || 'U')[0].toUpperCase()}`;
    setAvatarUrl(googlePic);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSaveProfile(name.trim(), bio.trim(), avatarUrl);
      onClose();
    } catch (e) {
      alert('Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Мой профиль
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Avatar edit */}
          <div className="flex flex-col items-center justify-center space-y-3 pb-2">
            <div className="relative group">
              <img
                src={avatarUrl || 'https://placehold.co/100x100/3b82f6/ffffff?text=U'}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/40 shadow-xl"
              />
              <label 
                htmlFor="profile-avatar-input"
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white"
              >
                <Camera className="w-6 h-6" />
              </label>
              <input 
                id="profile-avatar-input"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarFile}
                disabled={isUploadingAvatar}
              />
            </div>

            <div className="flex gap-2">
              <label 
                htmlFor="profile-avatar-input"
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700 cursor-pointer"
              >
                {isUploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
              </label>
              <button
                type="button"
                onClick={handleResetToGoogle}
                className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Фото из Google</span>
              </button>
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Имя пользователя
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Bio input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              О себе (Био)
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе или укажите статус..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
