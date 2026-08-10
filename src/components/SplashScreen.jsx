import React, { useEffect, useMemo, useState } from 'react';
import HeroVideoBackground from './HeroVideoBackground';

/**
 * SplashScreen
 * ------------------------------------------------------------------
 * A one-time, full-viewport intro animation: a droplet falls, hits the
 * center of the screen, and realistic ripples + particles expand
 * outward across a dark-blue-to-cyan "water surface" gradient.
 *
 * Plays once (per browser tab session — see App.jsx), then calls
 * onComplete() so the parent can unmount it and reveal the app.
 *
 * Fully respects prefers-reduced-motion: when set, the droplet/ripple/
 * particle animation is skipped entirely and a brief, simple fade is
 * shown instead.
 * ------------------------------------------------------------------
 */
export default function SplashScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      opacity: 0.65,
      blur: 0,
      overlayColor: '#030a16',
      overlayOpacity: 0.5
    };
  });

  useEffect(() => {
    const handleSplashBgUpdate = (e) => {
      if (e.detail?.splash) setSplashBgConfig(e.detail.splash);
    };
    window.addEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
    return () => window.removeEventListener('sakshar_auth_bg_updated', handleSplashBgUpdate);
  }, []);

  // Stable, randomized splash-particle burst vectors (computed once).
  const particles = useMemo(() => {
    const COUNT = 14;
    return Array.from({ length: COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / COUNT + (Math.random() * 0.35 - 0.175);
      const distance = 60 + Math.random() * 90;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance * 0.6 - 10; // flatten + slight upward bias
      const size = 3 + Math.random() * 4;
      const delay = Math.random() * 0.12;
      return { id: i, tx, ty, size, delay };
    });
  }, []);

  useEffect(() => {
    let mql;
    let prefersReduced = false;
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReduced = mql.matches;
    } catch {
      prefersReduced = false;
    }
    setReducedMotion(prefersReduced);

    // Reduced motion: skip the droplet/ripple choreography, just a
    // brief, simple fade so there's no jarring instant cut.
    const FADE_START = prefersReduced ? 150 : 2200;
    const TOTAL = prefersReduced ? 500 : 2800;

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
      className={`splash-root fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden ${
        exiting ? 'splash-exit' : ''
      }`}
    >
      {/* 🎥 Custom Video Background for App Intro Splash Drop Screen */}
      {splashBgConfig?.enabled !== false && splashBgConfig?.url && (
        <HeroVideoBackground config={splashBgConfig} className="z-0" />
      )}

      {/* Water-surface gradient backdrop */}
      <div className="splash-water-bg" style={{ opacity: splashBgConfig?.enabled !== false ? 0.35 : 1.0 }} />
      <div className="splash-water-shimmer" />

      {!reducedMotion && (
        <>
          {/* Falling droplet */}
          <div className="splash-droplet" />

          {/* Impact glow */}
          <div className="splash-glow" />

          {/* Expanding concentric ripples */}
          <div className="splash-ripple splash-ripple-1" />
          <div className="splash-ripple splash-ripple-2" />
          <div className="splash-ripple splash-ripple-3" />

          {/* Splash particles */}
          <div className="splash-particles">
            {particles.map((p) => (
              <span
                key={p.id}
                className="splash-particle"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  '--tx': `${p.tx}px`,
                  '--ty': `${p.ty}px`,
                  animationDelay: `${1.3 + p.delay}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}