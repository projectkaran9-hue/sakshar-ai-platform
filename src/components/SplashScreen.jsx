import React, { useEffect, useState } from 'react';
import HeroVideoBackground from './HeroVideoBackground';

/**
 * SplashScreen
 * ------------------------------------------------------------------
 * Full-viewport Video Intro Animation Screen.
 * Renders the custom video animation configured in 
 * App Splash / Intro Drop Background Manager in Admin Dashboard.
 * 
 * Smoothly plays the intro video with brand logo and text overlay,
 * then seamlessly fades out into the main application landing page.
 * ------------------------------------------------------------------
 */
export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);

  const [splashBgConfig, setSplashBgConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sakshar_auth_bg_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.splash) return parsed.splash;
      }
    } catch {}
    return {
      enabled: true,
      mediaType: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-water-drop-impact-in-slow-motion-41527-large.mp4',
      opacity: 0.9,
      blur: 0,
      overlayColor: '#030a16',
      overlayOpacity: 0.4
    };
  });

  useEffect(() => {
    const handleSplashBgUpdate = (e) => {
      if (e.detail?.splash) setSplashBgConfig(e.detail.splash);
    };
    window.addEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
    return () => window.removeEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
  }, []);

  useEffect(() => {
    const FADE_START = 2200;
    const TOTAL = 2800;

    const exitTimer = setTimeout(() => setExiting(true), FADE_START);
    const doneTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, TOTAL);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-700 bg-slate-950 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 🎥 Video Animation Background from App Splash / Intro Drop Background Manager */}
      {splashBgConfig?.enabled !== false && splashBgConfig?.url && (
        <HeroVideoBackground config={splashBgConfig} className="z-0" />
      )}

      {/* Darkening Tint Overlay */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none transition-all duration-300"
        style={{
          backgroundColor: splashBgConfig?.overlayColor || '#030a16',
          opacity: splashBgConfig?.overlayOpacity ?? 0.4
        }}
      />

      {/* 🌟 Elegant Brand Intro Overlay */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 space-y-4 animate-fade-in">
        <img
          src="/logo.png"
          alt="Sakshar AI"
          className="h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] animate-scale-up"
        />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow">
            Sakshar AI
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 tracking-wide uppercase font-mono drop-shadow">
            Empowering Multilingual Literacy
          </p>
        </div>
      </div>
    </div>
  );
}
