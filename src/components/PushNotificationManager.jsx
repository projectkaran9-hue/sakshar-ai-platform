import React, { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// ─── Utility: Convert a base64url VAPID public key to a Uint8Array ──────────
function urlBase64ToUint8Array(base64String) {
  const padding   = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64    = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData   = window.atob(base64);
  const outputArr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArr[i] = rawData.charCodeAt(i);
  }
  return outputArr;
}

// ─── Permission status icons ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  default:  { icon: '🔔', label: 'Enable Notifications',    color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  granted:  { icon: '✅', label: 'Notifications Enabled',   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  denied:   { icon: '🔕', label: 'Notifications Blocked',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  loading:  { icon: '⏳', label: 'Subscribing…',            color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function PushNotificationManager({ userId, fullName }) {
  const [permission,    setPermission]    = useState('default');   // 'default'|'granted'|'denied'
  const [subscription,  setSubscription]  = useState(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [testStatus,    setTestStatus]    = useState(null);        // null|'sending'|'ok'|'fail'
  const [vapidKey,      setVapidKey]      = useState(null);
  const [isSupported,   setIsSupported]   = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [toastMsg,      setToastMsg]      = useState('');

  // ── Bootstrap: check current permission & existing subscription ─────────
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);

    // Restore daily reminder preference
    const saved = localStorage.getItem('sakshar_daily_reminder');
    if (saved !== null) setDailyReminder(JSON.parse(saved));

    // Fetch VAPID public key once
    fetch(`${BACKEND_URL}/api/vapid-public-key`)
      .then(r => r.json())
      .then(data => setVapidKey(data.publicKey || null))
      .catch(() => setVapidKey(null));

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscription(sub);
          setPermission('granted');
        }
      });
    });
  }, []);

  // ── Show toast helper ────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // ── Subscribe to push ────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    const activeKey = vapidKey || import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEEekF8FWfjdAemfVSPWgAdzSyFiRBl7FNrsh2DW2JdcbGWQOMuS7CTh-RTn5VfHVK8mtDy_8e6bqgGuVlohJ1w';
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        showToast('❌ Notification permission denied by browser.');
        setIsLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(activeKey),
      });

      setSubscription(sub);

      // Save subscription to backend
      const res = await fetch(`${BACKEND_URL}/api/push/subscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscription: sub, user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('🎉 Push notifications enabled! You\'ll receive daily reminders.');
      } else {
        showToast('⚠️ Subscribed locally but failed to save to server.');
      }
    } catch (err) {
      console.error('[Push] subscribe error:', err);
      showToast('❌ Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [vapidKey, userId]);

  // ── Unsubscribe from push ─────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      setSubscription(null);
      setPermission('default');

      await fetch(`${BACKEND_URL}/api/push/unsubscribe`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ endpoint }),
      });
      showToast('🔕 Push notifications disabled.');
    } catch (err) {
      console.error('[Push] unsubscribe error:', err);
      showToast('❌ Failed to unsubscribe.');
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  // ── Send test notification ────────────────────────────────────────────────
  const sendTestNotification = useCallback(async () => {
    if (!subscription) {
      showToast('⚠️ Enable notifications first to test.');
      return;
    }
    setTestStatus('sending');
    try {
      const keys = subscription.toJSON().keys;
      const res  = await fetch(`${BACKEND_URL}/api/push/test`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh:   keys.p256dh,
          auth:     keys.auth,
        }),
      });
      const data = await res.json();
      setTestStatus(data.success ? 'ok' : 'fail');
      showToast(data.success ? '🔔 Test notification sent! Check your device.' : '❌ Test failed. Is backend running?');
    } catch (err) {
      setTestStatus('fail');
      showToast('❌ Backend unreachable. Start the Flask server.');
    }
    setTimeout(() => setTestStatus(null), 3000);
  }, [subscription]);

  // ── Toggle daily reminder preference ─────────────────────────────────────
  const toggleDailyReminder = (val) => {
    setDailyReminder(val);
    localStorage.setItem('sakshar_daily_reminder', JSON.stringify(val));
    showToast(val ? '📅 Daily 7 PM reminder enabled.' : '📅 Daily reminder turned off.');
  };

  const statusCfg = isLoading
    ? STATUS_CONFIG.loading
    : STATUS_CONFIG[permission] || STATUS_CONFIG.default;

  const isSubscribed = permission === 'granted' && !!subscription;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Toast notification ──────────────────────────────────── */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            border: '1px solid rgba(139,92,246,0.4)',
            animation: 'pwaSlideUp 0.35s ease both',
            maxWidth: '340px',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── Main settings card ─────────────────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(30,27,75,0.9) 0%, rgba(17,14,45,0.95) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center gap-4"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: statusCfg.bg, boxShadow: `0 0 20px ${statusCfg.color}30` }}
          >
            {statusCfg.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-white tracking-tight">Push Notifications</h3>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </p>
          </div>

          {/* Toggle switch */}
          {isSupported && permission !== 'denied' && (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className="relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer disabled:opacity-50 shrink-0 focus:outline-none"
              style={{
                background: isSubscribed
                  ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                  : 'rgba(255,255,255,0.1)',
                boxShadow: isSubscribed ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300"
                style={{ left: isSubscribed ? '26px' : '2px' }}
              />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Not supported */}
          {!isSupported && (
            <div className="text-center py-4 space-y-2">
              <div className="text-3xl">🌐</div>
              <p className="text-xs font-semibold text-slate-400">
                Web Push requires a modern browser (Chrome, Edge, Firefox, Samsung Internet).
                Safari on iOS 16.4+ supports push in PWA mode.
              </p>
            </div>
          )}

          {/* Blocked */}
          {isSupported && permission === 'denied' && (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl text-xs font-semibold text-red-300"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="text-red-300 font-bold mb-1">Notifications blocked</p>
                <p className="text-red-300/70 leading-relaxed">
                  To enable, click the lock/info icon in your browser address bar → Site Settings → Notifications → Allow.
                </p>
              </div>
            </div>
          )}

          {/* Subscribed options */}
          {isSupported && isSubscribed && (
            <>
              {/* Daily Reminder Toggle */}
              <div
                className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📅</span>
                  <div>
                    <p className="text-xs font-bold text-white">Daily 7 PM Reminder</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Get a nudge every evening to practice
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleDailyReminder(!dailyReminder)}
                  className="relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer shrink-0"
                  style={{
                    background: dailyReminder
                      ? 'linear-gradient(135deg, #10B981, #059669)'
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: dailyReminder ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                  }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                    style={{ left: dailyReminder ? '22px' : '2px' }}
                  />
                </button>
              </div>

              {/* Notification type chips */}
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  You'll be notified for
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { emoji: '📚', label: 'Study Reminders', color: '#6366F1' },
                    { emoji: '🔥', label: 'Streak Alerts',   color: '#F59E0B' },
                    { emoji: '💬', label: 'Community',       color: '#10B981' },
                    { emoji: '🏆', label: 'Achievements',    color: '#EC4899' },
                    { emoji: '✨', label: 'New Lessons',     color: '#8B5CF6' },
                  ].map(({ emoji, label, color }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}35`,
                        color,
                      }}
                    >
                      {emoji} {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Test notification button */}
              <button
                onClick={sendTestNotification}
                disabled={testStatus === 'sending'}
                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                style={{
                  background: testStatus === 'ok'
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : testStatus === 'fail'
                    ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
                  border: '1px solid rgba(139,92,246,0.35)',
                  color: '#a5b4fc',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.15)',
                }}
              >
                {testStatus === 'sending' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-purple-300 border-t-transparent animate-spin" />
                    Sending…
                  </span>
                ) : testStatus === 'ok' ? (
                  '✅ Test Notification Sent!'
                ) : testStatus === 'fail' ? (
                  '❌ Failed — Is Backend Running?'
                ) : (
                  '🔔 Send Test Notification'
                )}
              </button>
            </>
          )}

          {/* Unsubscribed CTA */}
          {isSupported && !isSubscribed && permission !== 'denied' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Stay on track with your learning goals. Enable push notifications to receive:
              </p>
              <div className="space-y-2">
                {[
                  { e: '📚', t: 'Daily 7 PM study reminders' },
                  { e: '🔥', t: 'Streak expiry alerts' },
                  { e: '🏆', t: 'Achievement & milestone badges' },
                  { e: '💬', t: 'Community activity updates' },
                ].map(({ e, t }) => (
                  <div key={t} className="flex items-center gap-2 text-[11px] font-semibold text-slate-300">
                    <span>{e}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={subscribe}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 cursor-pointer mt-2 text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Subscribing…
                  </span>
                ) : (
                  '🔔 Enable Push Notifications'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pwaSlideUp {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
