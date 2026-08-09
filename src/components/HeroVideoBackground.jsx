import React, { useState, useEffect, useRef } from 'react';

// IndexedDB Helper for storing large custom video background files (no 5MB localStorage limit)
const DB_NAME = 'SaksharVideoDB';
const DB_VERSION = 1;
const STORE_NAME = 'video_files';

export const saveVideoToIndexedDB = (fileOrBlob, key = 'hero_video_bg') => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(fileOrBlob, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (err) => reject(err);
      };
      request.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
};

export const getVideoFromIndexedDB = (key = 'hero_video_bg') => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const blobUrl = URL.createObjectURL(getReq.result);
            resolve(blobUrl);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export default function HeroVideoBackground({ config = {}, className = "" }) {
  const [videoSrc, setVideoSrc] = useState(config?.url || '');
  const videoRef = useRef(null);

  // Load stored IndexedDB video blob if file upload type
  useEffect(() => {
    let isMounted = true;
    const isFile = config?.sourceType === 'file' || config?.mediaType === 'video' || config?.mediaType === 'file';
    const dbKey = config?.indexedDbKey || (config?.title?.includes('Sign In') ? 'auth_login_bg' : config?.title?.includes('Create Account') ? 'auth_register_bg' : 'hero_video_bg');

    if (isFile) {
      getVideoFromIndexedDB(dbKey).then((idbUrl) => {
        if (isMounted && idbUrl) {
          setVideoSrc(idbUrl);
        } else if (isMounted && config?.url) {
          setVideoSrc(config.url);
        }
      });
    } else {
      setVideoSrc(config?.url || '');
    }
    return () => { isMounted = false; };
  }, [config?.url, config?.sourceType, config?.mediaType, config?.updatedAt]);

  // Programmatically enforce muted autoplay & clear MediaSession OS controls
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'].forEach((action) => {
          try { navigator.mediaSession.setActionHandler(action, null); } catch {}
        });
      } catch {}
    }

    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('[HeroVideo] Autoplay notice:', err);
        });
      }
    }
  }, [videoSrc]);

  if (config?.enabled === false || !videoSrc) {
    return null;
  }

  const isYouTube = config.sourceType === 'youtube' || videoSrc.includes('youtube') || videoSrc.includes('youtu.be');
  const opacity = config.opacity ?? 0.45;
  const blur = config.blur ?? 0;
  const overlayColor = config.overlayColor || '#0c1a10';
  const overlayOpacity = config.overlayOpacity ?? 0.4;

  let youtubeEmbedUrl = videoSrc;
  if (isYouTube && config.youtubeId) {
    youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${config.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${config.youtubeId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&enablejsapi=1&playsinline=1&fs=0&autohide=1`;
  }

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${className}`}>
      {isYouTube ? (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center">
          <iframe
            src={youtubeEmbedUrl}
            title="Sakshar AI Hero Background Video"
            className="w-[220%] h-[220%] max-w-none border-0 pointer-events-none select-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              opacity: opacity,
              filter: `blur(${blur}px)`,
              transform: 'scale(1.4)',
              pointerEvents: 'none'
            }}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          key={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          tabIndex={-1}
          aria-hidden="true"
          className="w-full h-full object-cover transition-opacity duration-700 pointer-events-none select-none"
          style={{
            opacity: opacity,
            filter: `blur(${blur}px)`,
            pointerEvents: 'none'
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc} type="video/webm" />
          <source src={videoSrc} type="video/ogg" />
        </video>
      )}

      {/* Visual Overlay Tint & Interactive Shield */}
      <div 
        className="absolute inset-0 transition-all duration-300 pointer-events-none z-10"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity
        }}
      />
      <div 
        className="absolute inset-0 z-20 pointer-events-auto select-none touch-none bg-transparent cursor-default" 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />
    </div>
  );
}
