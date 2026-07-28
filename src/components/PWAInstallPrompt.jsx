import React, { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed previously in session
    if (sessionStorage.getItem('pwa_prompt_dismissed') === 'true') {
      setDismissed(true);
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isIOSDevice && !isStandalone) {
      setIsIOS(true);
    }

    // Listen for standard beforeinstallprompt event (Android / Desktop Chrome / Edge / Brave)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[PWA] Sakshar AI App successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled || dismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div 
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-in"
        style={{
          animation: 'pwaSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
      >
        <div 
          className="rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(24, 20, 52, 0.96) 0%, rgba(12, 10, 30, 0.98) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 12px 40px -10px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)'
          }}
        >
          {/* Subtle glowing accent background */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />

          {/* App Logo/Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shrink-0 shadow-md">
            <img 
              src="/pwa-192x192.png" 
              alt="Sakshar AI Logo" 
              className="w-full h-full object-cover rounded-[14px]"
              onError={(e) => { e.target.src = '/logo.png'; }}
            />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">Install Sakshar App</h4>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80 font-medium leading-snug mt-0.5 truncate">
              {isIOS ? 'Install on your iPhone or iPad home screen' : 'Instant offline access & full screen app mode'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
              }}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowIOSModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #181434 0%, #0d0a22 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 0 50px rgba(139, 92, 246, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-2xl mx-auto shadow-inner">
              📲
            </div>

            <h3 className="text-lg font-black text-white tracking-tight">Install Sakshar AI on iOS</h3>

            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              To install Sakshar AI on your iPhone or iPad, follow these simple steps in Safari:
            </p>

            <div className="space-y-2.5 text-left bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-slate-200">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                <span>Tap the <strong className="text-white">Share</strong> button 📤 in your browser toolbar</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                <span>Scroll down and select <strong className="text-white">Add to Home Screen</strong> ➕</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                <span>Tap <strong className="text-white">Add</strong> in the top right corner</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
