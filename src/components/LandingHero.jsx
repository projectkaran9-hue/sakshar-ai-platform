import React, { useState, useEffect, useRef, useCallback } from 'react';

const FLOATING_WORDS = [
  { text: 'नमस्ते',    x: '8%',  y: '18%', size: 14, delay: 0   },
  { text: 'வணக்கம்',  x: '80%', y: '12%', size: 13, delay: 1.2 },
  { text: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', x: '72%', y: '72%', size: 12, delay: 2   },
  { text: 'নমস্কার',  x: '5%',  y: '68%', size: 13, delay: 0.8 },
  { text: 'Hello',    x: '88%', y: '42%', size: 14, delay: 1.6 },
  { text: 'اُردُو',   x: '14%', y: '84%', size: 13, delay: 0.4 },
  { text: 'ಕನ್ನಡ',   x: '60%', y: '88%', size: 12, delay: 2.4 },
  { text: 'বাংলা',   x: '42%', y: '6%',  size: 13, delay: 1.0 },
  { text: 'अ',       x: '88%', y: '82%', size: 20, delay: 0.6 },
  { text: 'A',       x: '20%', y: '6%',  size: 20, delay: 1.8 },
];

const STATS = [
  { value: '20+', label: 'Regional Languages' },
  { value: '4',   label: 'Literacy Tracks'    },
  { value: 'AI',  label: 'Powered Feedback'   },
];

const LANG_STRIP = [
  'हिन्दी', 'English', 'বাংলা', 'தமிழ்', 'తెలుగు',
  'ਪੰਜਾਬੀ', 'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം',
  'ଓଡ଼ିଆ', 'اُردُو', 'অসমীয়া', 'नेपाली', 'संस्कृतम्',
];

// Cycling "Tap to Speak" labels in all 20 supported languages
const SPEAK_LABELS = [
  { text: 'बोलें',        sub: 'हिंदी में बोलें'         },
  { text: 'Speak',        sub: 'Tap mic & speak'          },
  { text: 'বলুন',         sub: 'বাংলায় বলুন'             },
  { text: 'பேசுங்கள்',   sub: 'தமிழில் பேசுங்கள்'       },
  { text: 'మాట్లాడండి',  sub: 'తెలుగులో మాట్లాడండి'      },
  { text: 'ਬੋਲੋ',         sub: 'ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲੋ'        },
  { text: 'बोला',         sub: 'मराठीत बोला'             },
  { text: 'બોલો',         sub: 'ગુજરાતીમાં બોલો'          },
  { text: 'ಮಾತನಾಡಿ',     sub: 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ'       },
  { text: 'സംസാരിക്കൂ',  sub: 'മലയാളത്തിൽ സംസാരിക്കൂ'   },
  { text: 'ବୋଲନ୍ତୁ',     sub: 'ଓଡ଼ିଆ ରେ ବୋଲନ୍ତୁ'         },
  { text: 'بولیں',        sub: 'اردو میں بولیں'           },
];

// BCP-47 lang code → app language key mapping
const LANG_CODE_MAP = {
  'hi':    'hindi',
  'hi-IN': 'hindi',
  'en':    'english',
  'en-IN': 'english',
  'en-US': 'english',
  'bn':    'bengali',
  'bn-IN': 'bengali',
  'bn-BD': 'bengali',
  'ta':    'tamil',
  'ta-IN': 'tamil',
  'te':    'telugu',
  'te-IN': 'telugu',
  'pa':    'punjabi',
  'pa-IN': 'punjabi',
  'mr':    'marathi',
  'mr-IN': 'marathi',
  'gu':    'gujarati',
  'gu-IN': 'gujarati',
  'kn':    'kannada',
  'kn-IN': 'kannada',
  'ml':    'malayalam',
  'ml-IN': 'malayalam',
  'or':    'odia',
  'or-IN': 'odia',
  'ur':    'urdu',
  'ur-IN': 'urdu',
  'ur-PK': 'urdu',
  'as':    'assamese',
  'as-IN': 'assamese',
  'ne':    'nepali',
  'ne-NP': 'nepali',
  'mai':   'maithili',
  'ks':    'kashmiri',
  'sd':    'sindhi',
  'kok':   'konkani',
};

// All BCP-47 codes we'll ask the API to try recognising
const MULTI_LANG_CODES = [
  'hi-IN','en-IN','bn-IN','ta-IN','te-IN','pa-IN',
  'mr-IN','gu-IN','kn-IN','ml-IN','or-IN','ur-IN',
  'as-IN','ne-NP','ks-IN','sd-IN','kok-IN',
];

export default function LandingHero({ onGetStarted }) {
  const [labelIdx, setLabelIdx]   = useState(0);
  const [micState, setMicState]   = useState('idle');  // idle | listening | detected | error | unsupported
  const [detectedLang, setDetected] = useState('');
  const [spokenText, setSpoken]   = useState('');
  const recognitionRef             = useRef(null);
  const cyclRef                    = useRef(null);

  // Cycle through speak labels
  useEffect(() => {
    cyclRef.current = setInterval(() => {
      setLabelIdx(i => (i + 1) % SPEAK_LABELS.length);
    }, 1800);
    return () => clearInterval(cyclRef.current);
  }, []);

  // Stop cycling while listening
  useEffect(() => {
    if (micState === 'listening') {
      clearInterval(cyclRef.current);
    } else if (micState === 'idle') {
      cyclRef.current = setInterval(() => {
        setLabelIdx(i => (i + 1) % SPEAK_LABELS.length);
      }, 1800);
    }
    return () => clearInterval(cyclRef.current);
  }, [micState]);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicState('unsupported');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Use continuous multi-language recognition by cycling through langs
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.lang = MULTI_LANG_CODES[0]; // Start with Hindi-IN as default

    setMicState('listening');
    setSpoken('');
    setDetected('');

    recognition.onresult = (e) => {
      const result   = e.results[0];
      const spoken   = result[0].transcript || '';
      // lang from result if available (some browsers expose it)
      const rawLang  = (result[0].lang || recognition.lang || 'en').split('-')[0].toLowerCase();
      const fullCode = result[0].lang || recognition.lang || 'en-IN';

      const appLang  =
        LANG_CODE_MAP[fullCode] ||
        LANG_CODE_MAP[rawLang]  ||
        'english';

      setSpoken(spoken);
      setDetected(appLang);
      setMicState('detected');
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        setMicState('error');
        setTimeout(() => setMicState('idle'), 2200);
      } else if (e.error !== 'aborted') {
        setMicState('error');
        setTimeout(() => setMicState('idle'), 2200);
      }
    };

    recognition.onend = () => {
      if (micState === 'listening') setMicState('idle');
    };

    try {
      recognition.start();
    } catch (_) {
      setMicState('error');
      setTimeout(() => setMicState('idle'), 2000);
    }
  }, [micState]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch (_) {}
    setMicState('idle');
  }, []);

  const handleMicClick = () => {
    if (micState === 'listening') { stopListening(); return; }
    if (micState === 'detected')  { handleProceed(); return; }
    startListening();
  };

  const handleProceed = () => {
    onGetStarted(detectedLang || 'english');
  };

  const label = SPEAK_LABELS[labelIdx];

  /* ─────── MIC BUTTON APPEARANCE ─────── */
  const micColors = {
    idle:        { ring: '#16a34a', bg: 'linear-gradient(135deg,#1C2D1A,#16a34a)', icon: '#fff' },
    listening:   { ring: '#ef4444', bg: 'linear-gradient(135deg,#b91c1c,#ef4444)', icon: '#fff' },
    detected:    { ring: '#f59e0b', bg: 'linear-gradient(135deg,#92400e,#f59e0b)', icon: '#fff' },
    error:       { ring: '#6b7280', bg: 'linear-gradient(135deg,#374151,#6b7280)', icon: '#fff' },
    unsupported: { ring: '#6b7280', bg: 'linear-gradient(135deg,#374151,#6b7280)', icon: '#fff' },
  };
  const mc = micColors[micState];

  return (
    <div className="relative min-h-screen bg-[#FAFAF8] text-[#1C2D1A] flex flex-col justify-center items-center overflow-hidden px-4">

      {/* ── Water Effect Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" 
           style={{
             background: 'linear-gradient(-45deg, #ecfdf5, #ccfbf1, #cffafe, #d1fae5)',
             backgroundSize: '400% 400%',
             animation: 'waterGradient 15s ease infinite'
           }}>
        
        <style>{`
          @keyframes waterGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes waveAnimation {
            0% { transform: translate3d(-90px, 0, 0); }
            100% { transform: translate3d(85px, 0, 0); }
          }
        `}</style>

        {/* Caustics / Light Reflections */}
        <div className="absolute inset-0 mix-blend-overlay opacity-50" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 0%, transparent 60%)', 
               animation: 'blobPulse 6s ease-in-out infinite alternate' 
             }} />

        {/* Animated Waves at the bottom half */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg className="relative block w-full h-[60vh] min-h-[300px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 24 150 28" preserveAspectRatio="none">
            <defs>
              <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
            </defs>
            <g style={{ animation: 'waveAnimation 25s cubic-bezier(.55, .5, .45, .5) infinite' }}>
              <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(20, 184, 166, 0.15)" />
            </g>
            <g style={{ animation: 'waveAnimation 20s cubic-bezier(.55, .5, .45, .5) infinite' }}>
              <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(16, 185, 129, 0.2)" />
            </g>
            <g style={{ animation: 'waveAnimation 15s cubic-bezier(.55, .5, .45, .5) infinite' }}>
              <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(6, 182, 212, 0.3)" />
            </g>
            <g style={{ animation: 'waveAnimation 30s cubic-bezier(.55, .5, .45, .5) infinite' }}>
              <use xlinkHref="#gentle-wave" x="48" y="7" fill="rgba(255, 255, 255, 0.6)" /> 
            </g>
          </svg>
        </div>
      </div>

      {/* ── Floating language words ── */}
      {FLOATING_WORDS.map((w, i) => (
        <span key={i} className="absolute select-none font-black text-emerald-900/10 pointer-events-none"
          style={{ left: w.x, top: w.y, fontSize: w.size, animation: `floatWord 6s ease-in-out ${w.delay}s infinite alternate` }}>
          {w.text}
        </span>
      ))}

      {/* ── Language marquee strip (top) ── */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden h-10 z-10 border-b border-emerald-100/60 bg-white/70 backdrop-blur-sm flex items-center">
        <div className="flex gap-6 whitespace-nowrap" style={{ animation: 'marqueeLeft 28s linear infinite' }}>
          {[...LANG_STRIP, ...LANG_STRIP].map((l, i) => (
            <span key={i} className="text-[11px] font-bold text-emerald-800/60 tracking-wider px-1">{l}</span>
          ))}
        </div>
      </div>

      {/* ── MAIN HERO CONTENT ── */}
      <div className="relative z-10 max-w-4xl w-full text-center space-y-7 px-4 pt-10">

        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 bg-white border border-emerald-100 px-4 py-2 rounded-full shadow-sm"
          style={{ animation: 'fadeSlideUp 0.6s ease-out both' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black tracking-widest text-emerald-800 uppercase">
            ✨ AI-Powered Literacy Platform for India
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 leading-[1.05]"
          style={{ animation: 'fadeSlideUp 0.7s ease-out 0.1s both' }}>
          Empowering Literacy<br />
          <span style={{
            background: 'linear-gradient(135deg,#1C2D1A 0%,#16a34a 50%,#059669 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Through AI</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium"
          style={{ animation: 'fadeSlideUp 0.8s ease-out 0.2s both' }}>
          A personalized learning companion for adults and first-generation learners —&nbsp;
          <span className="text-gray-700 font-semibold">in your own language, at your own pace.</span>
        </p>

        {/* ══════════════════════════════════════════
             VOICE MIC SECTION — Primary CTA
        ══════════════════════════════════════════ */}
        <div className="flex flex-col items-center gap-4" style={{ animation: 'fadeSlideUp 0.9s ease-out 0.25s both' }}>

          {/* Instruction label that cycles in all languages */}
          <div className="h-14 flex flex-col items-center justify-center">
            {micState === 'idle' && (
              <div style={{ animation: 'fadeSwap 0.4s ease-out both' }} className="text-center">
                <p className="text-2xl font-black text-gray-800 leading-tight">{label.text}</p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">{label.sub}</p>
              </div>
            )}
            {micState === 'listening' && (
              <div className="text-center" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
                <p className="text-lg font-black text-red-600 animate-pulse">🎙️ Listening…</p>
                <p className="text-xs text-gray-400 mt-0.5">बोलें • Speak • বলুন • பேசுங்கள்</p>
              </div>
            )}
            {micState === 'detected' && (
              <div className="text-center" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
                <p className="text-sm font-black text-amber-700">✅ Detected: <span className="capitalize">{detectedLang}</span></p>
                {spokenText && <p className="text-xs text-gray-500 mt-0.5 italic">"{spokenText}"</p>}
              </div>
            )}
            {micState === 'error' && (
              <div className="text-center" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
                <p className="text-sm font-black text-gray-500">😶 No speech heard. Try again.</p>
              </div>
            )}
            {micState === 'unsupported' && (
              <div className="text-center" style={{ animation: 'fadeSlideUp 0.3s ease-out both' }}>
                <p className="text-sm font-bold text-gray-500">⚠️ Mic not supported — use Chrome</p>
              </div>
            )}
          </div>

          {/* Big Mic Button */}
          <div className="relative flex items-center justify-center">
            {/* Pulse rings when listening */}
            {micState === 'listening' && (<>
              <div className="absolute w-32 h-32 rounded-full border-2 border-red-400/40" style={{ animation: 'micRing 1.4s ease-out infinite' }} />
              <div className="absolute w-44 h-44 rounded-full border border-red-300/20" style={{ animation: 'micRing 1.4s ease-out 0.4s infinite' }} />
              <div className="absolute w-56 h-56 rounded-full border border-red-200/10" style={{ animation: 'micRing 1.4s ease-out 0.8s infinite' }} />
            </>)}

            {/* Glow ring */}
            <div className="absolute w-28 h-28 rounded-full blur-xl opacity-50"
              style={{ background: mc.ring, transition: 'background 0.4s' }} />

            {/* Main mic button */}
            <button
              onClick={handleMicClick}
              aria-label="Speak your language"
              className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-90 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
              style={{ background: mc.bg }}
            >
              {micState === 'detected' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : micState === 'listening' ? (
                // Animated waveform bars
                <div className="flex items-center gap-[3px]">
                  {[0.3, 0.5, 1, 0.6, 0.4, 0.8, 0.35].map((h, i) => (
                    <div key={i} className="w-1 rounded-full bg-white"
                      style={{ height: `${h * 28}px`, animation: `barBounce 0.7s ease-in-out ${i * 0.1}s infinite alternate` }} />
                  ))}
                </div>
              ) : (
                // Mic icon
                <svg xmlns="http://www.w3.org/2000/svg" className="w-11 h-11" fill="white" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              )}
            </button>
          </div>

          {/* Action row below mic */}
          <div className="flex flex-col items-center gap-2">
            {micState === 'detected' && (
              <button onClick={handleProceed}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-white font-extrabold rounded-2xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                style={{ animation: 'fadeSlideUp 0.4s ease-out both' }}>
                Continue in <span className="capitalize">{detectedLang}</span> →
              </button>
            )}
            <div className="flex items-center gap-3 mt-1">
              <div className="h-px w-16 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="h-px w-16 bg-gray-200" />
            </div>
            <button onClick={() => onGetStarted('english')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:border-emerald-200 hover:text-emerald-700 transition-all duration-200 active:scale-95">
              Get Started Free →
            </button>
          </div>
        </div>
        {/* ══════════════════════════════════════════ */}

        {/* Trust strip */}
        <p className="text-gray-400 text-xs font-medium" style={{ animation: 'fadeSlideUp 1s ease-out 0.4s both' }}>
          Free to use · No credit card required · Works on any device
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
          style={{ animation: 'fadeSlideUp 1s ease-out 0.45s both' }}>
          {STATS.map((s, i) => (
            <div key={i} className="bg-white/80 backdrop-blur border border-gray-100 rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-shadow duration-200">
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2"
          style={{ animation: 'fadeSlideUp 1s ease-out 0.5s both' }}>
          {['📖 Reading', '✍️ Writing', '🗣️ Speaking AI', '🎮 Mini-Games', '📊 Analytics', '🌐 20+ Languages'].map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-100 rounded-full shadow-sm hover:border-emerald-200 hover:text-emerald-800 transition-colors duration-150">
              {f}
            </span>
          ))}
        </div>

        {/* Floating card preview */}
        <div className="relative mx-auto max-w-sm mt-2"
          style={{ animation: 'fadeSlideUp 1s ease-out 0.55s both' }}>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-base">📖</div>
              <div>
                <p className="text-xs font-black text-gray-900">SaksharAI Tutor</p>
                <p className="text-[10px] text-gray-400 font-medium">AI Literacy Coach</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="bg-emerald-50 rounded-2xl px-4 py-3 text-xs font-medium text-emerald-900 leading-relaxed border border-emerald-100/60">
              "Hello! I'm your AI tutor. Just tap the mic and speak — I'll understand your language! 🎙️🌟"
            </div>
            <div className="flex gap-2">
              {['Start Reading 📖', 'Writing ✍️', 'Speaking 🗣️'].map((a, i) => (
                <span key={i} className="text-[10px] font-bold bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg cursor-default">{a}</span>
              ))}
            </div>
          </div>
          <div className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md" style={{ animation: 'floatBadge 3s ease-in-out infinite' }}>
            ⭐ +15 XP
          </div>
          <div className="absolute -bottom-3 -left-3 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md" style={{ animation: 'floatBadge 4s ease-in-out 1s infinite' }}>
            🎯 Level Up!
          </div>
        </div>

      </div>

      {/* ── Bottom scroll hint ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scroll</span>
        <span className="text-gray-400 animate-bounce">↓</span>
      </div>

      {/* ── Embedded CSS ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeSwap {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes floatWord {
          from { transform: translateY(0px) rotate(-2deg);  }
          to   { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes floatBadge {
          0%,100% { transform: translateY(0);   }
          50%      { transform: translateY(-6px); }
        }
        @keyframes blobPulse {
          0%,100% { transform: scale(1) rotate(0deg);    opacity:0.6; }
          50%     { transform: scale(1.12) rotate(6deg); opacity:0.9; }
        }
        @keyframes marqueeLeft {
          from { transform: translateX(0);    }
          to   { transform: translateX(-50%); }
        }
        @keyframes micRing {
          0%   { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
        @keyframes barBounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}