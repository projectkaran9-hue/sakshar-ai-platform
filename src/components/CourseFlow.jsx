import React, { useState } from 'react';

const LEVEL_LABELS = {
  none: 'Foundational Track',
  primary: 'Primary Track',
  middle: 'Middle School Track',
  high: 'High School Track',
};

// Duolingo Unit Themes
const UNIT_THEMES = [
  {
    unitNum: 1,
    title: 'Unit 1: Alphabet & Tracing',
    subtitle: 'Learn basic character strokes, line guides, and foundational phonics',
    bg: 'bg-[#58CC02]',
    borderColor: 'border-[#46A302]',
    textColor: 'text-[#58CC02]',
    lightBg: 'bg-[#E5F7D3]',
    icon: '🔤',
  },
  {
    unitNum: 2,
    title: 'Unit 2: Vocabulary & Words',
    subtitle: 'Master daily sight words, local nouns, and syllable combinations',
    bg: 'bg-[#1CB0F6]',
    borderColor: 'border-[#1899D6]',
    textColor: 'text-[#1CB0F6]',
    lightBg: 'bg-[#DDF4FF]',
    icon: '📖',
  },
  {
    unitNum: 3,
    title: 'Unit 3: Conversational Phrasing',
    subtitle: 'Practice speaking aloud in real-world situations & marketplace dialogues',
    bg: 'bg-[#CE82FF]',
    borderColor: 'border-[#AF62E0]',
    textColor: 'text-[#CE82FF]',
    lightBg: 'bg-[#F4E5FF]',
    icon: '🗣️',
  },
  {
    unitNum: 4,
    title: 'Unit 4: Functional Literacy',
    subtitle: 'Read public signs, nav instructions, and complete simple interactive forms',
    bg: 'bg-[#FF9600]',
    borderColor: 'border-[#E08400]',
    textColor: 'text-[#FF9600]',
    lightBg: 'bg-[#FFF0D9]',
    icon: '🏆',
  },
];

// Snake path horizontal position offset classes (center -> left -> far left -> left -> center -> right -> far right -> right)
const OFFSET_CLASSES = [
  'translate-x-0',
  '-translate-x-10 sm:-translate-x-16',
  '-translate-x-20 sm:-translate-x-28',
  '-translate-x-10 sm:-translate-x-16',
  'translate-x-0',
  'translate-x-10 sm:translate-x-16',
  'translate-x-20 sm:translate-x-28',
  'translate-x-10 sm:translate-x-16',
];

const CourseFlow = ({
  t = {},
  lessons = [],
  completedLessons = new Set(),
  educationalLevel = 'none',
  fullName = '',
  loading = false,
  onOpenLesson,
}) => {
  const [activeModalLesson, setActiveModalLesson] = useState(null);

  const total = lessons.length;
  const completedCount = lessons.filter((l) => completedLessons.has(l.lesson_id)).length;
  const currentIndex = lessons.findIndex((l) => !completedLessons.has(l.lesson_id));
  const hasCurrent = currentIndex !== -1;
  const activeIdx = hasCurrent ? currentIndex : total - 1;

  const getStatus = (idx) => {
    if (completedLessons.has(lessons[idx].lesson_id)) return 'completed';
    if (idx === currentIndex) return 'current';
    return 'locked';
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#58CC02]/30 border-t-[#58CC02] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Building Your Assigned Path...</p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center py-24 animate-fade-in">
        <div className="text-center max-w-sm mx-auto p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-[#E5F7D3] border-4 border-[#58CC02] flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">🦉</div>
          <h3 className="text-lg font-black text-slate-800 mb-1">No Courses Assigned Yet</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">Complete your initial placement assessment to unlock your personalized assigned course tree!</p>
        </div>
      </div>
    );
  }

  // Divide lessons into units of 3-4 lessons each
  const unitSize = 3;
  const units = [];
  for (let i = 0; i < total; i += unitSize) {
    units.push({
      unitIndex: Math.floor(i / unitSize),
      theme: UNIT_THEMES[Math.floor(i / unitSize) % UNIT_THEMES.length],
      lessons: lessons.slice(i, i + unitSize),
      startIndex: i,
    });
  }

  return (
    <div className="flex flex-col h-full w-full gap-6 text-slate-800 animate-fade-in font-sans select-none pb-12">
      
      {/* ══════════════════ DUOLINGO TOP STATS BAR ══════════════════ */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-2">
        {/* Track Title with AI Evaluation Badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🦉</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide leading-none">
                {fullName ? `${fullName}'s` : 'My'} Step-Wise Learning Path
              </h2>
              <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                🤖 AI Evaluated: {LEVEL_LABELS[educationalLevel] || 'Foundational Track'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">
              Step-by-step progressive lesson & module tree
            </span>
          </div>
        </div>

        {/* Duolingo Gamification Counters */}
        <div className="flex items-center gap-2 sm:gap-4 font-black text-xs sm:text-sm font-mono">
          <div className="flex items-center gap-1 text-[#FF9600] bg-[#FFF0D9] border border-[#FF9600]/30 px-2.5 py-1 rounded-full shadow-sm">
            <span className="animate-pulse">🔥</span>
            <span>3</span>
          </div>
          <div className="flex items-center gap-1 text-[#1CB0F6] bg-[#DDF4FF] border border-[#1CB0F6]/30 px-2.5 py-1 rounded-full shadow-sm">
            <span>💎</span>
            <span>{completedCount * 50 + 150}</span>
          </div>
          <div className="flex items-center gap-1 text-[#58CC02] bg-[#E5F7D3] border border-[#58CC02]/30 px-2.5 py-1 rounded-full shadow-sm">
            <span>⭐</span>
            <span>{completedCount}/{total}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════ DUOLINGO SNAKING LEARNING PATH ══════════════════ */}
      <div className="flex-1 bg-[#F7F7F7] rounded-3xl border-2 border-slate-200 p-4 sm:p-8 overflow-y-auto scrollbar-thin relative min-h-[500px]">
        
        <div className="max-w-md mx-auto space-y-12 relative">
          
          {units.map((unit) => {
            const { unitIndex, theme, lessons: unitLessons, startIndex } = unit;
            
            return (
              <div key={unitIndex} className="space-y-8 relative">
                
                {/* ── DUOLINGO UNIT HEADER BANNER ── */}
                <div className={`relative ${theme.bg} ${theme.borderColor} border-b-4 rounded-3xl p-5 text-white shadow-lg space-y-2 overflow-hidden`}>
                  {/* Subtle diagonal background pattern */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2.5px)', backgroundSize: '16px 16px' }} />
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full text-white/90">
                        SECTION 1 · {theme.title}
                      </span>
                      <h3 className="text-base sm:text-lg font-black mt-1.5 leading-tight">{theme.subtitle}</h3>
                    </div>
                    <span className="text-4xl shrink-0 opacity-90">{theme.icon}</span>
                  </div>

                  <div className="relative z-10 pt-1 flex items-center justify-between border-t border-white/20 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      {unitLessons.length} Lessons
                    </span>
                    <button
                      type="button"
                      onClick={() => alert(`Unit Guidebook: ${theme.title}\n${theme.subtitle}`)}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      📖 Guidebook
                    </button>
                  </div>
                </div>

                {/* ── STEP-WISE MODULE TIMELINE PATH FOR THIS UNIT ── */}
                <div className="flex flex-col items-center gap-8 py-6 relative">
                  
                  {/* Step Connector Line */}
                  <div className="absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-1 bg-slate-200 pointer-events-none rounded-full" />

                  {unitLessons.map((les, idxInUnit) => {
                    const globalIdx = startIndex + idxInUnit;
                    const status = getStatus(globalIdx);
                    const isCurrent = status === 'current';
                    const isCompleted = status === 'completed';
                    const isLocked = status === 'locked';

                    return (
                      <div
                        key={les.lesson_id || globalIdx}
                        className="relative z-10 w-full max-w-lg flex flex-col items-center transition-all duration-300"
                      >
                        
                        {/* ── STEP CARD (STEP-WISE MODULE VIEW) ── */}
                        <div 
                          onClick={() => {
                            if (!isLocked) {
                              setActiveModalLesson({ les, globalIdx, status });
                            }
                          }}
                          className={`w-full p-5 rounded-3xl border-2 transition-all shadow-md relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isCompleted
                              ? 'bg-white border-[#58CC02] shadow-emerald-500/10 cursor-pointer hover:scale-[1.01]'
                              : isCurrent
                              ? 'bg-white border-[#58CC02] ring-4 ring-[#58CC02]/20 shadow-xl cursor-pointer scale-105'
                              : 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
                          }`}
                        >
                          {/* STEP NUMBER BADGE & ICON */}
                          <div className="flex items-center gap-3.5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 font-black shadow-inner ${
                              isCompleted ? 'bg-[#58CC02] text-white' :
                              isCurrent ? 'bg-[#58CC02] text-white animate-pulse' :
                              'bg-slate-200 text-slate-500'
                            }`}>
                              {isCompleted ? '✓' : isCurrent ? (les.icon || '⚡') : '🔒'}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                  isCurrent ? 'bg-[#E5F7D3] text-[#46A302]' :
                                  'bg-slate-200 text-slate-600'
                                }`}>
                                  STEP {globalIdx + 1}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold text-white bg-[#58CC02] px-2 py-0.5 rounded-full animate-bounce">
                                    CURRENT STEP
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black text-slate-900 mt-1">{les.title}</h4>
                              <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                                {les.description || 'Master step-by-step character tracing, voice practice, and phonics audio.'}
                              </p>
                            </div>
                          </div>

                          {/* ACTION & XP BADGE */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0 gap-1.5">
                            <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                              +25 XP
                            </span>
                            <button
                              type="button"
                              disabled={isLocked}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm ${
                                isCompleted
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : isCurrent
                                  ? 'bg-[#58CC02] hover:bg-[#46A302] text-white border-b-2 border-[#398201]'
                                  : 'bg-slate-200 text-slate-400'
                              }`}
                            >
                              {isCompleted ? 'Review Step' : isCurrent ? 'Start Step →' : 'Locked 🔒'}
                            </button>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                  
                </div>

              </div>
            );
          })}

        </div>

      </div>

      {/* ══════════════════ DUOLINGO LESSON MODAL CARD ══════════════════ */}
      {activeModalLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-4 border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-scale-up">
            
            {/* Close button */}
            <button
              onClick={() => setActiveModalLesson(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-black w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            {/* Lesson Big Icon Header */}
            <div className="w-24 h-24 rounded-full bg-[#E5F7D3] border-4 border-[#58CC02] flex items-center justify-center text-5xl mx-auto shadow-inner animate-bounce">
              {activeModalLesson.les.icon || '📖'}
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#58CC02] bg-[#E5F7D3] px-3 py-1 rounded-full border border-[#58CC02]/30">
                Lesson {activeModalLesson.globalIdx + 1} of {total}
              </span>
              <h3 className="text-xl font-black text-slate-800 mt-2">{activeModalLesson.les.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
                {activeModalLesson.les.description || 'Master key character strokes, audio pronunciation, and interactive vocabulary.'}
              </p>
            </div>

            {/* Skills & Rewards */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span>Type: {activeModalLesson.les.type || 'Lesson'}</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <span>⭐</span>
                <span>Reward: +25 XP</span>
              </div>
            </div>

            {/* 3D Duolingo Green Start Button */}
            <button
              onClick={() => {
                const les = activeModalLesson.les;
                setActiveModalLesson(null);
                if (typeof onOpenLesson === 'function') {
                  onOpenLesson(les);
                }
              }}
              className="w-full py-4 bg-[#58CC02] hover:bg-[#46A302] active:translate-y-1 text-white font-black rounded-2xl text-sm uppercase tracking-wider border-b-4 border-[#398201] shadow-lg shadow-[#58CC02]/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{activeModalLesson.status === 'completed' ? 'REVIEW LESSON (+10 XP)' : 'START LESSON (+25 XP)'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CourseFlow;
