# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read Dashboard.jsx
with open('src/components/Dashboard.jsx', encoding='utf-8') as f:
    dash_code = f.read()

# Replace the top banner in Dashboard.jsx with the animated geometric card mockup matching the user screenshot
old_banner_code = '''            {/* Top Welcome Hero Banner */}
            <div className="relative rounded-[2rem] p-6 sm:p-8 overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #0D1F0C 0%, #14532D 60%, #047857 100%)', border: '1px solid rgba(74,222,128,0.25)' }}>
              {/* Background ambient animations */}
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40" style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                      {getLanguageNativeLabel(lang)} • AI Tutor Active
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                      🔥 {streakCount} Day Streak
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 backdrop-blur-md">
                      ⭐ {parseInt(localStorage.getItem('game_xp') || '0')} XP
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                    {t.welcomeBack || 'Welcome back'}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">{fullName || 'Learner'}</span>! <span className="inline-block animate-wave" style={{ animation: 'sakWaveHand 2.2s infinite' }}>👋</span>
                  </h2>

                  <p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
                    Master regional literacy with AI tutoring, interactive letter tracing, phonics audio, and fun gamified lessons in <strong className="text-white font-bold">{getLanguageNativeLabel(lang)}</strong>.
                  </p>

                  {/* Quick Skill Practice Chips */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setActiveModule('reading')}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-900/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>📖 Reading Practice</span>
                      <span>→</span>
                    </button>
                    <button 
                      onClick={() => setActiveModule('writing')}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>✍️ Letter Tracing</span>
                    </button>
                    <button 
                      onClick={() => setActiveModule('speaking')}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>🗣️ AI Speech Practice</span>
                    </button>
                    <button 
                      onClick={() => setActiveModule('level_assessment')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs border border-amber-400/30 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>🎯 Assessment</span>
                    </button>
                  </div>
                </div>

                {/* Right side trophy / XP progress widget */}
                <div className="shrink-0 bg-white/10 border border-white/15 backdrop-blur-xl rounded-2xl p-5 w-full lg:w-64 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Level Progress</span>
                    <span className="text-xs font-black text-yellow-300">Level {Math.floor(parseInt(localStorage.getItem('game_xp') || '0') / 100) + 1}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500" style={{ width: `${Math.min(parseInt(localStorage.getItem('game_xp') || '0') % 100, 100)}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-100/70">
                    <span>{parseInt(localStorage.getItem('game_xp') || '0')} XP</span>
                    <span>100 XP next level</span>
                  </div>

                  <button
                    onClick={() => setIsGameModalOpen(true)}
                    className="w-full py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 rounded-xl font-black text-xs hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>🎮 Open Arcade Hub</span>
                  </button>
                </div>
              </div>
            </div>'''

new_banner_code = '''            {/* Top Welcome Hero Banner with Mockup Geometric Background Animations */}
            <div className="relative rounded-[2.5rem] bg-[#0b1021] text-white p-6 sm:p-8 overflow-hidden shadow-2xl border border-white/10">
              {/* 🎨 Playful Animated Geometric Shapes Cluster (Lime Green, Peach Orange, Soft Lavender) */}
              <div className="absolute right-[-2rem] top-[-2rem] w-64 h-64 pointer-events-none z-0 opacity-90 animate-geo-rotate">
                <div className="absolute w-24 h-24 rounded-full bg-[#d9f99d] top-4 right-8 mix-blend-screen opacity-90" />
                <div className="absolute w-28 h-28 rounded-full bg-[#ffedd5] top-16 right-20 mix-blend-screen opacity-90" />
                <div className="absolute w-20 h-20 rounded-full bg-[#e0e7ff] top-24 right-4 mix-blend-screen opacity-85" />
                <div className="absolute w-16 h-16 rounded-full bg-[#ccfbf1] top-10 right-32 mix-blend-screen opacity-90" />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-4 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                      {getLanguageNativeLabel(lang)} • AI Tutor Active
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                      🔥 {streakCount} Day Streak
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 backdrop-blur-md">
                      ⭐ {parseInt(localStorage.getItem('game_xp') || '0')} XP
                    </span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white">
                    My Learning Environment
                  </h2>

                  <p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
                    Master regional literacy with AI tutoring, interactive letter tracing, phonics audio, and fun gamified lessons in <strong className="text-white font-bold">{getLanguageNativeLabel(lang)}</strong>.
                  </p>

                  {/* Quick Skill Practice Chips */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setActiveModule('reading')}
                      className="px-5 py-2.5 rounded-full bg-[#d9f99d] hover:bg-[#bef264] text-[#0b1021] font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>📖 Reading Practice</span>
                      <span>→</span>
                    </button>
                    <button 
                      onClick={() => setActiveModule('writing')}
                      className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>✍️ Letter Tracing</span>
                    </button>
                    <button 
                      onClick={() => setActiveModule('speaking')}
                      className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
                    >
                      <span>🗣️ AI Speech Practice</span>
                    </button>
                  </div>
                </div>

                {/* Right side Velocity & Animated Equalizer Widget */}
                <div className="shrink-0 bg-white/10 border border-white/15 backdrop-blur-xl rounded-3xl p-5 w-full lg:w-64 flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Learning Velocity</span>
                    <div className="text-2xl font-black text-yellow-300 flex items-center gap-1">
                      <span>+2.5 h</span>
                      <span className="text-xs text-emerald-400 font-bold">/ week</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-12 pt-2 px-2 bg-black/30 rounded-2xl border border-white/10">
                    <div className="w-2 bg-emerald-400 rounded-full animate-eq-bar-1" />
                    <div className="w-2 bg-amber-400 rounded-full animate-eq-bar-2" />
                    <div className="w-2 bg-cyan-400 rounded-full animate-eq-bar-3" />
                    <div className="w-2 bg-purple-400 rounded-full animate-eq-bar-4" />
                  </div>
                </div>
              </div>
            </div>'''

if old_banner_code in dash_code:
    dash_code = dash_code.replace(old_banner_code, new_banner_code)
    print("✓ Replaced top banner with animated geometric shape card in Dashboard.jsx")
else:
    print("❌ Could not find old_banner_code in Dashboard.jsx")

with open('src/components/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(dash_code)

print("Done updating Dashboard.jsx with geometric background animations!")
