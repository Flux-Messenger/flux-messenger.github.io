import { storage, ref, uploadBytesResumable, getDownloadURL, IMGBB_API_KEY } from './firebase';

export interface UploadProgressCallback {
  (progress: number, statusText: string): void;
}

// Generate a video thumbnail from a File or Blob client-side using HTML5 Video + Canvas
export async function generateVideoThumbnail(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, video.duration / 2 || 0.1);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth || 480, 640);
          canvas.height = Math.min(video.videoHeight || 360, 480);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(video.src);
            resolve(thumbUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas thumbnail extraction failed', e);
        }
        URL.revokeObjectURL(video.src);
        resolve('');
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve('');
      };

      // Fallback timeout
      setTimeout(() => {
        resolve('');
      }, 3000);
    } catch (e) {
      resolve('');
    }
  });
}

// Upload Image (ImgBB with Firebase Storage fallback)
export async function uploadImageFile(file: File, onProgress?: UploadProgressCallback): Promise<string> {
  onProgress?.(20, 'Загрузка изображения...');
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    if (result.success && result.data?.url) {
      onProgress?.(100, 'Готово!');
      return result.data.url;
    }
  } catch (err) {
    console.warn('ImgBB upload error, attempting Firebase Storage fallback...', err);
  }

  // Firebase Storage fallback
  try {
    const storageRef = ref(storage, `images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(progress, `Загрузка в хранилище: ${progress}%`);
        },
        (error) => reject(error),
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.(100, 'Готово!');
          resolve(downloadUrl);
        }
      );
    });
  } catch (fbErr) {
    throw new Error('Не удалось загрузить картинку ни через ImgBB, ни через Firebase.');
  }
}

// Upload Video File (Firebase Storage with multiple fallbacks)
export async function uploadVideoFile(
  file: File | Blob, 
  fileName: string = 'video.mp4', 
  onProgress?: UploadProgressCallback
): Promise<{ videoUrl: string; thumbnailUrl: string; duration?: number }> {
  onProgress?.(10, 'Подготовка видео...');
  
  // 1. Generate thumbnail first
  let thumbnailUrl = '';
  try {
    thumbnailUrl = await generateVideoThumbnail(file);
  } catch (e) {
    console.warn('Thumbnail generation skipped');
  }

  onProgress?.(25, 'Загрузка видеофайла...');

  // 2. Try Firebase Storage upload
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
    const storageRef = ref(storage, `videos/${Date.now()}_${safeName}`);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'video/mp4'
    });

    const videoUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(Math.min(95, 25 + Math.round(p * 0.7)), `Загрузка видео: ${p}%`);
        },
        (error) => {
          console.warn('Firebase Storage video error:', error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    onProgress?.(100, 'Видео успешно загружено!');
    return { videoUrl, thumbnailUrl };
  } catch (storageErr: any) {
    console.warn('Firebase Storage upload failed (possibly storage rules). Using fallback hosting...', storageErr);

    // 3. Fallback: Free video uploaders (Catbox / tmpfiles)
    try {
      onProgress?.(50, 'Бесплатная резервная отправка видео...');
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', file, fileName);

      const catboxResp = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://catbox.moe/user/api.php'), {
        method: 'POST',
        body: formData
      });
      if (catboxResp.ok) {
        const directUrl = await catboxResp.text();
        if (directUrl && directUrl.startsWith('http')) {
          onProgress?.(100, 'Готово!');
          return { videoUrl: directUrl.trim(), thumbnailUrl };
        }
      }
    } catch (catboxErr) {
      console.warn('Catbox fallback skipped', catboxErr);
    }

    try {
      onProgress?.(65, 'Отправка через резервный шлюз...');
      const formData = new FormData();
      formData.append('file', file, fileName);

      const resp = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (data && data.status === 'success' && data.data?.url) {
        const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        onProgress?.(100, 'Готово!');
        return { videoUrl: directUrl, thumbnailUrl };
      }
    } catch (fallbackErr) {
      console.warn('tmpfiles fallback failed:', fallbackErr);
    }

    // 4. Last resort for small video: Data URL
    if (file.size < 12 * 1024 * 1024) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          onProgress?.(100, 'Готово!');
          resolve({ videoUrl: reader.result as string, thumbnailUrl });
        };
        reader.onerror = () => reject(new Error('Ошибка чтения файла'));
        reader.readAsDataURL(file);
      });
    }

    throw new Error('Не удалось загрузить видео. Проверьте правила Firebase Storage в настройках мессенджера.');
  }
}

// Upload Audio Voice Recording
export async function uploadAudioVoice(blob: Blob, onProgress?: UploadProgressCallback): Promise<string> {
  try {
    const storageRef = ref(storage, `voices/${Date.now()}_voice.webm`);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: 'audio/webm' });
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snap) => {
          const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress?.(p, `Голосовое: ${p}%`);
        },
        async (error) => {
          // Fallback to Data URL for voice if storage permission error
          console.warn('Voice storage upload error, falling back to data URL', error);
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(error);
          reader.readAsDataURL(blob);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  } catch (e) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
