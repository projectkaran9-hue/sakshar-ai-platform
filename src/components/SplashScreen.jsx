import React, { useEffect, useState } from 'react';
import HeroVideoBackground from './HeroVideoBackground';

/**
 * SplashScreen
 * ------------------------------------------------------------------
 * Pure Full-Screen Video Intro Animation Screen.
 * Renders the custom video configured in 
 * App Splash / Intro Drop Background Manager in Admin Dashboard.
 * 
 * ZERO Logo, ZERO Text, ZERO Darkening Overlay — 100% Pure Crisp Video
 * that smoothly transitions directly into the landing page.
 * ------------------------------------------------------------------
 */
export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);

  const [splashBgConfig, setSplashBgConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sakshar_auth_bg_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.splash) return { ...parsed.splash, opacity: 1.0, overlayOpacity: 0.0 };
      }
    } catch {}
    return {
      enabled: true,
      mediaType: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-water-drop-impact-in-slow-motion-41527-large.mp4',
      opacity: 1.0,
      blur: 0,
      overlayColor: '#000000',
      overlayOpacity: 0.0
    };
  });

  useEffect(() => {
    const handleSplashBgUpdate = (e) => {
      if (e.detail?.splash) setSplashBgConfig({ ...e.detail.splash, opacity: 1.0, overlayOpacity: 0.0 });
    };
    window.addEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
    return () => window.removeEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
  }, []);

  useEffect(() => {
    const FADE_START = 2800;
    const TOTAL = 3400;

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
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-700 bg-black ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 🎥 Pure Full-Screen Video Background (Zero Logo, Zero Darkening Tint, Zero Controls) */}
      {splashBgConfig?.enabled !== false && splashBgConfig?.url && (
        <HeroVideoBackground config={{ ...splashBgConfig, opacity: 1.0, overlayOpacity: 0.0 }} className="z-0" />
      )}
    </div>
  );
}
