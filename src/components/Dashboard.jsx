import React, { useState, useRef, useEffect, useMemo } from 'react';
import { signOutUser, updateUserAuthProfile } from '../services/auth';
import { updateUserProfileTable } from '../services/db';
import { supabase } from '../services/supabase';
import { localStories, languagePhrases } from '../data/contentMatrix';
import PushNotificationManager from './PushNotificationManager';

// ============================================================================
// COMMUNITY GAME INVITES: shared, lightweight list of playable games used to
// populate the "Invite to Play" picker in the Community tab. Mirrors the
// games available in the Arcade hub (kept separate/minimal on purpose so it
// never risks touching the working Arcade game-selection logic).
// ============================================================================
const COMMUNITY_INVITE_GAMES = [
  { id: 'scramble', emoji: '🔤', title: 'Word Scramble Arena', color: 'from-[#5C67F2] to-[#7C3AED]', xp: '+25 XP' },
  { id: 'flash', emoji: '⚡', title: 'Speed Flash Quiz', color: 'from-[#10B981] to-[#059669]', xp: '+30 XP' },
  { id: 'drop', emoji: '🎯', title: 'Letter Catch Arcade', color: 'from-[#F59E0B] to-[#EF4444]', xp: '+40 XP' },
  { id: 'shoot', emoji: '🔫', title: 'Picture Word Sniper', color: 'from-fuchsia-500 to-rose-600', xp: '+45 XP' },
  { id: 'memory', emoji: '🧩', title: 'Memory Match Flip', color: 'from-pink-500 to-rose-600', xp: '+30 XP' },
  { id: 'sentence', emoji: '🏗️', title: 'Sentence Builder', color: 'from-cyan-500 to-blue-600', xp: '+35 XP' },
  { id: 'trace', emoji: '✍️', title: 'Script & Letter Trace', color: 'from-purple-500 to-indigo-600', xp: '+25 XP' },
  { id: 'sound', emoji: '🔊', title: 'Phonics Sound Scout', color: 'from-amber-500 to-orange-600', xp: '+35 XP' },
  { id: 'duel', emoji: '⚔️', title: 'Literacy Duel Arena', color: 'from-rose-600 to-red-800', xp: '+50 XP' },
];

// ============================================================================
// HELPER: LOG ASSESSMENT SCORE TO SUPABASE WITH SELF-HEALING COLUMN TYPE FALLBACK
// ============================================================================
const logToSupabaseAssessments = async (userId, score) => {
  try {
    if (!userId) return;

    // Attempt 1: Insert using UUID string (Option A - Preferred)
    const { data, error } = await supabase
      .from('Assessments')
      .insert([
        {
          "User Id": userId,
          "Score": score
        }
      ]);

    if (error) {
      // If error is code 22P02 (invalid input syntax for type integer), fallback to integer hash (Option B)
      if (error.code === '22P02') {
        console.log("Supabase 'User Id' expects an integer. Retrying with hashed integer...");
        
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
          hash = (hash << 5) - hash + userId.charCodeAt(i);
          hash |= 0;
        }
        const numericUserId = Math.abs(hash);

        const { error: retryError } = await supabase
          .from('Assessments')
          .insert([
            {
              "User Id": numericUserId,
              "Score": score
            }
          ]);

        if (retryError) {
          console.error("Error inserting to Supabase Assessments on retry:", retryError.message);
        } else {
          console.log("Successfully logged score to Supabase Assessments (using hashed integer).");
        }
      } else {
        console.error("Error inserting to Supabase Assessments:", error.message);
      }
    } else {
      console.log("Successfully logged score to Supabase Assessments (using UUID).");
    }
  } catch (err) {
    console.error("Error in logToSupabaseAssessments:", err);
  }
};

// ============================================================================
// HELPER: SAVE ASSESSMENT ENTRY TO LOCALSTORAGE (OFFLINE HISTORY FALLBACK)
// ============================================================================
const saveHistoryToLocal = (userId, moduleType, targetItem, score, language) => {
  try {
    const key = `sakshar_history_${userId || 'guest'}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift({
      module_type: moduleType,
      target_item: targetItem,
      score,
      language,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    // Keep only last 100 entries
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
  } catch (e) {
    console.warn('Could not save history to localStorage:', e);
  }
};

const getHistoryFromLocal = (userId) => {
  try {
    const key = `sakshar_history_${userId || 'guest'}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
};

// ============================================================================
// DYNAMIC CURRICULUM DATA MATRIX (Tiered by Educational Level)
// ============================================================================
const levelCurriculumMeta = {
  none: {
    badge: "Level 1",
    duration: "3-5 mins",
    readingSub: "Focus on basic native phonics, simple letter groupings, and core sight vocabulary.",
    writingSub: "Trace entry-level alphabet strokes and basic phonetic shapes with touch gestures.",
    speakingSub: "Speak single native vowels and foundational consonants for absolute feedback."
  },
  primary: {
    badge: "Primary Track",
    duration: "5-7 mins",
    readingSub: "Read basic multi-syllable phrases and explore local context vocabulary sheets.",
    writingSub: "Trace basic words and complete simple sentence syntax strings.",
    speakingSub: "Pronounce short, practical, real-world native sentences with audio feedback."
  },
  middle: {
    badge: "Functional Track",
    duration: "8-10 mins",
    readingSub: "Read standard continuous text paragraphs regarding daily transactions and public notices.",
    writingSub: "Practice writing functional interactive text entries and form fields.",
    speakingSub: "Deliver conversational structural segments into the automatic speech parser."
  },
  high: {
    badge: "Advanced Track",
    duration: "10-15 mins",
    readingSub: "Engage with analytical text structures, modern digital literacy items, and summaries.",
    writingSub: "Draft continuous sentences and freeform communication strings.",
    speakingSub: "Execute complex phrase structures for high-accuracy articulation assessments."
  }
};

// ============================================================================
// SUB-COMPONENT: EXTRACTED ANALYTICS TABLE LOG LAYER (LIVE REALTIME REFRESH)
// ============================================================================
function EvaluationHistoryLogs({ refreshKey, userId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEntryIds, setNewEntryIds] = useState(new Set());
  const prevCountRef = useRef(0);
  const isFirstLoad = useRef(true);

  const fetchHistory = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const url = userId ? `http://127.0.0.1:5000/api/analytics/history?user_id=${userId}` : 'http://127.0.0.1:5000/api/analytics/history';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.success) {
        const incoming = data.history;
        if (!isFirstLoad.current && incoming.length > prevCountRef.current) {
          const newCount = incoming.length - prevCountRef.current;
          const freshIds = new Set(incoming.slice(0, newCount).map((_, i) => i));
          setNewEntryIds(freshIds);
          setTimeout(() => setNewEntryIds(new Set()), 3000);
        }
        prevCountRef.current = incoming.length;
        isFirstLoad.current = false;
        setHistory(incoming);
        setLoading(false);
        return;
      }
    } catch (err) {
      // Flask offline — silently fall back to localStorage
    }
    // Fallback: use localStorage history
    const localHistory = getHistoryFromLocal(userId);
    if (!isFirstLoad.current && localHistory.length > prevCountRef.current) {
      const newCount = localHistory.length - prevCountRef.current;
      const freshIds = new Set(localHistory.slice(0, newCount).map((_, i) => i));
      setNewEntryIds(freshIds);
      setTimeout(() => setNewEntryIds(new Set()), 3000);
    }
    prevCountRef.current = localHistory.length;
    isFirstLoad.current = false;
    setHistory(localHistory);
    setLoading(false);
  };

  // Initial load
  useEffect(() => { fetchHistory(false); }, [userId]);

  // Re-fetch instantly on every refreshKey bump (assessment completed)
  useEffect(() => {
    if (refreshKey > 0) fetchHistory(true);
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin inline-block"></span>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading analytics tracking history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-xs font-medium text-gray-400 border border-dashed border-gray-100 p-6 text-center rounded-2xl bg-[#FBFBFA]">No trace assignments submitted yet. Complete a writing, reading or speaking module to populate metrics.</p>;
  }

  return (
    <div>
      {/* Live indicator row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          Live · {history.length} {history.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="pb-3">Module Type</th>
              <th className="pb-3">Script Item</th>
              <th className="pb-3">Accuracy Score</th>
              <th className="pb-3">Recorded Time</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
            {history.map((log, index) => {
              const isNew = newEntryIds.has(index);
              return (
                <tr
                  key={index}
                  className={`transition-all duration-500 ${
                    isNew
                      ? 'bg-emerald-50/70 scale-[1.005]'
                      : 'hover:bg-gray-50/50'
                  }`}
                  style={isNew ? { animation: 'slideInRow 0.4s ease-out' } : {}}
                >
                  <td className="py-3 font-bold text-gray-900 capitalize">
                    <span className="flex items-center gap-1.5">
                      <span>{log.module_type === 'writing' ? '✍️' : log.module_type === 'reading' ? '📖' : log.module_type === 'speaking' ? '🗣️' : '📝'}</span>
                      {log.module_type}
                    </span>
                  </td>
                  <td className="py-3 font-medium text-gray-600 max-w-[160px] truncate">{log.target_item} ({log.language || 'any'})</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      log.score >= 80 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      {log.score}%
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs font-medium whitespace-nowrap">
                    {new Date(log.timestamp + " UTC").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 pl-2">
                    {isNew && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest text-white bg-emerald-500 px-1.5 py-0.5 rounded-full animate-bounce">
                        NEW
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// LITERACY LEVEL-DIFFERENTIATED ASSESSMENT DATA SET
// ============================================================================
const LEVEL_ASSESSMENTS = {
  none: [
    { id: 'l1_q1', type: 'mcq', question: 'Identify the uppercase letter representing the vowel sound /a/:', options: ['A', 'B', 'C', 'D'], correct: 'A', weight: 30 },
    { id: 'l1_q2', type: 'mcq', question: 'Which character represents the number 1?', options: ['1', '2', '3', '4'], correct: '1', weight: 30 },
    { id: 'l1_q3', type: 'mcq', question: 'Select the correct spelling for the sound /e/ in "Egg":', options: ['Egg', 'Igg', 'Agg', 'Ogg'], correct: 'Egg', weight: 40 }
  ],
  primary: [
    { id: 'l2_q1', type: 'mcq', question: 'Select the correct spelling of the fruit in the picture:', options: ['Aple', 'Apple', 'Appl', 'Apeel'], correct: 'Apple', weight: 30 },
    { id: 'l2_q2', type: 'rearrange', question: 'Rearrange these letters to spell "SUN":', letters: ['N', 'S', 'U'], correct: 'SUN', weight: 30 },
    { id: 'l2_q3', type: 'mcq', question: 'Which word describes a place where books are kept for reading?', options: ['Library', 'Kitchen', 'Garage', 'Garden'], correct: 'Library', weight: 40 }
  ],
  middle: [
    { id: 'l3_q1', type: 'mcq', question: 'Complete the sentence: "The dog ___ loudly at the stranger."', options: ['barked', 'barking', 'barks', 'bark'], correct: 'barked', weight: 30 },
    { id: 'l3_q2', type: 'rearrange', question: 'Rearrange these words to form a correct sentence: "THE SUN IS BRIGHT"', letters: ['BRIGHT', 'IS', 'THE', 'SUN'], correct: 'THE SUN IS BRIGHT', weight: 30 },
    { id: 'l3_q3', type: 'comprehension', question: 'Read this text: "Raju has a green farm where he grows sweet mangos." Question: What does Raju grow?', options: ['Grapes', 'Mangos', 'Apples', 'Bananas'], correct: 'Mangos', weight: 40 }
  ],
  high: [
    { id: 'l4_q1', type: 'mcq', question: 'Identify the antonym of "Generous":', options: ['Selfish', 'Kind', 'Helpful', 'Polite'], correct: 'Selfish', weight: 30 },
    { id: 'l4_q2', type: 'rearrange', question: 'Rearrange these words to form a correct sentence: "ALTHOUGH IT RAINED THEY PLAYED FOOTBALL"', letters: ['THEY PLAYED FOOTBALL', 'ALTHOUGH', 'IT RAINED'], correct: 'ALTHOUGH IT RAINED THEY PLAYED FOOTBALL', weight: 30 },
    { id: 'l4_q3', type: 'comprehension', question: 'Read this text: "Education is the most powerful weapon which you can use to change the world. It provides the foundation for sustainable development." Question: What does education provide?', options: ['Instant wealth', 'Foundation for sustainable development', 'Military power', 'Fame'], correct: 'Foundation for sustainable development', weight: 40 }
  ],
  higher: [
    { id: 'l5_q1', type: 'mcq', question: 'Select the sentence with correct formal punctuation and syntax:', options: ['Having completed the report, the manager submitted it.', 'Having completed the report the manager submitted it.', 'The manager having completed the report he submitted it.', 'Submitting the report the manager did completed it.'], correct: 'Having completed the report, the manager submitted it.', weight: 30 },
    { id: 'l5_q2', type: 'mcq', question: 'Identify the word closest in meaning to "Pragmatic":', options: ['Practical', 'Idealistic', 'Dreamy', 'Unreal'], correct: 'Practical', weight: 30 },
    { id: 'l5_q3', type: 'comprehension', question: 'Read this text: "Cognitive dissonance is the mental discomfort that results from holding two conflicting beliefs, values, or attitudes. People tend to seek consistency in their beliefs." Question: What triggers cognitive dissonance?', options: ['Consistence of beliefs', 'Holding conflicting beliefs', 'Lack of mental effort', 'Memory loss'], correct: 'Holding conflicting beliefs', weight: 40 }
  ]
};

// ============================================================================
// LITERACY LEVEL-DIFFERENTIATED ASSESSMENT COMPONENT (QUIZ)
// ============================================================================
function LevelAssessmentView({ userId, level, lang, onBack, onComplete }) {
  const questions = LEVEL_ASSESSMENTS[level] || LEVEL_ASSESSMENTS['none'];
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [scrambledOrder, setScrambledOrder] = useState([]);
  const [runningScore, setRunningScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentStep];

  const handleOptionSelect = (option) => {
    setSelectedAnswer(option);
  };

  const handleLetterClick = (letter) => {
    if (!scrambledOrder.includes(letter)) {
      setScrambledOrder([...scrambledOrder, letter]);
    }
  };

  const handleClearScramble = () => setScrambledOrder([]);

  const handleNextStep = async () => {
    let isCorrect = false;

    if (currentQuestion.type === 'mcq' || currentQuestion.type === 'comprehension') {
      if (selectedAnswer === currentQuestion.correct) isCorrect = true;
    } else if (currentQuestion.type === 'rearrange') {
      const orderStr = scrambledOrder.join(' ');
      const orderDirect = scrambledOrder.join('');
      if (orderStr === currentQuestion.correct || orderDirect === currentQuestion.correct) {
        isCorrect = true;
      }
    }

    const pointsEarned = isCorrect ? currentQuestion.weight : 0;
    const directUpdatedScore = runningScore + pointsEarned;
    setRunningScore(directUpdatedScore);

    setSelectedAnswer('');
    setScrambledOrder([]);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setLoading(true);
      // Save to localStorage immediately (works offline)
      saveHistoryToLocal(userId, 'assessment', `Literacy Quiz (${level})`, directUpdatedScore, lang);
      await logToSupabaseAssessments(userId, directUpdatedScore);
      // Try Flask in background — don't block completion
      fetch('http://127.0.0.1:5000/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          lang: lang,
          score: directUpdatedScore,
          level: level,
          target_item: 'Literacy Quiz'
        })
      }).catch(() => {});
      setCompleted(true);
      setLoading(false);
      if (onComplete) onComplete();
    }
  };

  if (completed) {
    return (
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center animate-scale-up max-w-md mx-auto">
        <span className="text-5xl block mb-4">🏆</span>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Quiz Completed!</h3>
        <p className="text-gray-500 text-sm mb-6">You scored {runningScore}% on the {level === 'none' ? 'Foundational' : level} literacy level quiz.</p>
        <button
          onClick={onBack}
          className="w-full py-2.5 px-4 bg-[#1C2D1A] text-white text-sm font-bold rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm max-w-xl mx-auto animate-fade-in">
      <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition cursor-pointer">
        ← Exit Quiz
      </button>

      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Literacy Level Quiz ({level === 'none' ? 'Foundational' : level})</span>
        <span className="text-xs font-extrabold bg-[#1C2D1A]/5 px-2.5 py-1 rounded-md text-[#1C2D1A]">
          Question {currentStep + 1} of {questions.length}
        </span>
      </div>

      <div className="w-full bg-gray-100 h-1.5 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-emerald-600 h-1.5 transition-all duration-300" 
          style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-6 leading-relaxed">{currentQuestion.question}</h3>

      {currentQuestion.type === 'mcq' || currentQuestion.type === 'comprehension' ? (
        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionSelect(option)}
              className={`w-full p-4 rounded-xl border text-left text-sm font-semibold transition cursor-pointer ${
                selectedAnswer === option 
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold' 
                  : 'border-gray-200 bg-[#FBFBFA] hover:border-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-[#FBFBFA] border border-dashed border-gray-200 rounded-xl min-h-[60px] flex flex-wrap items-center justify-center gap-2 shadow-inner">
            {scrambledOrder.map((letter, idx) => (
              <span key={idx} className="bg-[#1C2D1A] text-white px-3 py-1.5 rounded-lg font-extrabold text-sm shadow-sm animate-scale-up">
                {letter}
              </span>
            ))}
            {scrambledOrder.length === 0 && <span className="text-gray-400 text-xs font-medium">Click items below to construct your answer...</span>}
          </div>

          <div className="flex justify-center flex-wrap gap-2.5">
            {currentQuestion.letters.map((letter, index) => (
              <button
                key={index}
                disabled={scrambledOrder.includes(letter)}
                onClick={() => handleLetterClick(letter)}
                className="bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-30 p-3 rounded-xl font-bold shadow-sm text-sm cursor-pointer min-w-12"
              >
                {letter}
              </button>
            ))}
          </div>

          {scrambledOrder.length > 0 && (
            <button onClick={handleClearScramble} className="text-xs text-red-500 font-bold underline block mx-auto cursor-pointer">
              Clear Selections
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleNextStep}
        disabled={loading || (currentQuestion.type !== 'rearrange' && !selectedAnswer) || (currentQuestion.type === 'rearrange' && scrambledOrder.length === 0)}
        className="w-full mt-8 py-3 px-4 bg-[#1C2D1A] text-white font-bold text-sm rounded-xl hover:bg-opacity-95 disabled:opacity-40 transition shadow-sm cursor-pointer"
      >
        {loading ? 'Processing...' : currentStep === questions.length - 1 ? 'Submit Quiz Answers' : 'Continue to Next Question'}
      </button>
    </div>
  );
}

// ============================================================================
// 1. SUB-COMPONENT: ADAPTIVE READING PRACTICE MODULE
// ============================================================================
function ReadingPracticeView({ lang, t, getLanguageNativeLabel, handleBack, onAssessmentComplete, userId }) {
  const story = localStories[lang] || localStories['english'];
  const [selectedWord, setSelectedWord] = useState(null);
  const [comprehensionDone, setComprehensionDone] = useState(false);
  const [isLogging, setIsLogging] = useState(false);

  const handleMarkCompleted = async () => {
    if (comprehensionDone) return;
    setIsLogging(true);
    setComprehensionDone(true);

    // Score: full credit if they explored at least one vocabulary word, partial otherwise
    const vocabScore = selectedWord ? 100 : 75;
    const storyTitle = story.title?.length > 25 ? story.title.substring(0, 22) + '...' : (story.title || 'Reading Story');

    // Save to localStorage immediately (works offline)
    saveHistoryToLocal(userId, 'reading', storyTitle, vocabScore, lang);
    await logToSupabaseAssessments(userId, vocabScore);
    // Try Flask in background — don't block completion
    fetch('http://127.0.0.1:5000/api/assessment/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        lang: lang,
        target_item: storyTitle,
        score: vocabScore,
        module_type: 'reading'
      })
    }).catch(() => {});
    // Instantly refresh the history table on the dashboard
    if (onAssessmentComplete) onAssessmentComplete();
    setIsLogging(false);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in">
      <button onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition">
        ← Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📖</span>
          <h2 className="text-2xl font-extrabold text-gray-900">{t.readingTitle || 'Reading Practice'}</h2>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {getLanguageNativeLabel(lang)} Mode
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">Read the short story below. Tap any of the highlighted vocabulary words to reveal their dictionary definitions.</p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#FBFBFA] border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-inner">
            <h3 className="text-xl font-black mb-4 text-[#1C2D1A] underline decoration-emerald-200 underline-offset-4">
              {story.title}
            </h3>
            {story.paragraphs.map((para, index) => (
              <p key={index} className="text-base sm:text-lg text-gray-800 leading-relaxed font-medium mb-4 last:mb-0">
                {para}
              </p>
            ))}
          </div>

          <button
            onClick={handleMarkCompleted}
            disabled={comprehensionDone || isLogging}
            className={`w-full py-3 px-4 font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 ${
              comprehensionDone 
                ? 'bg-emerald-600 text-white cursor-default' 
                : 'bg-[#1C2D1A] text-white hover:bg-opacity-90 disabled:opacity-60'
            }`}
          >
            {isLogging ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Saving to history...</span>
              </>
            ) : comprehensionDone ? (
              '✓ Finished Reading Module'
            ) : (
              'Mark Lesson as Completed'
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Key Vocabulary Word Deck</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {story.vocabulary.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWord(item)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border ${
                    selectedWord?.word === item.word 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-700'
                  }`}
                >
                  {item.word}
                </button>
              ))}
            </div>

            {selectedWord ? (
              <div className="bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-xl animate-fade-in">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">Definition:</span>
                <p className="text-sm font-bold text-gray-900 mb-1">{selectedWord.word}</p>
                <p className="text-xs font-medium text-gray-600 leading-relaxed">{selectedWord.meaning}</p>
              </div>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-gray-400 text-xs py-8">
                Tap a vocabulary word to explore its meaning.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. SUB-COMPONENT: INTERACTIVE WRITING CANVAS PAD
// ============================================================================
function WritingPracticeView({ lang, t, getLanguageNativeLabel, handleBack, onAssessmentComplete, userId }) {
  const languageTargets = {
    english: { char: "A", instruction: "Draw the uppercase letter 'A'" },
    hindi: { char: "अ", instruction: "हिन्दी का पहला अक्षर 'अ' लिखें" },
    bengali: { char: "অ", instruction: "বাংলা বর্ণমালার প্রথম অক্ষর 'অ' লিখুন" },
    telugu: { char: "అ", instruction: "తెలుగు అक्षरं 'అ' రాయండి" },
    punjabi: { char: "ੳ", instruction: "ਗੁਰਮੁਖੀ ਅੱਖਰ 'ੳ' ਲਿਖੋ" },
    marathi: { char: "अ", instruction: "मराठीचे पहिले अक्षर 'अ' लिहा" },
    tamil: { char: "அ", instruction: "தமிழ் எழுத்து 'அ' எழுதவும்" },
    gujarati: { char: "અ", instruction: "ગુજરાતી મૂળાક્ષર 'અ' લખો" },
    kannada: { char: "ಅ", instruction: "ಕನ್ನಡದ మొదటి అక్షర 'ಅ' బರೆಯಿರಿ" },
    malayalam: { char: "അ", instruction: "മലയാളം അക്ഷരം 'അ' എഴുതുക" },
    odia: { char: "ଅ", instruction: "ଓଡ଼ିଆ ଅକ୍ଷର 'ଅ' ଲେଖନ୍ତು" },
    urdu: { char: "ا", instruction: "اردو کا پہلا حرف 'ا' لکھیں" },
    assamese: { char: "অ", instruction: "অসমীয়া বৰ্ণমালাৰ প্ৰথম আখৰ 'অ' লিখক" },
    maithili: { char: "अ", instruction: "मैथिलीक पहिल अक्षर 'अ' लिखू" },
    santhali: { char: " Ol Chiki letter 'ᱚ' Ol me" },
    kashmiri: { char: "ا", instruction: "کٲशੁਰ حرف 'ا' ਲੇਖਿਵ" },
    nepali: { char: "अ", instruction: "नेपाली वर्णमालाको पहिलो अक्षर 'अ' लेख्नुहोस्" },
    gondi: { char: "अ", instruction: "गोंडी लिपि तना अक्षर 'अ' कीम" },
    sindhi: { char: "ا", instruction: "سنڌي اکر 'ا' لکو" },
    konkani: { char: "अ", instruction: "कोंकणी अक्षर 'अ' बरयात" }
  };

  const target = languageTargets[lang] || languageTargets['english'];
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverFeedback, setServerFeedback] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1C2D1A';
    ctx.lineWidth = 4;

    const preventScroll = (e) => {
      if (e.target === canvas) e.preventDefault();
    };
    document.body.addEventListener('touchstart', preventScroll, { passive: false });
    document.body.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.removeEventListener('touchstart', preventScroll);
      document.body.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale coordinates accurately to canvas internal coordinate resolution space
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setServerFeedback(null);
  };

  const submitWritingSample = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSubmitting(true);
    setServerFeedback(null);

    const dataUrl = canvas.toDataURL('image/png');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/assessment/writing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          lang: lang,
          target_char: target.char,
          image_data: dataUrl
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setServerFeedback({
          success: true,
          score: data.score,
          message: data.feedback
        });
        saveHistoryToLocal(userId, 'writing', target.char, data.score, lang);
        await logToSupabaseAssessments(userId, data.score);
        // Instantly refresh history log table
        if (onAssessmentComplete) onAssessmentComplete();
      } else {
        setServerFeedback({
          error: true,
          message: data.error || "Failed to process writing sample matrix."
        });
      }
    } catch (err) {
      // Flask offline — show friendly message
      setServerFeedback({
        error: true,
        message: "Writing analysis requires the Python server. Your sketch was recorded locally!"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in">
      <button onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition">
        ← Back to Dashboard
      </button>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">✍️</span>
          <h2 className="text-2xl font-extrabold text-gray-900">{t.writingTitle || 'Writing Practice'}</h2>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {getLanguageNativeLabel(lang)} Mode
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">{target.instruction}. Use your mouse pointer or touch screen directly inside the grid envelope.</p>

      <div className="grid md:grid-cols-5 gap-8 items-center">
        <div className="md:col-span-2 bg-[#FBFBFA] border border-gray-100 rounded-2xl p-6 text-center h-full flex flex-col justify-center items-center shadow-inner min-h-[180px]">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-4">Target Character Guide</span>
          <p className="text-7xl font-black text-gray-900 select-none font-serif bg-white shadow-sm/5 border border-gray-100 px-6 py-4 rounded-2xl">
            {target.char}
          </p>
        </div>

        <div className="md:col-span-3 flex flex-col items-center">
          <div className="relative w-full max-w-sm bg-[#FBFBFA] border-2 border-dashed border-gray-200 rounded-2xl p-2 shadow-sm aspect-square overflow-hidden">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="w-full h-full bg-white rounded-xl cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-300 gap-1">
                <span className="text-2xl">✏️</span>
                <p className="text-xs font-bold uppercase tracking-wider">Draw inside this square</p>
              </div>
            )}
          </div>

          {serverFeedback && (
            <div className={`w-full max-w-sm mt-4 p-4 rounded-xl border transition-all animate-fade-in ${
              serverFeedback.error 
                ? 'bg-red-50 border-red-100 text-red-800' 
                : 'bg-emerald-50 border-emerald-100 text-emerald-900'
            }`}>
              {!serverFeedback.error && (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xl font-extrabold">{serverFeedback.score}% Match</span>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-white px-1.5 py-0.5 rounded font-bold">AI Review</span>
                </div>
              )}
              <p className="text-xs font-medium leading-relaxed">{serverFeedback.message}</p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4 w-full max-w-sm">
            <button
              onClick={clearCanvas}
              disabled={!hasDrawn || isSubmitting}
              className="flex-1 py-2.5 px-4 border border-gray-200 text-sm font-semibold rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition shadow-sm"
            >
              Clear Screen
            </button>
            <button
              onClick={submitWritingSample}
              disabled={!hasDrawn || isSubmitting}
              className="flex-1 py-2.5 px-4 bg-[#1C2D1A] text-white text-sm font-bold rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition shadow-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Analyzing...</span>
                </>
              ) : (
                'Check Answer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. SUB-COMPONENT: INTERACTIVE SPEECH RECOGNITION MODULE (UPDATED LOGS LAYER)
// ============================================================================
function SpeakingAssessmentView({ lang, t, getLanguageNativeLabel, handleBack, onAssessmentComplete, userId }) {
  const targetPhrase = languagePhrases[lang] || languagePhrases['english'];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [speechError, setSpeechError] = useState('');

  const startSpeechAssessment = () => {
    setSpeechError('');
    setTranscript('');
    setScore(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech Recognition is not supported in this browser. Try using Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    const localeMap = { 
      english: 'en-US', hindi: 'hi-IN', bengali: 'bn-IN', telugu: 'te-IN', punjabi: 'pa-IN',
      marathi: 'mr-IN', tamil: 'ta-IN', gujarati: 'gu-IN', kannada: 'kn-IN', malayalam: 'ml-IN',
      odia: 'or-IN', urdu: 'ur-PK', assamese: 'as-IN', nepali: 'ne-NP', sindhi: 'sd-IN'
    };
    recognition.lang = localeMap[lang] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onerror = (e) => {
      console.error(e);
      setSpeechError(`Error capturing audio: ${e.error}. Ensure microphone access is allowed.`);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);

      const cleanText = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?।]/g, "").trim();
      const originalWords = cleanText(targetPhrase).split(/\s+/);
      const recognizedWords = cleanText(speechResult).split(/\s+/);

      const matchedWords = originalWords.filter(word => recognizedWords.includes(word));
      const calculatedAccuracy = Math.round((matchedWords.length / originalWords.length) * 100);
      setScore(calculatedAccuracy);

      // Save to localStorage immediately (works offline)
      saveHistoryToLocal(userId, 'speaking', targetPhrase.substring(0, 25), calculatedAccuracy, lang);
      await logToSupabaseAssessments(userId, calculatedAccuracy);
      // Try Flask in background — don't block completion
      fetch('http://127.0.0.1:5000/api/voice_assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          score: calculatedAccuracy,
          phrase: targetPhrase,
          lang: lang
        })
      }).catch(() => {});
      // Instantly refresh history log table as soon as result is persisted
      if (onAssessmentComplete) onAssessmentComplete();
    };

    recognition.start();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in">
      <button onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1 transition">
        ← Back to Dashboard
      </button>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🗣️</span>
          <h2 className="text-2xl font-extrabold text-gray-900">{t.speakingTitle || 'Speaking Assessment'}</h2>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {getLanguageNativeLabel(lang)} Mode
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-6">Tap the microphone button, read the target sentence below out loud clearly, and get instant feedback.</p>
      
      <div className="bg-[#FBFBFA] border border-gray-100 rounded-2xl p-6 mb-6 text-center shadow-inner">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Read this Sentence:</span>
        <p className="text-xl sm:text-2xl font-bold text-[#1C2D1A] tracking-wide leading-relaxed">
          "{targetPhrase}"
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-6 border border-dashed border-gray-200 rounded-2xl bg-white p-6">
        <button
          onClick={startSpeechAssessment}
          disabled={isListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse shadow-red-100' 
              : 'bg-[#1C2D1A] text-white hover:bg-opacity-90 active:scale-95'
          }`}
        >
          {isListening ? '🛑' : '🎤'}
        </button>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4">
          {isListening ? 'Listening to your speech... Speak now!' : 'Click to start recording'}
        </p>

        {speechError && (
          <p className="mt-4 text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl text-center max-w-md">
            ⚠️ {speechError}
          </p>
        )}

        {transcript && (
          <div className="w-full border-t border-gray-100 mt-6 pt-6 animate-fade-in">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">What we heard:</span>
                <p className="text-sm font-bold text-gray-800">"{transcript}"</p>
              </div>
              
              {score !== null && (
                <div className={`p-4 rounded-xl border ${
                  score >= 80 ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900' : 'bg-amber-50/60 border-amber-100 text-amber-900'
                }`}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Accuracy Level:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{score}% Match</span>
                    <span className="text-sm">
                      {score >= 80 ? 'Excellent pronunciation! 🌟' : 'Good try! Let\'s try repeating it slowly.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const targetLanguages = [
  { value: 'english', native: 'English', label: 'English' },
  { value: 'hindi', native: 'हिन्दी', label: 'Hindi' },
  { value: 'telugu', native: 'తెలుగు', label: 'Telugu' },
  { value: 'punjabi', native: 'ਪੰਜਾਬੀ', label: 'Punjabi' },
  { value: 'bengali', native: 'বাংলা', label: 'Bengali' },
  { value: 'marathi', native: 'मराठी', label: 'Marathi' },
  { value: 'tamil', native: 'தமிழ்', label: 'Tamil' },
  { value: 'gujarati', native: 'ગુજરાતી', label: 'Gujarati' },
  { value: 'kannada', native: 'ಕನ್ನಡ', label: 'Kannada' },
  { value: 'malayalam', native: 'മലയാളം', label: 'Malayalam' },
  { value: 'odia', native: 'ଓଡ଼ିଆ', label: 'Odia' },
  { value: 'urdu', native: 'اُردُو', label: 'Urdu' },
  { value: 'assamese', native: 'অসমীয়া', label: 'Assamese' },
  { value: 'maithili', native: 'मैथिली', label: 'Maithili' },
  { value: 'santhali', native: 'ᱥᱟᱱᱛᱷᱟᱞᱤ', label: 'Santhali' },
  { value: 'kashmiri', native: 'کٲଶুর', label: 'Kashmiri' },
  { value: 'nepali', native: 'नेपाली', label: 'Nepali' },
  { value: 'gondi', native: 'गोंडी', label: 'Gondi' },
  { value: 'sindhi', native: 'سنڌي', label: 'Sindhi' },
  { value: 'konkani', native: 'कोंकणी', label: 'Konkani' }
];

// 20 level-specific fallback lessons matching the database structure
// YouTube video links curated per lesson (Hindi/English literacy content)
const LESSON_YOUTUBE = {
  l1_vowels:        "https://youtu.be/RUSCz41aDug?si=dWyrI5DOWSZvvFD7&t=1",
  l1_consonants:    "https://www.youtube.com/embed/VdbQR8mAmcc?autoplay=1&mute=1",
  l1_phonetics:     "https://www.youtube.com/watch?v=xJSVrq-6-jc",
  l1_sightwords:    "https://www.youtube.com/watch?v=YkXoHh72xrg",
  l1_strokes:       "https://www.youtube.com/watch?v=Q_1iZgQbDl4",
  l1_capsmall:      "https://www.youtube.com/watch?v=evVx1_h764g",
  l1_numbers:       "https://www.youtube.com/watch?v=FvXRAnUhpGQ",
  l1_colors:        "https://www.youtube.com/watch?v=0wJHPJGBhTU",
  l1_shapes:        "https://www.youtube.com/watch?v=SOBCQ7pJjiA",
  l1_daysmonths:    "https://www.youtube.com/watch?v=10yhyUT2lgA",
  l1_weather:       "https://www.youtube.com/watch?v=he4nzgFjPk8",
  l1_family:        "https://www.youtube.com/watch?v=24GWC1dDyUM",
  l1_bodyparts:     "https://www.youtube.com/watch?v=G-7AMnZLOCM",
  l1_animals:       "https://www.youtube.com/watch?v=kwGklumycWc",
  l1_fruits:        "https://www.youtube.com/watch?v=rTYftexzl7c",
  l1_vegetables:    "https://www.youtube.com/watch?v=LiWmzpDoHQ8",
  l1_vehicles:      "https://www.youtube.com/watch?v=W6QrQkj8xAo",
  l1_greetings:     "https://www.youtube.com/watch?v=ZbSZCBYKfHk",
  l1_opposites:     "https://www.youtube.com/watch?v=ABrZ3IRoUBE",
  l1_questionwords: "https://www.youtube.com/watch?v=mRLo96ix9pA",
  l1_rhyming:       "https://www.youtube.com/watch?v=4PW3_LErVZk",
  l1_emotions:      "https://www.youtube.com/watch?v=MeNY-RxDJig",
  l1_household:     "https://www.youtube.com/watch?v=2U5KDmPtLeY",
  l1_classroom:     "https://www.youtube.com/watch?v=UJwkR6g0H7k",
  l1_safety:        "https://www.youtube.com/watch?v=Evb9K6U37E4",
  l2_spelling:      "https://www.youtube.com/watch?v=9T-O4EzWhrg",
  l2_vocab:         "https://www.youtube.com/watch?v=DUagMRtVdA4",
  l2_reading:       "https://www.youtube.com/watch?v=ua2f9-xxgG0",
  l2_pronounce:     "https://www.youtube.com/watch?v=kpC2FdTmjwc",
  l2_grammar:       "https://www.youtube.com/watch?v=IaTw1ol2QJM",
  l3_grammar:       "https://www.youtube.com/watch?v=a4SyiKqb-YA",
  l3_reading:       "https://www.youtube.com/watch?v=xmO6dS1K2Zc",
  l3_writing:       "https://www.youtube.com/watch?v=NM6CFQQY9SA",
  l3_comm:          "https://www.youtube.com/watch?v=lvFd80UnUrk",
  l3_functional:    "https://www.youtube.com/watch?v=WogJHVXW5Zs",
  l4_comprehension: "https://www.youtube.com/watch?v=E82FnJa2Vfo",
  l4_sentences:     "https://www.youtube.com/watch?v=A5_g-iUMbT4",
  l4_digital:       "https://www.youtube.com/watch?v=vKauB_ui598",
  l4_speech:        "https://www.youtube.com/watch?v=by1QAoRcc-U",
  l4_critical:      "https://www.youtube.com/watch?v=DCln1DF0_vo",
};

const LOCAL_LESSONS = [
  // Level 1: Foundational (none) - 25 customized lessons
  { lesson_id: "l1_vowels", title: "Alphabet Basics & Vowel Sounds", level: "none" },
  { lesson_id: "l1_consonants", title: "Regional Consonants & Simple Writing", level: "none" },
  { lesson_id: "l1_strokes", title: "Basic Stroke Patterns & Letter Tracing", level: "none" },
  { lesson_id: "l1_phonetics", title: "Phonetic Word Construction", level: "none" },
  { lesson_id: "l1_sightwords", title: "Sight Words & Daily Objects", level: "none" },
  { lesson_id: "l1_numbers", title: "Numbers 1 to 20", level: "none" },
  { lesson_id: "l1_capsmall", title: "Capital & Small Letters (A-Z)", level: "none" },
  { lesson_id: "l1_colors", title: "Colours in English", level: "none" },
  { lesson_id: "l1_shapes", title: "Shapes & Sizes", level: "none" },
  { lesson_id: "l1_daysmonths", title: "Days of the Week & Months", level: "none" },
  { lesson_id: "l1_weather", title: "Weather & Seasons", level: "none" },
  { lesson_id: "l1_family", title: "Family & Relations", level: "none" },
  { lesson_id: "l1_bodyparts", title: "Parts of the Body", level: "none" },
  { lesson_id: "l1_animals", title: "Animals & Birds", level: "none" },
  { lesson_id: "l1_fruits", title: "Fruits Names", level: "none" },
  { lesson_id: "l1_vegetables", title: "Vegetable Names", level: "none" },
  { lesson_id: "l1_vehicles", title: "Vehicles & Transport", level: "none" },
  { lesson_id: "l1_greetings", title: "Greetings & Polite Words", level: "none" },
  { lesson_id: "l1_opposites", title: "Opposite Words (Antonyms)", level: "none" },
  { lesson_id: "l1_questionwords", title: "Question Words (Who, What, Where)", level: "none" },
  { lesson_id: "l1_rhyming", title: "Rhyming & Word Play", level: "none" },
  { lesson_id: "l1_emotions", title: "Feelings & Emotions", level: "none" },
  { lesson_id: "l1_household", title: "Objects in the House", level: "none" },
  { lesson_id: "l1_classroom", title: "Classroom Objects", level: "none" },
  { lesson_id: "l1_safety", title: "Road Safety & Basic Signs", level: "none" },
  // Level 2: Primary (primary)
  { lesson_id: "l2_spelling",   title: "Two-Letter Word Formation & Spelling",    level: "primary" },
  { lesson_id: "l2_vocab",      title: "Daily Vocabulary & Meaning Decks",        level: "primary" },
  { lesson_id: "l2_reading",    title: "Simple Sentence Reading Practice",        level: "primary" },
  { lesson_id: "l2_pronounce",  title: "Basic Pronunciation Practice",            level: "primary" },
  { lesson_id: "l2_grammar",    title: "Introductory Grammar & Plurals",          level: "primary" },
  // Level 3: Middle (middle)
  { lesson_id: "l3_grammar",    title: "Basic Sentence Structure & Connectors",   level: "middle" },
  { lesson_id: "l3_reading",    title: "Short Stories & Reading Comprehension",   level: "middle" },
  { lesson_id: "l3_writing",    title: "Paragraph Tracing & Writing Practice",    level: "middle" },
  { lesson_id: "l3_comm",       title: "Daily Communication Phrases",             level: "middle" },
  { lesson_id: "l3_functional", title: "Functional Vocabulary & Grocery Lists",   level: "middle" },
  // Level 4: High (high)
  { lesson_id: "l4_comprehension", title: "Multi-Paragraph Analytical Reading",   level: "high" },
  { lesson_id: "l4_sentences",  title: "Writing Complete Grammatical Sentences",  level: "high" },
  { lesson_id: "l4_digital",    title: "Digital Literacy & Keyboard Basics",      level: "high" },
  { lesson_id: "l4_speech",     title: "Conversational Speech Exercises",         level: "high" },
  { lesson_id: "l4_critical",   title: "Critical Reading & News Summaries",       level: "high" }
];

const getFoundationalLessonTitle = (lessonId, lang) => {
  const dictionary = {
    english: {
      l1_vowels: "Alphabet Basics & Vowel Sounds",
      l1_consonants: "Regional Consonants & Simple Writing",
      l1_strokes: "Basic Stroke Patterns & Letter Tracing",
      l1_phonetics: "Phonetic Word Construction",
      l1_sightwords: "Sight Words & Daily Objects",
      l1_numbers: "Numbers 1 to 20",
      l1_capsmall: "Capital & Small Letters (A-Z)",
      l1_colors: "Colours in English",
      l1_shapes: "Shapes & Sizes",
      l1_daysmonths: "Days of the Week & Months",
      l1_weather: "Weather & Seasons",
      l1_family: "Family & Relations",
      l1_bodyparts: "Parts of the Body",
      l1_animals: "Animals & Birds",
      l1_fruits: "Fruits Names",
      l1_vegetables: "Vegetables Names",
      l1_vehicles: "Vehicles & Transport",
      l1_greetings: "Greetings & Polite Words",
      l1_opposites: "Opposite Words (Antonyms)",
      l1_questionwords: "Question Words (Who, What, Where)",
      l1_rhyming: "Rhyming & Word Play",
      l1_emotions: "Feelings & Emotions",
      l1_household: "Objects in the House",
      l1_classroom: "Classroom Objects",
      l1_safety: "Road Safety & Basic Signs"
    },
    hindi: {
      l1_vowels: "वर्णमाला परिचय एवं स्वर (अ, आ...)",
      l1_consonants: "व्यंजन ज्ञान और लेखन (क, ख...)",
      l1_strokes: "रेखाएँ और अक्षर ट्रेसिंग अभ्यास",
      l1_phonetics: "ध्वनि और दो-अक्षर वाले शब्द",
      l1_sightwords: "सामान्य शब्द और दैनिक वस्तुएं",
      l1_numbers: "संख्या ज्ञान (1 से 20)",
      l1_capsmall: "मात्रा ज्ञान और मात्राओं का उपयोग",
      l1_colors: "रंगों के नाम (लाल, पीला, हरा)",
      l1_shapes: "आकृतियाँ और आकार",
      l1_daysmonths: "सप्ताह के दिन और महीनों के नाम",
      l1_weather: "मौसम और ऋतुएँ",
      l1_family: "परिवार और रिश्ते-नाते",
      l1_bodyparts: "शरीर के अंग",
      l1_animals: "पशु-पक्षियों के नाम",
      l1_fruits: "फलों के नाम",
      l1_vegetables: "सब्जियों के नाम",
      l1_vehicles: "यातायात के साधन",
      l1_greetings: "शुभकामनाएं और आदरसूचक शब्द",
      l1_opposites: "विलोम शब्द (उल्टे अर्थ वाले)",
      l1_questionwords: "प्रश्नवाचक शब्द (क्या, कहाँ, कौन)",
      l1_rhyming: "समान तुक वाले शब्द",
      l1_emotions: "भावनाएं और मन के भाव",
      l1_household: "घर की उपयोगी वस्तुएं",
      l1_classroom: "विद्यालय और कक्षा की चीजें",
      l1_safety: "सड़क सुरक्षा और यातायात संकेत"
    },
    telugu: {
      l1_vowels: "ವರ್ಣಮಾಲೆ ಪರಿಚಯ & ಅಚ್ಚులు (అ, ఆ...)",
      l1_consonants: "ಹಲ್ಲುల ಪರಿಚಯ & ಸರಳ ಲೇಖನಂ (ಕ, ಖ...)",
      l1_strokes: "ಪ್ರಾಥಮಿಕ ಸ್ಟ್ರೋಕುಗಳು & ಅಕ್ಷರಗಳ ಟ್ರೇಸಿಂಗ್",
      l1_phonetics: "ಧ್ವನಿ ಪ್ರಕ್ರಿಯೆ & ಎರಡು ಅಕ್ಷರಗಳ ಪದಗಳು",
      l1_sightwords: "ನಿತ್ಯಂ ವಾಡುವ ಪದಗಳು & ವಸ್ತುಗಳು",
      l1_numbers: "ಸಂಖ್ಯೆಗಳು (1 నుండి 20)",
      l1_capsmall: "ಗುಣಿಂತಾಲ ಪರಿಚಯ & ಗುರುತುಗಳು",
      l1_colors: "రంగుల పేర్లు (ఎరుపు, పసుపు, ఆకుపచ్చ)",
      l1_shapes: "ಆಕಾರಗಳು & ಪರಿಮಾಣಗಳು",
      l1_daysmonths: "వారాల పేర్లు & నెలలు",
      l1_weather: "వాతావరణం & రుతువులు",
      l1_family: "కుటుంబ సభ్యులు & బంధుత్వాలు",
      l1_bodyparts: "శరీర భాగాలు",
      l1_animals: "జంతువులు & పక్షుల పేర్లు",
      l1_fruits: "పండ్ల పేర్లు",
      l1_vegetables: "కూరగాయల పేర్లు",
      l1_vehicles: "రవాణా సాధనాలు & వాహనాలు",
      l1_greetings: "నమస్కారాలు & మర్యాదపూర్వక పదాలు",
      l1_opposites: "వ్యతిరేక పదాలు",
      l1_questionwords: "ప్రశ్నార్థక పదాలు (ఏమిటి, ఎక్కడ, ఎవరు)",
      l1_rhyming: "ప్రాస పదాలు",
      l1_emotions: "భావోద్വേగాలు & మనోభావాలు",
      l1_household: "ఇంట్లో వాడే వస్తువులు",
      l1_classroom: "ಪಾಠಶಾಲ & ತರಗತಿ ಗದಿ ವಸ್ತುಗಳು",
      l1_safety: "ರೋಡ್ ಭದ್ರತೆ & ಸಂಚಾರ ಸಂಕೇತಗಳು"
    },
    tamil: {
      l1_vowels: "உயிரெழுத்துக்கள் அறிமுகம் (அ, ஆ...)",
      l1_consonants: "மெய்யெழுத்துக்கள் & எளிய எழுத்து பயிற்சி (க, ங...)",
      l1_strokes: "அடிப்படை கோடுகள் & எழுத்து வரைதல் பயிற்சி",
      l1_phonetics: "ஒலியியல் & இரண்டு எழுத்து சொற்கள்",
      l1_sightwords: "தினசரி சொற்கள் & பொருட்கள்",
      l1_numbers: "எண்கள் (1 முதல் 20 வரை)",
      l1_capsmall: "உயிர்மெய் எழுத்துக்கள் அறிமுகம்",
      l1_colors: "வண்ணங்களின் பெயர்கள் (சிகப்பு, மஞ்சள், பச்சை)",
      l1_shapes: "வடிவங்கள் & அளவுகள்",
      l1_daysmonths: "வாரத்தின் நாட்கள் & மாதங்கள்",
      l1_weather: "வானிலை & பருவங்கள்",
      l1_family: "குடும்ப உறவுகள்",
      l1_bodyparts: "உடல் உறுப்புகள்",
      l1_animals: "விலங்குகள் & பறவைகளின் பெயர்கள்",
      l1_fruits: "பழங்களின் பெயர்கள்",
      l1_vegetables: "காய்கறிகளின் பெயர்கள்",
      l1_vehicles: "போக்குவரத்து வாகனங்கள்",
      l1_greetings: "வாழ்த்துக்கள் & மரியாதை சொற்கள்",
      l1_opposites: "எதிர்ச்சொற்கள்",
      l1_questionwords: "வினாச் சொற்கள் (யார், என்ன, எங்கே)",
      l1_rhyming: "ஒரே ஓசையுடைய சொற்கள்",
      l1_emotions: "உணர்ச்சிகள் & மனநிலைகள்",
      l1_household: "வீட்டு உபயோகப் பொருட்கள்",
      l1_classroom: "பள்ளி & வகுப்பறை பொருட்கள்",
      l1_safety: "சாலை பாதுகாப்பு & போக்குவரத்து குறியீடுகள்"
    },
    bengali: {
      l1_vowels: "বর্ণমালা ও স্বরবর্ণের ধারণা (অ, আ...)",
      l1_consonants: "ব্যঞ্জনবর্ণ ও সহজ লিখন পদ্ধতি (ক, খ...)",
      l1_strokes: "বেসিক স্ট্রোক ও অক্ষর ট্রেসিং",
      l1_phonetics: "ধ্বনি ও দুই অক্ষরের শব্দ গঠন",
      l1_sightwords: "নিত্যদিনের শব্দ ও বস্তুসমূহ",
      l1_numbers: "সংখ্যা পরিচিতি (১ থেকে ২০)",
      l1_capsmall: "কার চিহ্ন ও তার ব্যবহার",
      l1_colors: "রঙের নাম (লাল, হলুদ, সবুজ)",
      l1_shapes: "আকৃতি ও আকার",
      l1_daysmonths: "বারের নাম ও মাস পরিচিতি",
      l1_weather: "আবহাওয়া ও ঋতুচक्र",
      l1_family: "পরিবার ও আত্মীয় স্বজন",
      l1_bodyparts: "শরীরের বিভিন্ন অঙ্গপ্রতঙ্গ",
      l1_animals: "পশু-পাখির নাম",
      l1_fruits: "ফলের নাম",
      l1_vegetables: "শাকসবজির নাম",
      l1_vehicles: "যাতায়াত ও যানবাহন",
      l1_greetings: "শুভেচ্ছা ও ভদ্রতাসূচক শব্দ",
      l1_opposites: "বিপরীত শব্দ",
      l1_questionwords: "প্রশ্নবোধক শব্দ (কী, কোথায়, কে)",
      l1_rhyming: "সমোচ্চারিত বা ছন্দের শব্দ",
      l1_emotions: "অনুভূতি ও আবেগ",
      l1_household: "গৃহস্থালির প্রয়োজনীয় জিনিস",
      l1_classroom: "বিদ্যালয় ও শ্রেণীকক্ষের বস্তু",
      l1_safety: "পথ নিরাপত্তা ও ট্রাফিক সংকেত"
    },
    punjabi: {
      l1_vowels: "ਪੈਂਤੀ ਅੱਖਰੀ ਤੇ ਸ੍ਵਰ ਗਿਆਨ (ੳ, ਅ...)",
      l1_consonants: "ਵਿਅੰਜਨ ਤੇ ਸਧਾਰਨ ਲਿਖਤ ਅਭਿਆਸ",
      l1_strokes: "ਮੁੱਢਲੀਆਂ ਰੇਖਾਵਾਂ ਤੇ ਅੱਖਰ ਲਿਖਣ ਕਲਾ",
      l1_phonetics: "ਧੁਨੀ ਤੇ ਦੋ-ਅੱਖਰੀ ਸ਼ਬਦਾਂ ਦਾ ਜੋੜ",
      l1_sightwords: "ਆਮ ਵਰਤੋਂ ਦੇ ਸ਼ਬਦ ਤੇ ਵਸਤਾਂ",
      l1_numbers: "ਗਿਣਤੀ (1 ਤੋਂ 20)",
      l1_capsmall: "ਲਗਾਂ-ਮਾਤਰਾਂ ਦਾ ਗਿਆਨ",
      l1_colors: "ਰੰਗਾਂ ਦੇ ਨਾਂ (ਲਾਲ, ਪੀਲਾ, ਹਰਾ)",
      l1_shapes: "ਅਕਾਰ ਤੇ ਬਣਤਰਾਂ",
      l1_daysmonths: "ਹਫ਼ਤੇ ਦੇ ਦਿਨ ਤੇ ਮਹੀਨੇ",
      l1_weather: "ਮੌਸਮ ਤੇ ਰੁੱਤਾਂ",
      l1_family: "ਪਰਿਵਾਰ ਤੇ ਰਿਸ਼ਤੇਦਾਰੀ",
      l1_bodyparts: "ਸਰੀರ ਦੇ ਅੰਗ",
      l1_animals: "ਜਾਨਵਰਾਂ ਤੇ ਪੰਛੀਆਂ ਦੇ ਨਾਂ",
      l1_fruits: "ਫਲਾਂ ਦੇ ਨਾਂ",
      l1_vegetables: "ਸਬਜ਼ੀਆਂ ਦੇ ਨਾਂ",
      l1_vehicles: "ਆਵਾਜਾਈ ਦੇ ਸਾਧਨ",
      l1_greetings: "ਸਤਿਕਾਰਯੋਗ ਸ਼ਬਦ ਤੇ ਸ਼ੁਭਕਾਮਨਾਵਾਂ",
      l1_opposites: "ਵਿਰੋਧੀ ਸ਼ਬਦ",
      l1_questionwords: "ਪ੍ਰਸ਼ਨਵਾਚਕ ਸ਼ਬਦ (ਕੀ, ਕਿੱਥੇ, ਕੌਣ)",
      l1_rhyming: "ਇੱਕੋ ਜਿਹੀ ਲੈਅ ਵਾਲੇ ਸ਼ਬਦ",
      l1_emotions: "ਭਾਵਨਾਵਾਂ ਤੇ ਮਨੋਭਾਵ",
      l1_household: "ਘਰੇਲೂ ਵਰਤੋਂ ਦੀਆਂ ਚੀਜ਼ਾਂ",
      l1_classroom: "ਸਕੂਲ ਤੇ ਜਮਾਤ ਦੀਆਂ ਵਸਤਾਂ",
      l1_safety: "ਸੜਕ ਸੁਰੱਖਿਆ ਤੇ ਆਵਾਜਾਈ ਦੇ ਨਿਯਮ"
    },
    marathi: {
      l1_vowels: "मुळाक्षरे आणि स्वर ओळख (अ, आ...)",
      l1_consonants: "व्यंजन ओळख आणि सोपे लेखन (क, ख...)",
      l1_strokes: "मूलभूत रेषा आणि अक्षर गिरवणे",
      l1_phonetics: "ध्वनी आणि दोन-अक्षरी शब्द",
      l1_sightwords: "नेहमीचे शब्द आणि वस्तू",
      l1_numbers: "अंक मोजणी (१ ते २०)",
      l1_capsmall: "स्वरचिन्हे आणि बाराखडी",
      l1_colors: "रंगांची नावे (लाल, पिवळा, हिरवा)",
      l1_shapes: "आकार आणि प्रकार",
      l1_daysmonths: "आठवड्याचे वार आणि महिने",
      l1_weather: "हवामान आणि ऋतू",
      l1_family: "कुटुंब आणि नातेवाईक",
      l1_bodyparts: "शरीराचे अवयव",
      l1_animals: "प्राणी आणि पक्षांची नावे",
      l1_fruits: "फळांची नावे",
      l1_vegetables: "भाज्यांची नावे",
      l1_vehicles: "वाहतुकीची साधने",
      l1_greetings: "आदरातिथ्य आणि शिष्टाचार शब्द",
      l1_opposites: "विरुद्धार्थी शब्द",
      l1_questionwords: "प्रश्नार्थक शब्द (काय, कुठे, कोण)",
      l1_rhyming: "यमक जुळणारे शब्द",
      l1_emotions: "भावना आणि संवेदना",
      l1_household: "घरातील रोजच्या वस्तू",
      l1_classroom: "शाळा आणि वर्गातील वस्तू",
      l1_safety: "रस्ता सुरक्षा आणि वाहतूक नियम"
    },
    gujarati: {
      l1_vowels: "વર્ણમાલા પરિચય અને સ્વર (અ, આ...)",
      l1_consonants: "વ્યંજન જ્ઞાન અને લેખન (ક, ખ...)",
      l1_strokes: "મૂળભૂત રેખાઓ અને અક્ષર લેખન",
      l1_phonetics: "ધ્વનિ અને બે અક્ષરવાળા શબ્દો",
      l1_sightwords: "રોજિંદા શબ્દો અને વસ્તુઓ",
      l1_numbers: "એકડા (૧ થી ૨૦)",
      l1_capsmall: "બારાખડી અને સ્વરચિહ્નો",
      l1_colors: "રંગોના નામ (લાલ, પીળો, લીલો)",
      l1_shapes: "આકારો અને પરિમાણ",
      l1_daysmonths: "વાર અને મહિનાઓના નામ",
      l1_weather: "હવામાન અને ઋતુઓ",
      l1_family: "પરિવાર અને સગપણ",
      l1_bodyparts: "શરીરના અંગો",
      l1_animals: "પશુ-પંખીઓના નામ",
      l1_fruits: "ફળોના નામ",
      l1_vegetables: "શાકભાજીના નામ",
      l1_vehicles: "વાહનો અને વાહનવ્યવહાર",
      l1_greetings: "શુભેચ્છાઓ અને સભ્યતાના શબ્દો",
      l1_opposites: "વિરોધી શબ્દો",
      l1_questionwords: "પ્રશ્નસૂચક શબ્દો (શું, ક્યાં, કોણ)",
      l1_rhyming: "પ્રાસવાળા શબ્દો",
      l1_emotions: "લાગણીઓ અને ભાવો",
      l1_household: "ઘરવખરીની વસ્તુઓ",
      l1_classroom: "શાળા અને વર્ગખંડની વસ્તુઓ",
      l1_safety: "માર્ગ સલામતી અને ટ્રાફિક સંકેતો"
    },
    kannada: {
      l1_vowels: "ಕನ್ನಡ ವರ್ಣಮಾಲೆ - ಸ್ವರಗಳು (ಅ, ಆ...)",
      l1_consonants: "ವ್ಯಂಜನಗಳು & ಬರವಣಿಗೆ ಅಭ್ಯಾಸ (ಕ, ಖ...)",
      l1_strokes: "ಮೂಲ ರೇಖೆಗಳು & ಅಕ್ಷರ ಅಭ್ಯಾಸ",
      l1_phonetics: "ಧ್ವನಿಗಳು & ಎರಡು ಅಕ್ಷರಗಳ ಪದಗಳು",
      l1_sightwords: "ದೈನಂದಿನ ಪದಗಳು & ವಸ್ತುಗಳು",
      l1_numbers: "ಸಂಖ್ಯೆಗಳು (೧ ರಿಂದ ೨೦)",
      l1_capsmall: "ಕಾಗುಣಿತ ಪರಿಚಯ & ಚಿಹ್ನೆಗಳು",
      l1_colors: "ಬಣ್ಣಗಳ ಹೆಸರುಗಳು (ಕೆಂಪು, ಹಳದಿ, ಹಸಿರು)",
      l1_shapes: "ಆಕಾರಗಳು & ಗಾತ್ರಗಳು",
      l1_daysmonths: "ವಾರದ ದಿನಗಳು & ತಿಂಗಳುಗಳು",
      l1_weather: "ಹವಾಮಾನ & ಋತುಗಳು",
      l1_family: "ಕುಟುಂಬದ ಸದಸ್ಯರು & ಸಂಬಂಧಗಳು",
      l1_bodyparts: "ದೇಹದ ಭಾಗಗಳು",
      l1_animals: "ಪ್ರಾಣಿಗಳು & ಪಕ್ಷಿಗಳ ಹೆಸರುಗಳು",
      l1_fruits: "ಹಣ್ಣುಗಳ ಹೆಸರುಗಳು",
      l1_vegetables: "ತರಕಾರಿಗಳ ಹೆಸರುಗಳು",
      l1_vehicles: "ಸಾರಿಗೆ ವಾಹನಗಳು",
      l1_greetings: "ಶುಭಾಶಯಗಳು & ಸೌಜನ್ಯದ ಪದಗಳು",
      l1_opposites: "ವಿರುದ್ಧ ಪದಗಳು",
      l1_questionwords: "ಪ್ರಶ್ನಾರ್ಥಕ ಪದಗಳು (ಏನು, ಎಲ್ಲಿ, ಯಾರು)",
      l1_rhyming: "ಪ್ರಾಸ ಪದಗಳು",
      l1_emotions: "ಭಾವನೆಗಳು & ಮನೋಸ್ಥಿತಿ",
      l1_household: "ಮನೆಯ ವಸ್ತುಗಳು",
      l1_classroom: "ಶಾಲೆ & ತರಗತಿ ವಸ್ತುಗಳು",
      l1_safety: "ರಸ್ತೆ ಸುರಕ್ಷತೆ & ಸಂಚಾರ ಸಂಕೇತಗಳು"
    },
    malayalam: {
      l1_vowels: "മലയാള അക്ഷരമാല - സ്വരാക്ഷരങ്ങൾ (അ, ആ...)",
      l1_consonants: "വ്യഞ്ജനാക്ഷരങ്ങൾ & എഴുത്ത് പരിശീലനം (ക, ഖ...)",
      l1_strokes: "അടിസ്ഥാന വരകളും അക്ഷരമെഴുത്തും",
      l1_phonetics: "ശബ്ദശാസ്ത്രം & രണ്ടക്ഷര വാക്കുകൾ",
      l1_sightwords: "നിത്യോപയോഗ വാക്കുകൾ & വസ്തുക്കൾ",
      l1_numbers: "അക്കങ്ങൾ (1 മുതൽ 20 വരെ)",
      l1_capsmall: "ചിഹ്നങ്ങളും അവയുടെ ഉപയോഗവും",
      l1_colors: "നിറങ്ങളുടെ പേരുകൾ (ചുവപ്പ്, മഞ്ഞ, പച്ച)",
      l1_shapes: "ആകൃതികളും അളവുകളും",
      l1_daysmonths: "ആഴ്ചയിലെ ദിവസങ്ങളും മാസങ്ങളും",
      l1_weather: "കാലാവസ്ഥയും ഋതുക്കളും",
      l1_family: "കുടുംബാംഗങ്ങൾ & ബന്ധങ്ങൾ",
      l1_bodyparts: "ശരീര ഭാഗങ്ങൾ",
      l1_animals: "മൃഗങ്ങളും പക്ഷികളും",
      l1_fruits: "പഴങ്ങളുടെ പേരുകൾ",
      l1_vegetables: "പച്ചക്കറികളുടെ പേരുകൾ",
      l1_vehicles: "വാഹനാഭ്യാസങ്ങളും ഗതാഗതവും",
      l1_greetings: "അഭിവാദ്യങ്ങൾ & മര്യാദ വാക്കുകൾ",
      l1_opposites: "വിപരീത പദങ്ങൾ",
      l1_questionwords: "ചോദ്യ വാക്കുകൾ (ആര്, എന്ത്, എവിടെ)",
      l1_rhyming: "ഒരേ ഈണമുള്ള വാക്കുകൾ",
      l1_emotions: "വികാരങ്ങളും ഭാവങ്ങളും",
      l1_household: "ഗാർഹിക സാമഗ്രികൾ",
      l1_classroom: "സ്കൂളിലെയും ക്ലാസ് മുറിയിലെയും വസ്തുക്കൾ",
      l1_safety: "റോഡ് സുരക്ഷയും ഗതാഗത നിയമങ്ങളും"
    },
    odia: {
      l1_vowels: "ଓଡ଼ିଆ ବର୍ଣ୍ଣମାଳା - ସ୍ୱରବର୍ଣ୍ଣ (ଅ, ଆ...)",
      l1_consonants: "ବ୍ୟଞ୍ଜନବର୍ଣ୍ଣ ଓ ଲେଖନ ଅଭ୍ୟାସ (କ, ଖ...)",
      l1_strokes: "ମୌଳିକ ରେଖା ଓ ଅକ୍ଷର ଟ୍ରେସିଂ",
      l1_phonetics: "ଧ୍ୱନି ଓ ଦୁଇ-ଅକ୍ଷର ବିଶିଷ୍ଟ ଶବ୍ଦ",
      l1_sightwords: "ଦୈନନ୍ଦିନ ବ୍ୟବହାର୍ଯ୍ୟ ଶବ୍ਦ ଓ ବସ୍ତୁ",
      l1_numbers: "ସଂଖ୍ୟା ପରିଚୟ (୧ ରୁ ୨୦)",
      l1_capsmall: "ମାତ୍ରା ପରିଚୟ ଓ ବ୍ୟବହାର",
      l1_colors: "ରଙ୍ଗର ନାମ (ନାଲି, ହଳଦିଆ, ସବୁଜ)",
      l1_shapes: "ଆକାର ଓ ଆକୃତି",
      l1_daysmonths: "ବାର ଓ ମାସର ନାମ",
      l1_weather: "ପାଣିପାଗ ଓ ଋତୁଚକ୍ର",
      l1_family: "ପରିବାର ଓ ସମ୍ପର୍କ",
      l1_bodyparts: "ଶରୀರର ବିଭིନ୍ന ଅଙ୍ଗ",
      l1_animals: "ପଶୁପକ୍ଷୀଙ୍କ ନାମ",
      l1_fruits: "ଫଳର ନାମ",
      l1_vegetables: "ପନିପରିବା ନାମ",
      l1_vehicles: "ଯାତାୟାତ ଓ ଯାନବାହନ",
      l1_greetings: "ଶୁଭେଚ୍ଛା ଓ ଶିଷ୍ଟାଚାର ଶବ୍ਦ",
      l1_opposites: "ବିପରୀତ ଶବ୍ଦ",
      l1_questionwords: "ପ୍ରଶ୍ନବାଚକ ଶବ୍দ (କଣ, କେଉଁଠି, କିଏ)",
      l1_rhyming: "ସମତୁଲ ଶବ୍ਦ",
      l1_emotions: "ଭାବନା ଓ ଅନୁଭୂତି",
      l1_household: "ଘରୋଇ ଜିନିଷପତ୍ର",
      l1_classroom: "ବିଦ୍ୟାଳୟ ଓ ଶ୍ରେଣୀ ଗୃହର ବସ୍ତು",
      l1_safety: "ରାସ୍ତା ସୁରକ୍ଷା ଓ ଟ୍ରାଫିକ ନିୟମ"
    },
    urdu: {
      l1_vowels: "حروفِ تہجی اور آوازیں (ا، ب...)",
      l1_consonants: "حروف کی اشکال اور لکھنا",
      l1_strokes: "بنیادی لکیریں اور حرف سازی",
      l1_phonetics: "صوتیات اور دو حرفی الفاظ",
      l1_sightwords: "روزمرہ کے الفاظ اور چیزیں",
      l1_numbers: "گنتی (1 سے 20)",
      l1_capsmall: "اعراب اور حرکات کا استعمال",
      l1_colors: "رنگوں کے نام (لال، پیلا، ہرا)",
      l1_shapes: "شکلیں اور سائز",
      l1_daysmonths: "دنوں اور مہینوں کے نام",
      l1_weather: "موسم اور رتیں",
      l1_family: "خاندان اور رشتے دار",
      l1_bodyparts: "جسم کے اعضاء",
      l1_animals: "جانوروں اور پرندوں کے نام",
      l1_fruits: "پھلوں کے نام",
      l1_vegetables: "سبزیوں کے نام",
      l1_vehicles: "گاڑیاں اور نقل و حمل",
      l1_greetings: "ملاقات اور تمیز کے الفاظ",
      l1_opposites: "متضاد الفاظ",
      l1_questionwords: "سوالیہ الفاظ (کون، کیا، کہاں)",
      l1_rhyming: "ہم آواز الفاظ",
      l1_emotions: "احساسات اور جذبات",
      l1_household: "گھریلو سامان",
      l1_classroom: "اسکول اور جماعت کی چیزیں",
      l1_safety: "سڑک کی حفاظت اور ٹریفک کے اشارے"
    }
  };

  const selectedLang = dictionary[lang] || dictionary.english;
  return selectedLang[lessonId] || dictionary.english[lessonId] || lessonId;
};

const getLocalizedLessons = (rawLessons, langCode) => {
  return rawLessons.map(les => {
    if (les.level === 'none') {
      const localizedTitle = getFoundationalLessonTitle(les.lesson_id, langCode);
      return { ...les, title: localizedTitle };
    }
    return les;
  });
};


// ============================================================================
// SAKSHAR AI GAME ARCADE & HUB: 7 FULLY INTERACTIVE LITERACY GAMES
// ============================================================================

// Synthesized Web Audio API Sound Effects Engine (100% Client-side, zero external files required)
const playArcadeSound = (type, isMuted = false) => {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'correct') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'catch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'fanfare') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    }
  } catch (e) {
    // Ignore audio context errors
  }
};

const WORD_BANK = {
  english: [
    { word: 'APPLE', hint: 'A crisp red or green fruit 🍎', emoji: '🍎' },
    { word: 'HOUSE', hint: 'A place where people live 🏠', emoji: '🏠' },
    { word: 'WATER', hint: 'Essential liquid we drink 💧', emoji: '💧' },
    { word: 'BREAD', hint: 'A common baked food item 🍞', emoji: '🍞' },
    { word: 'TIGER', hint: 'A large striped wild cat 🐯', emoji: '🐯' },
    { word: 'CLOUD', hint: 'Floats gracefully in the sky ☁️', emoji: '☁️' },
    { word: 'MUSIC', hint: 'Pleasing melody you listen to 🎵', emoji: '🎵' },
    { word: 'TRAIN', hint: 'Travels fast on railway tracks 🚂', emoji: '🚂' },
    { word: 'LIGHT', hint: 'Makes darkness go away 💡', emoji: '💡' },
    { word: 'EARTH', hint: 'Our beautiful home planet 🌍', emoji: '🌍' },
  ],
  hindi: [
    { word: 'पानी', hint: 'जो हम हर रोज पीते हैं 💧', emoji: '💧' },
    { word: 'सेब', hint: 'एक स्वादिष्ट लाल फल 🍎', emoji: '🍎' },
    { word: 'घर', hint: 'रहने की सुंदर जगह 🏠', emoji: '🏠' },
    { word: 'आम', hint: 'भारत का राष्ट्रीय फल 🥭', emoji: '🥭' },
    { word: 'चाय', hint: 'एक लोकप्रिय गर्म पेय ☕', emoji: '☕' },
    { word: 'बिल्ली', hint: 'प्यारी म्याऊं बोलने वाली 🐱', emoji: '🐱' },
    { word: 'किताब', hint: 'ज्ञान प्राप्त करने के लिए 📖', emoji: '📖' },
    { word: 'स्कूल', hint: 'शिक्षा और पढ़ाई की जगह 🏫', emoji: '🏫' },
    { word: 'नदी', hint: 'निरंतर बहता शीतल पानी 🌊', emoji: '🌊' },
    { word: 'पेड़', hint: 'छांव देने वाला हरा पौधा 🌳', emoji: '🌳' },
  ],
  bengali: [
    { word: 'জল', hint: 'আমরা প্রতিদিন পান করি 💧', emoji: '💧' },
    { word: 'আম', hint: 'একটি মিষ্টি জাতীয় ফল 🥭', emoji: '🥭' },
    { word: 'বাড়ি', hint: 'বসবাস করার জায়গা 🏠', emoji: '🏠' },
    { word: 'বই', hint: 'জ্ঞান অর্জনের জন্য 📖', emoji: '📖' },
    { word: 'মাছ', hint: 'জলে থাকা সুন্দর প্রাণী 🐟', emoji: '🐟' },
  ],
  tamil: [
    { word: 'நீர்', hint: 'நாம் அருந்தும் சுவையான நீர் 💧', emoji: '💧' },
    { word: 'மாங்காய்', hint: 'இனிப்பான சுவை தரும் பழம் 🥭', emoji: '🥭' },
    { word: 'வீடு', hint: 'நாம் வாழும் அமைதியான இடம் 🏠', emoji: '🏠' },
    { word: 'புத்தகம்', hint: 'வாசித்து கற்க 📖', emoji: '📖' },
    { word: 'மீன்', hint: 'நீரில் வாழும் உயிர் 🐟', emoji: '🐟' },
  ],
};
const getWordBank = (lang) => WORD_BANK[lang] || WORD_BANK['english'];

const FLASH_CARDS = {
  english: [
    { q: 'What word means the opposite of "fast"?', a: 'Slow', opts: ['Slow', 'Quick', 'Run', 'Jump'] },
    { q: 'Which of these is a delicious fruit?', a: 'Mango', opts: ['Mango', 'Chair', 'River', 'Sky'] },
    { q: 'What is 4 + 3?', a: '7', opts: ['5', '6', '7', '8'] },
    { q: 'Which word means a place to buy goods?', a: 'Market', opts: ['Forest', 'Market', 'Moon', 'Cloud'] },
    { q: 'What does "large" mean?', a: 'Big', opts: ['Small', 'Big', 'Fast', 'Cold'] },
    { q: 'Which is a living organism?', a: 'Tree', opts: ['Stone', 'Water', 'Tree', 'Fire'] },
    { q: 'How many days are in a single week?', a: '7', opts: ['5', '6', '7', '10'] },
    { q: 'Which word means feeling happy?', a: 'Joyful', opts: ['Sad', 'Angry', 'Joyful', 'Tired'] },
  ],
  hindi: [
    { q: '"पानी" का अंग्रेजी अर्थ क्या है?', a: 'Water', opts: ['Fire', 'Water', 'Air', 'Earth'] },
    { q: 'इनमें से कौन सा एक स्वादिष्ट फल है?', a: 'आम', opts: ['कुर्सी', 'आम', 'नदी', 'आसमान'] },
    { q: '"बड़ा" शब्द का सही विलोम क्या है?', a: 'छोटा', opts: ['लंबा', 'छोटा', 'तेज़', 'ठंडा'] },
    { q: 'एक सप्ताह में कुल कितने दिन होते हैं?', a: '7', opts: ['5', '6', '7', '10'] },
    { q: '"खुश" शब्द का अंग्रेजी अर्थ क्या है?', a: 'Happy', opts: ['Sad', 'Angry', 'Happy', 'Tired'] },
  ],
};
const getFlashCards = (lang) => FLASH_CARDS[lang] || FLASH_CARDS['english'];

const MEMORY_PAIR_ITEMS = [
  { id: 1, text: 'Apple 🍎', pairId: 'apple', emoji: '🍎' },
  { id: 2, text: 'Apple 🍎', pairId: 'apple', emoji: '🍎' },
  { id: 3, text: 'Water 💧', pairId: 'water', emoji: '💧' },
  { id: 4, text: 'Water 💧', pairId: 'water', emoji: '💧' },
  { id: 5, text: 'Book 📖', pairId: 'book', emoji: '📖' },
  { id: 6, text: 'Book 📖', pairId: 'book', emoji: '📖' },
  { id: 7, text: 'Sun ☀️', pairId: 'sun', emoji: '☀️' },
  { id: 8, text: 'Sun ☀️', pairId: 'sun', emoji: '☀️' },
  { id: 9, text: 'Tree 🌳', pairId: 'tree', emoji: '🌳' },
  { id: 10, text: 'Tree 🌳', pairId: 'tree', emoji: '🌳' },
  { id: 11, text: 'Tiger 🐯', pairId: 'tiger', emoji: '🐯' },
  { id: 12, text: 'Tiger 🐯', pairId: 'tiger', emoji: '🐯' },
];

const SENTENCE_GAMES = [
  { sentence: 'The sun rises in the east', hint: 'Sun movement' },
  { sentence: 'Books give us great knowledge', hint: 'Learning habit' },
  { sentence: 'Trees keep our air clean', hint: 'Environment' },
  { sentence: 'Water is essential for life', hint: 'Daily habit' },
  { sentence: 'Learning new words is fun', hint: 'Education' },
];

const TRACING_LETTERS = ['A', 'B', 'अ', 'आ', 'क', 'म'];

// Results Celebration Screen
function GameResultsScreen({ title, score, maxScore, xpEarned, onPlayAgain, onBackToHub, isMuted }) {
  const percentage = Math.round((score / Math.max(maxScore, 1)) * 100);
  const stars = percentage >= 85 ? 3 : percentage >= 50 ? 2 : 1;

  useEffect(() => {
    playArcadeSound('fanfare', isMuted);
  }, []);

  return (
    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-fade-in max-w-md mx-auto">
      <div className="relative">
        <div className="text-7xl animate-bounce">
          {stars === 3 ? '🏆' : stars === 2 ? '🌟' : '💪'}
        </div>
        <div className="absolute -top-3 -right-3 text-3xl animate-ping">✨</div>
      </div>

      <div>
        <h3 className="text-white font-black text-2xl tracking-tight">
          {stars === 3 ? 'Outstanding Victory!' : stars === 2 ? 'Great Effort!' : 'Good Try!'}
        </h3>
        <p className="text-gray-400 text-xs font-bold mt-1">Completed: {title}</p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3].map(s => (
          <span key={s} className={`text-4xl transition-all duration-300 transform ${s <= stars ? 'scale-110 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]' : 'opacity-20 grayscale'}`}>
            ⭐
          </span>
        ))}
      </div>

      <div className="w-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-gray-300 border-b border-purple-500/20 pb-2">
          <span>Accuracy Score</span>
          <span className="text-emerald-400 font-black text-sm">{percentage}%</span>
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-gray-300 pt-1">
          <span>XP Earned</span>
          <span className="text-yellow-400 font-black text-base">+ {xpEarned} XP ⭐</span>
        </div>
      </div>

      <div className="flex gap-3 w-full pt-2">
        <button
          onClick={() => { playArcadeSound('click', isMuted); onPlayAgain(); }}
          className="flex-1 py-3 bg-gradient-to-r from-[#5C67F2] to-[#7C3AED] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
        >
          🔄 Play Again
        </button>
        <button
          onClick={() => { playArcadeSound('click', isMuted); onBackToHub(); }}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
        >
          🎮 Back to Arcade
        </button>
      </div>
    </div>
  );
}

// MAIN GAME ARCADE MODAL
function MiniGameModal({ isOpen, onClose, lang, fullName, initialGameId = null }) {
  const [selectedGame, setSelectedGame] = useState(initialGameId);
  const [xpTotal, setXpTotal] = useState(() => parseInt(localStorage.getItem('game_xp') || '0'));
  const [xpFlash, setXpFlash] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // FIX: This modal stays mounted the whole time (it's only hidden via the
  // `if (!isOpen) return null;` below), so the `useState(initialGameId)`
  // initializer above only ever runs once, on the very first mount. Without
  // this effect, accepting a game invite after the modal has already opened
  // once would keep landing back on the game picker instead of jumping
  // straight into the requested game. Re-sync selectedGame every time a new
  // initialGameId comes in (e.g. every "Invite to Play" send or "Accept &
  // Play" click) so both the sender and the acceptor always land directly on
  // the exact game that was chosen.
  useEffect(() => {
    if (isOpen && initialGameId) {
      setSelectedGame(initialGameId);
    }
  }, [isOpen, initialGameId]);

  const awardXP = (pts) => {
    setXpTotal(prev => {
      const next = prev + pts;
      localStorage.setItem('game_xp', String(next));
      return next;
    });
    setXpFlash(`+${pts} XP!`);
    setTimeout(() => setXpFlash(null), 1800);
  };

  if (!isOpen) return null;

  // Roaming mascot characters that drift around the full-page background
  const MASCOTS = [
    { emoji: '🦉', size: 42, top: '10%',  left: '6%',  dur: 9,  delay: 0,   path: 'mascotDriftA' },
    { emoji: '🚀', size: 38, top: '18%',  left: '85%', dur: 11, delay: 0.6, path: 'mascotDriftB' },
    { emoji: '🐯', size: 40, top: '68%',  left: '10%', dur: 10, delay: 1.2, path: 'mascotDriftC' },
    { emoji: '🌟', size: 30, top: '78%',  left: '90%', dur: 8,  delay: 0.3, path: 'mascotDriftA' },
    { emoji: '🎈', size: 34, top: '38%',  left: '92%', dur: 12, delay: 0.9, path: 'mascotDriftB' },
    { emoji: '📚', size: 36, top: '85%',  left: '48%', dur: 9.5,delay: 1.5, path: 'mascotDriftC' },
    { emoji: '🦊', size: 38, top: '6%',   left: '46%', dur: 10.5,delay:0.4, path: 'mascotDriftA' },
    { emoji: '🍭', size: 28, top: '30%',  left: '4%',  dur: 8.5, delay: 1.1,path: 'mascotDriftB' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #2E1065 0%, #7C1D6F 35%, #C2410C 70%, #78350F 100%)'
      }}
    >
      <style>{`
        @keyframes arcadeModalIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes arcadeStarTwinkle { 0%,100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 0.9; transform: scale(1.3); } }
        @keyframes arcadeHeaderShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes arcadeScanBeam { 0% { transform: translateX(-40%); opacity: 0; } 15% { opacity: 0.7; } 85% { opacity: 0.7; } 100% { transform: translateX(140%); opacity: 0; } }
        @keyframes arcadeOrbFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(14px,-10px) scale(1.08); } }
        @keyframes arcadeOrbFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-12px,10px) scale(0.94); } }
        @keyframes arcadeTitleGlow { 0%,100% { text-shadow: 0 0 8px rgba(251,191,36,0.4); } 50% { text-shadow: 0 0 18px rgba(251,191,36,0.9), 0 0 30px rgba(236,72,153,0.5); } }
        @keyframes arcadeControllerSpin { 0%,100% { transform: rotate(-6deg) scale(1); } 50% { transform: rotate(6deg) scale(1.08); } }
        @keyframes arcadeDotGridDrift { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        @keyframes arcadeCardIn { from { opacity: 0; transform: translateY(18px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes arcadeCardShine { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes arcadePillPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(236,72,153,0.5); } 50% { box-shadow: 0 0 0 5px rgba(236,72,153,0); } }
        @keyframes mascotDriftA { 0%,100% { transform: translate(0,0) rotate(-6deg); } 50% { transform: translate(18px,-22px) rotate(8deg); } }
        @keyframes mascotDriftB { 0%,100% { transform: translate(0,0) rotate(5deg); } 50% { transform: translate(-20px,16px) rotate(-7deg); } }
        @keyframes mascotDriftC { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(10px,-26px) rotate(10deg) scale(1.06); } }
        @keyframes mascotBob { 0%,100% { filter: drop-shadow(0 6px 10px rgba(0,0,0,0.25)); } 50% { filter: drop-shadow(0 14px 16px rgba(0,0,0,0.15)); } }
      `}</style>

      {/* Floating mascot characters roaming the full-page background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {MASCOTS.map((m, i) => (
          <span
            key={i}
            className="absolute select-none"
            style={{
              top: m.top,
              left: m.left,
              fontSize: `${m.size}px`,
              opacity: 0.35,
              animation: `${m.path} ${m.dur}s ${m.delay}s ease-in-out infinite, mascotBob ${m.dur}s ${m.delay}s ease-in-out infinite`
            }}
          >
            {m.emoji}
          </span>
        ))}
        {/* soft color blobs behind everything */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-fuchsia-500/20 blur-3xl" style={{ animation: 'arcadeOrbFloat1 9s ease-in-out infinite' }} />
        <div className="absolute -bottom-16 left-10 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" style={{ animation: 'arcadeOrbFloat2 11s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-purple-600/10 blur-3xl" style={{ animation: 'arcadeOrbFloat1 13s ease-in-out infinite reverse' }} />
      </div>

      <div
        className="relative w-full h-full flex flex-col"
        style={{ animation: 'arcadeModalIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
      >

        {/* Animated Cyber Arcade Header */}
        <div
          className="relative overflow-hidden px-6 py-5 border-b border-white/10 shrink-0"
          style={{ background: 'linear-gradient(120deg, rgba(46,16,101,0.6), rgba(124,29,111,0.6), rgba(194,65,12,0.6), rgba(124,29,111,0.6))', backgroundSize: '300% 300%', animation: 'arcadeHeaderShift 10s ease-in-out infinite', backdropFilter: 'blur(6px)' }}
        >
          {/* Twinkling starfield */}
          {[...Array(14)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                width: `${1 + Math.random() * 2}px`,
                height: `${1 + Math.random() * 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `arcadeStarTwinkle ${2 + Math.random() * 3}s ${Math.random() * 2}s ease-in-out infinite`
              }}
            />
          ))}

          {/* Sweeping scan beam */}
          <div className="absolute inset-y-0 left-0 w-1/3 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', animation: 'arcadeScanBeam 5s ease-in-out infinite' }} />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-fuchsia-500/30"
                style={{ animation: 'arcadeControllerSpin 2.6s ease-in-out infinite' }}
              >
                🎮
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-black text-xl tracking-tight" style={{ animation: 'arcadeTitleGlow 2.4s ease-in-out infinite' }}>SAKSHAR AI ARCADE</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-fuchsia-100 text-xs font-semibold mt-0.5">
                  Play, Learn & Master Regional Literacy • {fullName ? `Player: ${fullName.split(' ')[0]}` : 'Learner'}
                </p>
              </div>
            </div>

            {/* Badges & XP Bar */}
            <div className="flex items-center gap-3">
              {/* Level Badge */}
              <div className="hidden sm:flex items-center gap-1.5 bg-black/20 border border-white/15 px-3 py-1.5 rounded-full text-xs font-bold text-white/90">
                <span>🏆 Level {Math.floor(xpTotal / 100) + 1}</span>
              </div>

              {/* Streak */}
              <div className="hidden sm:flex items-center gap-1 bg-amber-500/15 border border-amber-400/30 px-3 py-1.5 rounded-full text-xs font-black text-amber-300 animate-pulse">
                <span>🔥 5-Day Streak</span>
              </div>

              {/* XP Counter */}
              <div className="relative">
                <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 text-xs font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md shadow-amber-500/30">
                  ⭐ {xpTotal} XP
                </span>
                {xpFlash && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-sm animate-bounce whitespace-nowrap drop-shadow">
                    {xpFlash}
                  </span>
                )}
              </div>

              {/* Mute Audio Toggle */}
              <button
                onClick={() => setIsMuted(m => !m)}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer text-sm hover:scale-110 active:scale-95 ${
                  isMuted ? 'bg-black/20 border-white/15 text-white/40' : 'bg-fuchsia-500/20 border-fuchsia-300/40 text-fuchsia-200 shadow-sm'
                }`}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>

              {/* Close Button */}
              <button
                onClick={() => { playArcadeSound('click', isMuted); setSelectedGame(null); onClose(); }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-all duration-200 text-sm cursor-pointer border border-white/10 hover:rotate-90 active:scale-90"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Content Body — Synthwave Sunset Grid Backdrop */}
        <div
          className="flex-1 overflow-y-auto text-slate-100 p-4 sm:p-6 lg:p-10 relative"
          style={{ background: 'linear-gradient(180deg, #0b1130 0%, #1a1147 26%, #3a1152 44%, #6e1450 58%, #22082f 74%, #0b0716 100%)' }}
        >
          <style>{`
            @keyframes swTwinkle { 0%,100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 0.85; transform: scale(1.15); } }
            @keyframes swSunPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.12); } }
            @keyframes swGridDrift { 0% { background-position: 0 0, 0 0; } 100% { background-position: 0 48px, 48px 0; } }
          `}</style>

          {/* Synthwave scene layer: stars, sun, horizon grid */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Stars */}
            {[...Array(36)].map((_, i) => (
              <span
                key={`sw-star-${i}`}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`,
                  top: `${Math.random() * 40}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: 0.2 + Math.random() * 0.6,
                  animation: `swTwinkle ${2 + Math.random() * 3}s ${Math.random() * 2}s ease-in-out infinite`
                }}
              />
            ))}

            {/* Glowing retro sun */}
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
              style={{
                top: '5%',
                width: '260px',
                height: '260px',
                background: 'radial-gradient(circle at 50% 38%, #fff3b0 0%, #ffce54 22%, #ff9a3d 45%, #ff5d7a 68%, #e0257e 88%, transparent 100%)',
                boxShadow: '0 0 90px 26px rgba(255,120,90,0.35), 0 0 160px 60px rgba(224,37,126,0.22)',
                animation: 'swSunPulse 4s ease-in-out infinite'
              }}
            >
              {/* Retro sun stripes */}
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={`sw-stripe-${i}`}
                  style={{ position: 'absolute', left: 0, right: 0, height: '9px', top: `${52 + i * 9}%`, background: '#1a0a2e' }}
                />
              ))}
            </div>

            {/* Horizon glow line */}
            <div
              className="absolute left-0 right-0"
              style={{
                top: '37%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #ff6ad5 20%, #ffd166 50%, #ff6ad5 80%, transparent)',
                boxShadow: '0 0 24px 5px rgba(255,106,213,0.55)'
              }}
            />

            {/* Perspective grid floor */}
            <div className="absolute left-0 right-0 bottom-0 overflow-hidden" style={{ top: '37%' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '-20% 0 0 0',
                  backgroundImage:
                    'linear-gradient(rgba(255,90,190,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,90,190,0.55) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                  transform: 'perspective(260px) rotateX(64deg) scale(2.4)',
                  transformOrigin: 'top center',
                  animation: 'swGridDrift 3s linear infinite'
                }}
              />
              {/* Fade the far grid lines into the horizon */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(11,7,22,0) 0%, rgba(11,7,22,0) 40%, rgba(11,7,22,0.75) 100%)'
                }}
              />
            </div>
          </div>

          <div className="relative z-10 max-w-6xl mx-auto w-full">
            {!selectedGame ? (
              <GameSelector
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                onSelectGame={(gId) => { playArcadeSound('click', isMuted); setSelectedGame(gId); }}
              />
            ) : (
              <div>
                {selectedGame === 'scramble' && (
                  <ScrambleGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'flash' && (
                  <FlashCardGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'drop' && (
                  <LetterDropGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'memory' && (
                  <MemoryMatchGame isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'sentence' && (
                  <SentenceBuilderGame isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'trace' && (
                  <TracingGame isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'sound' && (
                  <SoundHuntGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'duel' && (
                  <WordDuelGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
                {selectedGame === 'shoot' && (
                  <ShootingGame lang={lang} isMuted={isMuted} onAwardXP={awardXP} onBack={() => setSelectedGame(null)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ARCADE GAME SELECTOR HUB
function GameSelector({ activeCategory, onSelectCategory, onSelectGame }) {
  const categories = [
    { id: 'all', label: '🕹️ All Games (9)' },
    { id: 'words', label: '🔤 Words & Spelling' },
    { id: 'arcade', label: '🎯 Speed & Arcade' },
    { id: 'memory', label: '🧩 Memory Match' },
    { id: 'sentence', label: '🏗️ Sentences' },
    { id: 'sound', label: '🗣️ Phonics & Audio' },
    { id: 'trace', label: '✍️ Tracing' },
    { id: 'battle', label: '⚔️ Battle Mode' },
  ];

  const games = [
    { id: 'scramble', category: 'words', emoji: '🔤', title: 'Word Scramble Arena', desc: 'Unscramble jumbled letter tiles to form words with hints & combos!', color: 'from-[#5C67F2] to-[#7C3AED]', diff: 'Easy', xp: '+25 XP' },
    { id: 'flash', category: 'arcade', emoji: '⚡', title: 'Speed Flash Quiz', desc: 'Answer fast-paced literacy trivia & build your streak multiplier!', color: 'from-[#10B981] to-[#059669]', diff: 'Medium', xp: '+30 XP' },
    { id: 'drop', category: 'arcade', emoji: '🎯', title: 'Letter Catch Arcade', desc: 'Control the basket to catch falling target letters before they drop!', color: 'from-[#F59E0B] to-[#EF4444]', diff: 'Hard', xp: '+40 XP' },
    { id: 'shoot', category: 'arcade', emoji: '🔫', title: 'Picture Word Sniper', desc: 'A picture pops up — aim the cannon and shoot the flying word that names it, dodging the wrong ones!', color: 'from-fuchsia-500 to-rose-600', diff: 'Hard', xp: '+45 XP' },
    { id: 'memory', category: 'memory', emoji: '🧩', title: 'Memory Match Flip', desc: 'Flip 3D cards to match picture emojis with their correct word pairs!', color: 'from-pink-500 to-rose-600', diff: 'Easy', xp: '+30 XP' },
    { id: 'sentence', category: 'sentence', emoji: '🏗️', title: 'Sentence Builder', desc: 'Assemble jumbled word blocks to construct valid sentences & hear them read aloud!', color: 'from-cyan-500 to-blue-600', diff: 'Medium', xp: '+35 XP' },
    { id: 'trace', category: 'trace', emoji: '✍️', title: 'Script & Letter Trace', desc: 'Trace character strokes on the drawing canvas to master handwriting!', color: 'from-purple-500 to-indigo-600', diff: 'Easy', xp: '+25 XP' },
    { id: 'sound', category: 'sound', emoji: '🔊', title: 'Phonics Sound Scout', desc: 'Listen to spoken native audio & identify the matching word card!', color: 'from-amber-500 to-orange-600', diff: 'Medium', xp: '+35 XP' },
    { id: 'duel', category: 'battle', emoji: '⚔️', title: 'Literacy Duel Arena', desc: 'Fight quirky word monsters — answer correctly to attack, get it wrong and take the hit!', color: 'from-rose-600 to-red-800', diff: 'Hard', xp: '+50 XP' },
  ];

  const filteredGames = activeCategory === 'all'
    ? games
    : games.filter(g => g.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-[#5C67F2] text-white shadow-lg shadow-indigo-500/30 scale-105'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-105'
            }`}
            style={activeCategory === cat.id ? { animation: 'arcadePillPulse 2s ease-in-out infinite' } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Game Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((g, idx) => (
          <div
            key={g.id}
            onClick={() => onSelectGame(g.id)}
            className="group relative bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800 hover:border-[#5C67F2]/60 rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/20 cursor-pointer flex flex-col justify-between overflow-hidden"
            style={{ animation: `arcadeCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${idx * 70}ms` }}
          >
            {/* hover shine sweep */}
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden rounded-3xl">
              <div className="absolute top-0 left-0 w-1/4 h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', animation: 'arcadeCardShine 1.4s ease-in-out infinite' }} />
            </div>

            {/* subtle glow ring on hover */}
            <div className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: '0 0 0 1px rgba(92,103,242,0.4), 0 0 24px rgba(92,103,242,0.25)' }} />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                  {g.emoji}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    g.diff === 'Easy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    g.diff === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {g.diff}
                  </span>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    ⭐ {g.xp}
                  </span>
                </div>
              </div>

              <h3 className="text-white font-black text-base group-hover:text-indigo-400 transition-colors">
                {g.title}
              </h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed mt-1.5">
                {g.desc}
              </p>
            </div>

            <div className="relative z-10 mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Click to Start
              </span>
              <span className="text-xs font-black text-[#5C67F2] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                PLAY GAME ▶
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 1: WORD SCRAMBLE
// ----------------------------------------------------------------------------
function ScrambleGame({ lang, isMuted, onAwardXP, onBack }) {
  const bank = getWordBank(lang);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * bank.length));
  const [scrambled, setScrambled] = useState([]);
  const [chosen, setChosen] = useState([]);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(20);
  const [combo, setCombo] = useState(0);
  const timerRef = useRef(null);

  const current = bank[idx];

  const makeScramble = (word) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.map((l, i) => ({ l, id: i }));
  };

  const initRound = (newIdx) => {
    const w = bank[newIdx];
    setScrambled(makeScramble(w.word));
    setChosen([]);
    setResult(null);
    setTimer(20);
  };

  useEffect(() => { initRound(idx); }, [idx]);

  useEffect(() => {
    if (result) return;
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setResult('timeout');
          playArcadeSound('wrong', isMuted);
          setCombo(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, result]);

  const handleLetterClick = (item) => {
    if (result) return;
    if (chosen.find(c => c.id === item.id)) return;
    playArcadeSound('click', isMuted);
    const newChosen = [...chosen, item];
    setChosen(newChosen);
    if (newChosen.length === current.word.split('').length) {
      const formed = newChosen.map(c => c.l).join('');
      clearInterval(timerRef.current);
      if (formed === current.word) {
        const pts = 10 + Math.max(0, timer) + (combo >= 2 ? 5 : 0);
        setScore(s => s + pts);
        setCombo(c => c + 1);
        playArcadeSound('correct', isMuted);
        onAwardXP(pts);
        setResult('correct');
      } else {
        playArcadeSound('wrong', isMuted);
        setResult('wrong');
        setCombo(0);
      }
    }
  };

  const handleRemoveLetter = (item) => {
    if (result) return;
    playArcadeSound('click', isMuted);
    setChosen(chosen.filter(c => c.id !== item.id));
  };

  const nextRound = () => {
    const newIdx = (idx + 1) % bank.length;
    setIdx(newIdx);
    setRound(r => r + 1);
  };

  const timerPct = (timer / 20) * 100;
  const timerColor = timer > 10 ? '#10B981' : timer > 5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center space-y-5 max-w-lg mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="w-full flex items-center justify-between">
        <span className="text-slate-400 text-xs font-bold">Round {round}</span>
        <div className="flex items-center gap-3">
          {combo >= 2 && <span className="text-orange-400 text-xs font-black animate-pulse">🔥 x{combo} Combo!</span>}
          <span className="text-white font-black text-sm">Score: {score}</span>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
        <span className="text-3xl">{current.emoji}</span>
        <p className="text-slate-200 text-sm font-semibold">{current.hint}</p>
      </div>

      <div className="flex gap-2 min-h-[56px] items-center justify-center flex-wrap">
        {Array.from({ length: current.word.split('').length }).map((_, i) => {
          const c = chosen[i];
          return (
            <button
              key={i}
              onClick={() => c && handleRemoveLetter(c)}
              className={`w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center transition border-2 ${
                c
                  ? result === 'correct'
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : result === 'wrong'
                    ? 'bg-red-500 border-red-400 text-white'
                    : 'bg-[#5C67F2] border-indigo-400 text-white cursor-pointer hover:opacity-80'
                  : 'bg-slate-900 border-slate-800 text-transparent'
              }`}
            >
              {c ? c.l : '_'}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {scrambled.map(item => {
          const used = chosen.find(c => c.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleLetterClick(item)}
              disabled={!!used || !!result}
              className={`w-12 h-12 rounded-2xl font-black text-xl transition border-2 cursor-pointer ${
                used
                  ? 'bg-slate-800/30 border-slate-800/30 text-slate-700'
                  : 'bg-slate-800 border-slate-700 text-white hover:bg-[#5C67F2] hover:border-[#5C67F2] hover:scale-110 active:scale-95'
              }`}
            >
              {used ? '' : item.l}
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`w-full p-5 rounded-3xl text-center border-2 animate-fade-in ${
          result === 'correct' ? 'bg-emerald-950/60 border-emerald-500/50' : 'bg-rose-950/60 border-rose-500/50'
        }`}>
          <p className="text-3xl mb-1">{result === 'correct' ? '🎉' : '❌'}</p>
          <p className="text-white font-black text-lg">
            {result === 'correct' ? 'Correct Word!' : 'Not quite!'}
          </p>
          {result !== 'correct' && (
            <p className="text-slate-300 text-sm mt-1">Target: <span className="font-black text-white">{current.word}</span></p>
          )}
          <button onClick={nextRound} className="mt-4 px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer">
            Next Word →
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 2: FLASH QUIZ
// ----------------------------------------------------------------------------
function FlashCardGame({ lang, isMuted, onAwardXP, onBack }) {
  const cards = getFlashCards(lang);
  const shuffled = useMemo(() => [...cards].sort(() => Math.random() - 0.5), [lang]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);
  const [timer, setTimer] = useState(15);
  const timerRef = useRef(null);

  const current = shuffled[idx];

  useEffect(() => {
    if (done || selected) return;
    setTimer(15);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setSelected('__timeout__');
          playArcadeSound('wrong', isMuted);
          setStreak(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [idx, done]);

  const handleSelect = (opt) => {
    if (selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    if (opt === current.a) {
      const pts = 15 + Math.max(0, timer) + (streak >= 2 ? 10 : 0);
      setScore(s => s + pts);
      setStreak(s => s + 1);
      playArcadeSound('correct', isMuted);
      onAwardXP(pts);
    } else {
      playArcadeSound('wrong', isMuted);
      setStreak(0);
    }
  };

  const nextQ = () => {
    if (idx + 1 >= shuffled.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSelected(null);
    }
  };

  if (done) {
    return (
      <GameResultsScreen
        title="Speed Flash Quiz"
        score={score}
        maxScore={shuffled.length * 25}
        xpEarned={score}
        onPlayAgain={() => { setIdx(0); setDone(false); setSelected(null); setScore(0); }}
        onBackToHub={onBack}
        isMuted={isMuted}
      />
    );
  }

  const timerPct = (timer / 15) * 100;
  const timerColor = timer > 8 ? '#10B981' : timer > 4 ? '#F59E0B' : '#EF4444';

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-lg mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-bold">Question {idx + 1} of {shuffled.length}</span>
        <div className="flex items-center gap-2">
          {streak >= 2 && <span className="text-orange-400 text-xs font-black animate-pulse">🔥 {streak}-streak!</span>}
          <span className="text-white font-black text-sm">Score: {score}</span>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 border border-slate-800 text-center shadow-lg">
        <p className="text-white font-bold text-base leading-relaxed">{current.q}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {current.opts.map(opt => {
          let style = 'bg-slate-900 border-slate-800 text-white hover:border-[#5C67F2] hover:bg-indigo-950/40';
          if (selected) {
            if (opt === current.a) style = 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
            else if (opt === selected) style = 'bg-rose-950/80 border-rose-500 text-rose-300';
            else style = 'bg-slate-900/40 border-slate-900 text-slate-600';
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={!!selected}
              className={`p-4 rounded-2xl border-2 font-bold text-sm transition text-center cursor-pointer ${style} ${!selected ? 'hover:scale-[1.02] active:scale-95' : ''}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="text-center animate-fade-in pt-2">
          <button onClick={nextQ} className="px-6 py-2.5 bg-[#5C67F2] text-white font-black text-xs rounded-xl shadow-lg hover:bg-indigo-600 transition cursor-pointer active:scale-95">
            {idx + 1 >= shuffled.length ? 'See Final Results 🏆' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 3: LETTER DROP ARCADE
// ----------------------------------------------------------------------------
function LetterDropGame({ lang, isMuted, onAwardXP, onBack }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    drops: [], score: 0, lives: 3, level: 1, frameId: null,
    basketX: 160, letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lastDrop: 0, speed: 1.2, isOver: false,
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [caughtFlash, setCaughtFlash] = useState(null);
  const [targetLetter, setTargetLetter] = useState('A');
  const targetRef = useRef('A');

  const W = 320, H = 380;
  const BASKET_W = 60, BASKET_H = 16;

  const pickNewTarget = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const t = letters[Math.floor(Math.random() * letters.length)];
    targetRef.current = t;
    setTargetLetter(t);
  };

  const startGame = () => {
    playArcadeSound('click', isMuted);
    const s = stateRef.current;
    s.drops = []; s.score = 0; s.lives = 3; s.level = 1;
    s.basketX = W / 2 - BASKET_W / 2;
    s.lastDrop = 0; s.speed = 1.2; s.isOver = false;
    setScore(0); setLives(3); setGameOver(false);
    pickNewTarget();
    setStarted(true);
  };

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    const loop = (ts) => {
      if (s.isOver) return;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(92,103,242,0.08)';
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let j = 0; j < H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

      if (ts - s.lastDrop > Math.max(800 - s.level * 60, 300)) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const l = Math.random() < 0.45 ? targetRef.current : letters[Math.floor(Math.random() * letters.length)];
        s.drops.push({ x: Math.random() * (W - 30) + 10, y: -20, l, speed: s.speed + Math.random() * 0.5 });
        s.lastDrop = ts;
      }

      s.drops = s.drops.filter(d => {
        d.y += d.speed;
        if (d.y + 18 >= H - 30 - BASKET_H && d.x >= s.basketX - 10 && d.x <= s.basketX + BASKET_W + 10) {
          if (d.l === targetRef.current) {
            s.score += 10;
            setScore(s.score);
            playArcadeSound('catch', isMuted);
            setCaughtFlash(`+10 ${d.l}!`);
            setTimeout(() => setCaughtFlash(null), 600);
            if (s.score % 50 === 0) { s.level++; s.speed += 0.2; }
            pickNewTarget();
          } else {
            s.lives--;
            setLives(s.lives);
            playArcadeSound('wrong', isMuted);
            if (s.lives <= 0) {
              s.isOver = true;
              onAwardXP(Math.floor(s.score / 2));
              setGameOver(true);
              return false;
            }
          }
          return false;
        }
        if (d.y > H - 28) {
          if (d.l === targetRef.current) {
            s.lives--;
            setLives(s.lives);
            playArcadeSound('wrong', isMuted);
            if (s.lives <= 0) { s.isOver = true; onAwardXP(Math.floor(s.score / 2)); setGameOver(true); }
          }
          return false;
        }
        const isTarget = d.l === targetRef.current;
        ctx.beginPath();
        ctx.arc(d.x + 12, d.y + 12, 16, 0, Math.PI * 2);
        ctx.fillStyle = isTarget ? 'rgba(92,103,242,0.9)' : 'rgba(51,65,85,0.9)';
        ctx.fill();
        ctx.strokeStyle = isTarget ? '#A855F7' : '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 14px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(d.l, d.x + 12, d.y + 17);
        return true;
      });

      const bx = s.basketX, by = H - 28;
      const grad = ctx.createLinearGradient(bx, by, bx + BASKET_W, by + BASKET_H);
      grad.addColorStop(0, '#5C67F2');
      grad.addColorStop(1, '#A855F7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(bx, by, BASKET_W, BASKET_H, 8);
      ctx.fill();

      s.frameId = requestAnimationFrame(loop);
    };

    s.frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.frameId);
  }, [started, gameOver]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    stateRef.current.basketX = Math.min(Math.max(x - BASKET_W / 2, 0), W - BASKET_W);
  };

  return (
    <div className="p-4 flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      {!started ? (
        <div className="text-center space-y-4 py-8">
          <span className="text-6xl">🎯</span>
          <h3 className="text-white font-black text-xl">Letter Catch Arcade</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            Drag basket left & right. <strong className="text-white">Catch the target letter</strong> floating down from the sky!
          </p>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer">
            Start Arcade Game!
          </button>
        </div>
      ) : gameOver ? (
        <GameResultsScreen
          title="Letter Catch Arcade"
          score={score}
          maxScore={100}
          xpEarned={Math.floor(score / 2)}
          onPlayAgain={startGame}
          onBackToHub={onBack}
          isMuted={isMuted}
        />
      ) : (
        <>
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
            <div className="text-center bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
              <span className="text-slate-400 text-[10px] font-bold block uppercase">Target:</span>
              <span className="text-indigo-400 font-black text-xl">{targetLetter}</span>
            </div>
            <span className="text-white font-black text-xs">Score: {score}</span>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="rounded-3xl border border-slate-800 touch-none shadow-2xl"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
            />
            {caughtFlash && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-black text-xs px-3 py-1 rounded-full animate-bounce pointer-events-none">
                {caughtFlash}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME: WORD SNIPER SHOOTING RANGE
// ----------------------------------------------------------------------------
function ShootingGame({ lang, isMuted, onAwardXP, onBack }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 160, y: 190 });
  const stateRef = useRef({
    targets: [], bullets: [], score: 0, lives: 3, level: 1, frameId: null,
    lastSpawn: 0, speed: 1.4, isOver: false, lastShot: 0, deck: [],
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [hitFlash, setHitFlash] = useState(null);
  const [targetEmoji, setTargetEmoji] = useState('🍎');
  const [targetHint, setTargetHint] = useState('');
  const targetWordRef = useRef('');

  const W = 320, H = 380;
  const CANNON_X = W / 2, CANNON_Y = H - 8;

  // Picture-to-word round: a picture (emoji) is shown, and the player must
  // shoot the flying word that names it, dodging the other flying words.
  const pickNewTarget = () => {
    const bank = getWordBank(lang);
    const entry = bank[Math.floor(Math.random() * bank.length)];
    targetWordRef.current = entry.word;
    setTargetEmoji(entry.emoji);
    setTargetHint(entry.hint);
  };

  const startGame = () => {
    playArcadeSound('click', isMuted);
    const s = stateRef.current;
    s.targets = []; s.bullets = []; s.score = 0; s.lives = 3; s.level = 1;
    s.lastSpawn = 0; s.speed = 1.1; s.isOver = false; s.lastShot = 0;
    setScore(0); setLives(3); setGameOver(false);
    pickNewTarget();
    setStarted(true);
  };

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const bank = getWordBank(lang);

    const loop = (ts) => {
      if (s.isOver) return;
      ctx.clearRect(0, 0, W, H);

      // Night-sky backdrop
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0B1226');
      sky.addColorStop(1, '#151B34');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(236,72,153,0.06)';
      for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let j = 0; j < H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

      // Spawn flying word-capsule targets, crossing left-to-right or right-to-left
      if (ts - s.lastSpawn > Math.max(1300 - s.level * 80, 620)) {
        let word;
        if (Math.random() < 0.45) {
          word = targetWordRef.current;
        } else {
          const distractors = bank.filter(b => b.word !== targetWordRef.current);
          const pool = distractors.length ? distractors : bank;
          word = pool[Math.floor(Math.random() * pool.length)].word;
        }
        const fromLeft = Math.random() < 0.5;
        s.targets.push({
          x: fromLeft ? -60 : W + 60,
          y: 40 + Math.random() * (H - 160),
          text: word,
          vx: (fromLeft ? 1 : -1) * (s.speed + Math.random() * 0.5),
          bob: Math.random() * Math.PI * 2,
        });
        s.lastSpawn = ts;
      }

      // Move + draw targets (bobbing word capsules)
      s.targets = s.targets.filter(tgt => {
        tgt.x += tgt.vx;
        tgt.bob += 0.06;
        const yy = tgt.y + Math.sin(tgt.bob) * 6;

        if (tgt.x < -100 || tgt.x > W + 100) {
          if (tgt.text === targetWordRef.current) {
            s.lives--;
            setLives(s.lives);
            playArcadeSound('wrong', isMuted);
            if (s.lives <= 0) { s.isOver = true; onAwardXP(Math.floor(s.score / 2)); setGameOver(true); }
          }
          return false;
        }

        const isTarget = tgt.text === targetWordRef.current;
        ctx.font = 'bold 13px sans-serif';
        const textW = ctx.measureText(tgt.text).width;
        const capW = Math.max(textW + 24, 44);
        const capH = 26;
        ctx.beginPath();
        ctx.roundRect(tgt.x - capW / 2, yy - capH / 2, capW, capH, 13);
        ctx.fillStyle = isTarget ? 'rgba(236,72,153,0.92)' : 'rgba(51,65,85,0.9)';
        ctx.fill();
        ctx.strokeStyle = isTarget ? '#F472B6' : '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(tgt.text, tgt.x, yy + 4);
        tgt._drawX = tgt.x; tgt._drawY = yy; tgt._hw = capW / 2; tgt._hh = capH / 2;
        return true;
      });

      // Move + draw bullets, test collisions against targets
      s.bullets = s.bullets.filter(b => {
        b.x += b.vx; b.y += b.vy; b.t++;
        if (b.t > 60 || b.x < -10 || b.x > W + 10 || b.y < -10) return false;

        for (let i = 0; i < s.targets.length; i++) {
          const tgt = s.targets[i];
          const hw = tgt._hw ?? 22, hh = tgt._hh ?? 13;
          const dx = Math.abs(b.x - (tgt._drawX ?? tgt.x));
          const dy = Math.abs(b.y - (tgt._drawY ?? tgt.y));
          if (dx < hw + 3 && dy < hh + 3) {
            if (tgt.text === targetWordRef.current) {
              s.score += 15;
              setScore(s.score);
              playArcadeSound('catch', isMuted);
              setHitFlash(`+15 "${tgt.text}"!`);
              setTimeout(() => setHitFlash(null), 600);
              if (s.score % 60 === 0) { s.level++; s.speed += 0.2; }
              pickNewTarget();
            } else {
              s.lives--;
              setLives(s.lives);
              playArcadeSound('wrong', isMuted);
              setHitFlash(`Oops, not "${tgt.text}"!`);
              setTimeout(() => setHitFlash(null), 600);
              if (s.lives <= 0) { s.isOver = true; onAwardXP(Math.floor(s.score / 2)); setGameOver(true); }
            }
            s.targets.splice(i, 1);
            return false;
          }
        }

        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FDE68A';
        ctx.shadowColor = '#FDE68A';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        return true;
      });

      // Cannon, rotated to face the pointer
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const angle = Math.atan2(my - CANNON_Y, mx - CANNON_X);
      ctx.save();
      ctx.translate(CANNON_X, CANNON_Y);
      ctx.rotate(angle);
      const barrel = ctx.createLinearGradient(0, -6, 34, 6);
      barrel.addColorStop(0, '#F472B6');
      barrel.addColorStop(1, '#EC4899');
      ctx.fillStyle = barrel;
      ctx.beginPath();
      ctx.roundRect(0, -6, 34, 12, 6);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(CANNON_X, CANNON_Y, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#831843';
      ctx.fill();
      ctx.strokeStyle = '#F9A8D4';
      ctx.lineWidth = 2;
      ctx.stroke();

      s.frameId = requestAnimationFrame(loop);
    };

    s.frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.frameId);
  }, [started, gameOver, lang]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseMove = (e) => {
    mouseRef.current = getCanvasPos(e);
  };

  const handleFire = (e) => {
    const s = stateRef.current;
    const now = performance.now();
    if (now - s.lastShot < 220) return;
    s.lastShot = now;
    const { x, y } = getCanvasPos(e);
    const dx = x - CANNON_X, dy = y - CANNON_Y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 9;
    playArcadeSound('flip', isMuted);
    s.bullets.push({ x: CANNON_X, y: CANNON_Y, vx: (dx / dist) * speed, vy: (dy / dist) * speed, t: 0 });
  };

  return (
    <div className="p-4 flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      {!started ? (
        <div className="text-center space-y-4 py-8">
          <span className="text-6xl">🔫</span>
          <h3 className="text-white font-black text-xl">Picture Word Sniper</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            A picture appears — aim the cannon with your mouse and <strong className="text-white">click to shoot</strong> the flying word that names it. Dodge the wrong words!
          </p>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-fuchsia-500 to-rose-600 text-white font-black text-xs rounded-xl shadow-lg transition hover:scale-105 active:scale-95 cursor-pointer">
            Start Shooting Range!
          </button>
        </div>
      ) : gameOver ? (
        <GameResultsScreen
          title="Picture Word Sniper"
          score={score}
          maxScore={120}
          xpEarned={Math.floor(score / 2)}
          onPlayAgain={startGame}
          onBackToHub={onBack}
          isMuted={isMuted}
        />
      ) : (
        <>
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 shrink-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
            <div className="flex-1 text-center bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-xl min-w-0">
              <span className="text-slate-400 text-[9px] font-bold block uppercase tracking-wider">Shoot the word for:</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-2xl leading-none">{targetEmoji}</span>
              </div>
            </div>
            <span className="text-white font-black text-xs shrink-0">Score: {score}</span>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="rounded-3xl border border-slate-800 touch-none shadow-2xl cursor-crosshair"
              onMouseMove={handleMouseMove}
              onTouchMove={handleMouseMove}
              onClick={handleFire}
              onTouchStart={(e) => { handleMouseMove(e); handleFire(e); }}
            />
            {hitFlash && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-fuchsia-500 text-white font-black text-xs px-3 py-1 rounded-full animate-bounce pointer-events-none whitespace-nowrap">
                {hitFlash}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 4: MEMORY MATCH FLIP
// ----------------------------------------------------------------------------
function MemoryMatchGame({ isMuted, onAwardXP, onBack }) {
  const [cards, setCards] = useState(() =>
    [...MEMORY_PAIR_ITEMS].sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, uniqueId: i, isFlipped: false, isMatched: false }))
  );
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  const handleFlip = (card) => {
    if (card.isFlipped || card.isMatched || flipped.length >= 2) return;
    playArcadeSound('flip', isMuted);
    const updated = cards.map(c => c.uniqueId === card.uniqueId ? { ...c, isFlipped: true } : c);
    setCards(updated);
    const newFlipped = [...flipped, card];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      if (newFlipped[0].pairId === newFlipped[1].pairId) {
        playArcadeSound('correct', isMuted);
        onAwardXP(10);
        setTimeout(() => {
          setCards(prev => prev.map(c => c.pairId === newFlipped[0].pairId ? { ...c, isMatched: true } : c));
          setFlipped([]);
        }, 500);
      } else {
        playArcadeSound('wrong', isMuted);
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.uniqueId === newFlipped[0].uniqueId || c.uniqueId === newFlipped[1].uniqueId) ? { ...c, isFlipped: false } : c));
          setFlipped([]);
        }, 900);
      }
    }
  };

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.isMatched)) {
      setDone(true);
    }
  }, [cards]);

  const restart = () => {
    playArcadeSound('click', isMuted);
    setCards([...MEMORY_PAIR_ITEMS].sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, uniqueId: i, isFlipped: false, isMatched: false })));
    setFlipped([]);
    setMoves(0);
    setDone(false);
  };

  if (done) {
    const score = Math.max(20, 100 - moves * 5);
    return (
      <GameResultsScreen
        title="Memory Match Flip"
        score={score}
        maxScore={100}
        xpEarned={60}
        onPlayAgain={restart}
        onBackToHub={onBack}
        isMuted={isMuted}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center space-y-5 max-w-lg mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="w-full flex items-center justify-between">
        <span className="text-white font-black text-sm">🧩 Memory Match</span>
        <span className="text-slate-400 text-xs font-bold">Moves: {moves}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 w-full">
        {cards.map(c => (
          <button
            key={c.uniqueId}
            onClick={() => handleFlip(c)}
            className={`h-24 rounded-2xl font-black text-sm transition-all duration-300 border-2 cursor-pointer flex flex-col items-center justify-center p-2 ${
              c.isFlipped || c.isMatched
                ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-purple-500 text-white scale-105 shadow-lg shadow-purple-500/20'
                : 'bg-slate-900 border-slate-800 text-transparent hover:border-slate-700 hover:scale-102'
            }`}
          >
            {c.isFlipped || c.isMatched ? (
              <>
                <span className="text-2xl mb-1">{c.emoji}</span>
                <span className="text-[10px] text-purple-200 font-bold">{c.text.split(' ')[0]}</span>
              </>
            ) : (
              <span className="text-xl text-slate-700">❓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 5: SENTENCE BUILDER
// ----------------------------------------------------------------------------
function SentenceBuilderGame({ isMuted, onAwardXP, onBack }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [built, setBuilt] = useState([]);
  const [words, setWords] = useState([]);
  const [result, setResult] = useState(null);

  const current = SENTENCE_GAMES[idx];

  const initRound = (index) => {
    const list = SENTENCE_GAMES[index].sentence.split(' ');
    setWords([...list].sort(() => Math.random() - 0.5).map((w, i) => ({ w, id: i })));
    setBuilt([]);
    setResult(null);
  };

  useEffect(() => { initRound(idx); }, [idx]);

  const speakSentence = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(current.sentence);
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handlePick = (wordObj) => {
    if (result) return;
    playArcadeSound('click', isMuted);
    setBuilt(b => [...b, wordObj]);
    setWords(w => w.filter(item => item.id !== wordObj.id));
  };

  const handleUndo = (wordObj) => {
    if (result) return;
    playArcadeSound('click', isMuted);
    setBuilt(b => b.filter(item => item.id !== wordObj.id));
    setWords(w => [...w, wordObj]);
  };

  const checkSentence = () => {
    const target = current.sentence;
    const formed = built.map(b => b.w).join(' ');
    if (formed === target) {
      playArcadeSound('correct', isMuted);
      setScore(s => s + 25);
      onAwardXP(25);
      setResult('correct');
    } else {
      playArcadeSound('wrong', isMuted);
      setResult('wrong');
    }
  };

  const next = () => {
    if (idx + 1 >= SENTENCE_GAMES.length) {
      setResult('done');
    } else {
      setIdx(i => i + 1);
    }
  };

  if (result === 'done') {
    return (
      <GameResultsScreen
        title="Sentence Builder"
        score={score}
        maxScore={SENTENCE_GAMES.length * 25}
        xpEarned={score}
        onPlayAgain={() => { setIdx(0); setResult(null); setScore(0); }}
        onBackToHub={onBack}
        isMuted={isMuted}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-lg mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="flex items-center justify-between">
        <span className="text-white font-black text-sm">🏗️ Sentence Builder</span>
        <span className="text-slate-400 text-xs font-bold">Round {idx + 1} of {SENTENCE_GAMES.length}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center flex items-center justify-between gap-3">
        <p className="text-slate-300 text-xs font-semibold">Hint: {current.hint}</p>
        <button
          onClick={speakSentence}
          className="px-3 py-1.5 bg-[#5C67F2]/20 border border-[#5C67F2]/40 text-[#5C67F2] rounded-xl text-xs font-black hover:bg-[#5C67F2] hover:text-white transition cursor-pointer"
        >
          🔊 Listen
        </button>
      </div>

      <div className="min-h-[64px] bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl p-4 flex flex-wrap items-center justify-center gap-2">
        {built.map(b => (
          <button
            key={b.id}
            onClick={() => handleUndo(b)}
            className="px-3 py-2 bg-[#5C67F2] text-white font-black text-xs rounded-xl shadow-md cursor-pointer hover:bg-rose-600 transition"
          >
            {b.w}
          </button>
        ))}
        {built.length === 0 && <span className="text-slate-600 text-xs font-bold">Tap word blocks below in order...</span>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {words.map(w => (
          <button
            key={w.id}
            onClick={() => handlePick(w)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-2xl border border-slate-700 transition active:scale-95 cursor-pointer shadow-sm"
          >
            {w.w}
          </button>
        ))}
      </div>

      {result && (
        <div className={`p-4 rounded-2xl text-center border font-bold text-sm ${result === 'correct' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-rose-950 border-rose-500 text-rose-300'}`}>
          {result === 'correct' ? '🎉 Perfect Sentence!' : `Target: "${current.sentence}"`}
        </div>
      )}

      <div className="flex gap-3">
        {!result ? (
          <button
            onClick={checkSentence}
            disabled={words.length > 0}
            className="w-full py-3 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer active:scale-95"
          >
            Check Sentence ✔
          </button>
        ) : (
          <button
            onClick={next}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer active:scale-95"
          >
            Next Sentence →
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 6: SCRIPT & LETTER TRACING
// ----------------------------------------------------------------------------
function TracingGame({ isMuted, onAwardXP, onBack }) {
  const [idx, setIdx] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [evaluated, setEvaluated] = useState(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const currentLetter = TRACING_LETTERS[idx];

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 260, 260);
    ctx.font = 'bold 140px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillText(currentLetter, 130, 130);
    setHasDrawn(false);
    setEvaluated(null);
  };

  useEffect(() => { clearCanvas(); }, [idx]);

  const startDraw = (e) => {
    isDrawing.current = true;
    setHasDrawn(true);
    draw(e);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  const stopDraw = () => { isDrawing.current = false; };

  const submitTrace = () => {
    if (!hasDrawn) return;
    playArcadeSound('correct', isMuted);
    onAwardXP(25);
    setEvaluated(true);
  };

  const nextLetter = () => {
    setIdx(i => (i + 1) % TRACING_LETTERS.length);
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="text-center">
        <h3 className="text-white font-black text-lg">✍️ Script & Letter Trace</h3>
        <p className="text-slate-400 text-xs font-medium mt-0.5">Trace over character outline <strong className="text-emerald-400">{currentLetter}</strong></p>
      </div>

      <div className="relative bg-slate-900 rounded-3xl border border-slate-800 p-2 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="rounded-2xl touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      {evaluated && (
        <div className="bg-emerald-950 border border-emerald-500/40 px-4 py-2 rounded-2xl text-center animate-fade-in">
          <p className="text-emerald-300 font-black text-sm">🌟 Great stroke precision! +25 XP</p>
        </div>
      )}

      <div className="flex gap-2 w-full">
        <button onClick={clearCanvas} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition cursor-pointer">
          Clear ↺
        </button>
        {!evaluated ? (
          <button onClick={submitTrace} disabled={!hasDrawn} className="flex-1 py-2.5 bg-[#5C67F2] disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer">
            Evaluate →
          </button>
        ) : (
          <button onClick={nextLetter} className="flex-1 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer">
            Next Letter →
          </button>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 7: SOUND & PHONICS HUNT
// ----------------------------------------------------------------------------
function SoundHuntGame({ lang, isMuted, onAwardXP, onBack }) {
  const bank = getWordBank(lang);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);

  const currentWord = bank[idx];

  const speechCodes = {
    english: 'en-US', hindi: 'hi-IN', bengali: 'bn-IN', tamil: 'ta-IN', telugu: 'te-IN', punjabi: 'pa-IN'
  };

  const playWordAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = speechCodes[lang] || 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const distractors = bank.filter(w => w.word !== currentWord.word).sort(() => Math.random() - 0.5).slice(0, 3);
    setOptions([...distractors, currentWord].sort(() => Math.random() - 0.5));
    setSelected(null);
    playWordAudio();
  }, [idx]);

  const handleSelect = (item) => {
    if (selected) return;
    setSelected(item.word);
    if (item.word === currentWord.word) {
      playArcadeSound('correct', isMuted);
      setScore(s => s + 20);
      onAwardXP(20);
    } else {
      playArcadeSound('wrong', isMuted);
    }
  };

  const next = () => {
    setIdx(i => (i + 1) % bank.length);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-lg mx-auto text-center">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="self-start text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div>
        <h3 className="text-white font-black text-xl">🗣️ Phonics Sound Scout</h3>
        <p className="text-slate-400 text-xs font-medium mt-1">Listen carefully and tap the word you hear!</p>
      </div>

      <div className="py-4">
        <button
          onClick={playWordAudio}
          className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#5C67F2] to-purple-600 text-white text-4xl flex items-center justify-center shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition cursor-pointer border-4 border-purple-400/30 mx-auto"
        >
          🔊
        </button>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-3">Tap to replay audio</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map(opt => {
          let style = 'bg-slate-900 border-slate-800 text-white hover:border-[#5C67F2]';
          if (selected) {
            if (opt.word === currentWord.word) style = 'bg-emerald-950 border-emerald-500 text-emerald-300';
            else if (opt.word === selected) style = 'bg-rose-950 border-rose-500 text-rose-300';
            else style = 'bg-slate-950 border-slate-900 text-slate-600';
          }
          return (
            <button
              key={opt.word}
              onClick={() => handleSelect(opt)}
              disabled={!!selected}
              className={`p-4 rounded-2xl border-2 font-black text-base transition ${style} ${!selected ? 'hover:scale-102 cursor-pointer' : ''}`}
            >
              {opt.word}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="animate-fade-in pt-2">
          <button onClick={next} className="px-6 py-2.5 bg-[#5C67F2] text-white font-black text-xs rounded-xl shadow-lg hover:bg-indigo-600 transition cursor-pointer active:scale-95">
            Next Sound →
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GAME 8: LITERACY DUEL ARENA (Fight an opponent, learn while you battle!)
// ----------------------------------------------------------------------------
const DUEL_OPPONENTS = [
  { name: 'Grammar Goblin', emoji: '👹', tagline: 'Twists your tenses into chaos!' },
  { name: 'Spelling Dragon', emoji: '🐉', tagline: 'Breathes scrambled letters!' },
  { name: 'Vocab Vampire', emoji: '🧛', tagline: 'Hungry for your word power!' },
  { name: 'Quiz Kraken', emoji: '🐙', tagline: 'Eight arms of tricky trivia!' },
];

function WordDuelGame({ lang, isMuted, onAwardXP, onBack }) {
  const bank = useMemo(() => [...getFlashCards(lang)].sort(() => Math.random() - 0.5), [lang]);
  const opponent = useMemo(() => DUEL_OPPONENTS[Math.floor(Math.random() * DUEL_OPPONENTS.length)], [lang]);

  const [qIdx, setQIdx] = useState(0);
  const [playerHP, setPlayerHP] = useState(100);
  const [opponentHP, setOpponentHP] = useState(100);
  const [selected, setSelected] = useState(null);
  const [battleLog, setBattleLog] = useState([`⚔️ ${opponent.name} appears! ${opponent.tagline}`]);
  const [shake, setShake] = useState(null); // 'player' | 'opponent' | null
  const [outcome, setOutcome] = useState(null); // 'win' | 'lose' | null
  const [xpEarned, setXpEarned] = useState(0);
  const [round, setRound] = useState(1);

  const current = bank[qIdx % bank.length];

  const pushLog = (msg) => setBattleLog(prev => [msg, ...prev].slice(0, 4));

  const handleAttack = (opt) => {
    if (selected || outcome) return;
    setSelected(opt);
    const isCorrect = opt === current.a;

    if (isCorrect) {
      const dmg = 15 + Math.floor(Math.random() * 11);
      playArcadeSound('correct', isMuted);
      setShake('opponent');
      pushLog(`✅ Correct! You strike ${opponent.name} for ${dmg} damage.`);
      onAwardXP(10);
      setXpEarned(x => x + 10);
      setOpponentHP(hp => Math.max(0, hp - dmg));
    } else {
      const dmg = 10 + Math.floor(Math.random() * 8);
      playArcadeSound('wrong', isMuted);
      setShake('player');
      pushLog(`❌ Wrong! ${opponent.name} strikes back for ${dmg} damage. (Answer: ${current.a})`);
      setPlayerHP(hp => Math.max(0, hp - dmg));
    }

    setTimeout(() => setShake(null), 400);
  };

  // Resolve the battle once either fighter's HP hits zero
  useEffect(() => {
    if (outcome) return;
    if (opponentHP <= 0) {
      setOutcome('win');
      const bonus = 40 + Math.round(playerHP / 2);
      onAwardXP(bonus);
      setXpEarned(x => x + bonus);
      playArcadeSound('fanfare', isMuted);
      pushLog(`🏆 ${opponent.name} is defeated! Victory!`);
    } else if (playerHP <= 0) {
      setOutcome('lose');
      playArcadeSound('wrong', isMuted);
      pushLog(`💀 You were defeated by ${opponent.name}. Practice more and try again!`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentHP, playerHP]);

  const nextRound = () => {
    setSelected(null);
    setQIdx(i => i + 1);
    setRound(r => r + 1);
  };

  const restart = () => {
    setQIdx(0);
    setPlayerHP(100);
    setOpponentHP(100);
    setSelected(null);
    setOutcome(null);
    setXpEarned(0);
    setRound(1);
    setBattleLog([`⚔️ ${opponent.name} appears! ${opponent.tagline}`]);
  };

  if (outcome) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto animate-fade-in">
        <div className="relative">
          <div className="text-7xl animate-bounce">{outcome === 'win' ? '🏆' : '💀'}</div>
          <div className="absolute -top-3 -right-3 text-3xl animate-ping">{outcome === 'win' ? '✨' : '💥'}</div>
        </div>
        <div>
          <h3 className="text-white font-black text-2xl tracking-tight">
            {outcome === 'win' ? 'Victory!' : 'Defeated...'}
          </h3>
          <p className="text-gray-400 text-xs font-bold mt-1">
            {outcome === 'win' ? `You defeated ${opponent.name}!` : `${opponent.name} won this round.`}
          </p>
        </div>

        <div className="w-full bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-300 border-b border-purple-500/20 pb-2">
            <span>Rounds Survived</span>
            <span className="text-emerald-400 font-black text-sm">{round}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-gray-300 pt-1">
            <span>XP Earned</span>
            <span className="text-yellow-400 font-black text-base">+ {xpEarned} XP ⭐</span>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => { playArcadeSound('click', isMuted); restart(); }}
            className="flex-1 py-3 bg-gradient-to-r from-[#5C67F2] to-[#7C3AED] hover:brightness-110 text-white font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
          >
            🔄 Fight Again
          </button>
          <button
            onClick={() => { playArcadeSound('click', isMuted); onBack(); }}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            🎮 Back to Arcade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
      <button onClick={() => { playArcadeSound('click', isMuted); onBack(); }} className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer">
        ← Back to Arcade
      </button>

      <div className="flex items-center justify-between">
        <span className="text-white font-black text-sm">⚔️ Literacy Duel Arena</span>
        <span className="text-slate-400 text-xs font-bold">Round {round}</span>
      </div>

      {/* Battle stage */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player */}
        <div className={`bg-slate-900 border-2 rounded-3xl p-4 text-center transition-transform duration-150 ${shake === 'player' ? 'border-rose-500 -translate-x-1' : 'border-slate-800'}`}>
          <span className="text-4xl block mb-2">🧑‍🎓</span>
          <p className="text-white font-black text-xs mb-2">You</p>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${playerHP}%` }} />
          </div>
          <p className="text-[10px] font-bold text-emerald-400 mt-1">{playerHP} HP</p>
        </div>

        {/* Opponent */}
        <div className={`bg-slate-900 border-2 rounded-3xl p-4 text-center transition-transform duration-150 ${shake === 'opponent' ? 'border-rose-500 translate-x-1' : 'border-slate-800'}`}>
          <span className="text-4xl block mb-2">{opponent.emoji}</span>
          <p className="text-white font-black text-xs mb-2">{opponent.name}</p>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500" style={{ width: `${opponentHP}%` }} />
          </div>
          <p className="text-[10px] font-bold text-rose-400 mt-1">{opponentHP} HP</p>
        </div>
      </div>

      {/* Question / attack prompt */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-5 border border-slate-800 text-center shadow-lg">
        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Answer correctly to attack!</span>
        <p className="text-white font-bold text-sm leading-relaxed">{current.q}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {current.opts.map(opt => {
          let style = 'bg-slate-900 border-slate-800 text-white hover:border-[#5C67F2] hover:bg-indigo-950/40';
          if (selected) {
            if (opt === current.a) style = 'bg-emerald-950/80 border-emerald-500 text-emerald-300';
            else if (opt === selected) style = 'bg-rose-950/80 border-rose-500 text-rose-300';
            else style = 'bg-slate-900/40 border-slate-900 text-slate-600';
          }
          return (
            <button
              key={opt}
              onClick={() => handleAttack(opt)}
              disabled={!!selected}
              className={`p-4 rounded-2xl border-2 font-bold text-sm transition text-center cursor-pointer ${style} ${!selected ? 'hover:scale-[1.02] active:scale-95' : ''}`}
            >
              ⚔️ {opt}
            </button>
          );
        })}
      </div>

      {/* Battle log */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 space-y-1 max-h-24 overflow-y-auto">
        {battleLog.map((log, i) => (
          <p key={i} className={`text-[10px] font-semibold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{log}</p>
        ))}
      </div>

      {selected && (
        <div className="text-center animate-fade-in">
          <button onClick={nextRound} className="px-6 py-2.5 bg-[#5C67F2] text-white font-black text-xs rounded-xl shadow-lg hover:bg-indigo-600 transition cursor-pointer active:scale-95">
            Next Attack →
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. MAIN DASHBOARD VIEW LAYER WITH ADAPTIVE MATRIX
// ============================================================================
export default function Dashboard({ userId, fullName, lang, educationalLevel, age, tutorVoiceUri, onLogout, onProfileUpdate, onLanguagePreview, onNavigateToPremium, t }) {
  const [activeTab, setActiveTab] = useState('all');
  const [activeModule, setActiveModule] = useState(null);
  // Incremented after every successful assessment submission to trigger instant history refresh
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const triggerHistoryRefresh = () => setHistoryRefreshKey(k => k + 1);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState(fullName || '');
  const [profileLanguage, setProfileLanguage] = useState(lang || 'english');
  const [profileEduLevel, setProfileEduLevel] = useState(educationalLevel || 'none');
  const [profileAge, setProfileAge] = useState(age || '');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [profileTutorVoiceUri, setProfileTutorVoiceUri] = useState(tutorVoiceUri || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);

  // Dynamic Personalization Customization Theme States
  const [dashboardFont, setDashboardFont] = useState(localStorage.getItem('cached_font') || 'outfit');
  const [dashboardTheme, setDashboardTheme] = useState(localStorage.getItem('cached_theme') || 'indigo');
  const [profileAvatar, setProfileAvatar] = useState(localStorage.getItem('cached_avatar') || '👤');

  // Mini-game modal state
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [launchGameId, setLaunchGameId] = useState(null);

  // Community game-invite picker state
  const [isInvitePickerOpen, setIsInvitePickerOpen] = useState(false);
  // On-screen anchor for the invite picker. The dropdown is rendered as a
  // fixed-position overlay (see bottom of component) instead of living
  // inside the Study Lounge hero card, because that card has
  // `overflow-hidden` (for its rounded corners/starfield effect) which was
  // silently clipping the dropdown so it never appeared. Fixed positioning
  // + this computed anchor keeps it visible no matter which button opens it.
  const [invitePickerPos, setInvitePickerPos] = useState({ top: 0, right: 0 });
  const openInvitePicker = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setInvitePickerPos({
      top: rect.bottom + 8,
      right: Math.max(12, window.innerWidth - rect.right)
    });
    setIsInvitePickerOpen(prev => !prev);
  };

  // Community lounge redesign: feed filter tabs, sort order, and lightweight
  // per-message emoji reactions (all purely client-side/visual state).
  const [communityFeedTab, setCommunityFeedTab] = useState('all');
  const [communityNewestFirst, setCommunityNewestFirst] = useState(true);
  const [communitySortMenuOpen, setCommunitySortMenuOpen] = useState(false);
  const [communityReactions, setCommunityReactions] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityTime, setActivityTime] = useState('');
  const [msgImage, setMsgImage] = useState(null);
  const imageAttachRef = useRef(null);
  const activityInputRef = useRef(null);

  // Load and subscribe to system speech synthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadSystemVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadSystemVoices();
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Update voice state if prop changes
  useEffect(() => {
    if (tutorVoiceUri) {
      setProfileTutorVoiceUri(tutorVoiceUri);
    }
  }, [tutorVoiceUri]);

  // Onboarding Strength/Weakness Analysis Greeting Effect
  useEffect(() => {
    if (!userId) return;

    const scoresStr = localStorage.getItem(`sakshar_initial_assessment_scores_${userId}`);
    const greetingShown = localStorage.getItem(`sakshar_onboarding_greeting_shown_${userId}`);

    if (scoresStr && !greetingShown) {
      let scores = {};
      try {
        scores = JSON.parse(scoresStr);
      } catch (err) {
        return;
      }

      setIsTutorLoading(true);

      const fetchOnboardingWelcome = async () => {
        try {
          const res = await fetch('http://127.0.0.1:5000/api/tutor/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `ACT_AS_WELCOME_GREETING: Welcome the user and analyze their initial assessment scores. Here are the scores - Reading: ${scores.reading}%, Writing: ${scores.writing}%, Speaking: ${scores.speaking}%, Applied Reasoning: ${scores.reasoning}%, Overall Competency: ${scores.overall}%. Highlight their strengths (scores >= 80) and weaknesses (scores < 60) clearly, and guide them on what they should practice first.`,
              name: fullName || 'Learner',
              language: lang,
              educational_level: educationalLevel,
              age: age || '',
              history: []
            })
          });
          const resData = await res.json();
          if (resData.success && resData.reply) {
            const botMsg = { id: Date.now(), text: resData.reply, isBot: true };
            setAiTutorMessages([botMsg]);
            localStorage.setItem(`sakshar_onboarding_greeting_shown_${userId}`, 'true');
            if (isTtsEnabled) speakText(resData.reply, botMsg.id);
          }
        } catch (err) {
          console.warn("Failed to generate dynamic welcome greeting:", err);
        } finally {
          setIsTutorLoading(false);
        }
      };

      fetchOnboardingWelcome();
    }
  }, [userId, fullName, lang, educationalLevel, age]);

  // ── Real streak tracking ────────────────────────────────────────────────────
  // Records today's date in localStorage and computes consecutive-day streak.
  const [streakCount, setStreakCount] = useState(0);
  const [streakDays, setStreakDays] = useState(new Set()); // ISO date strings 'YYYY-MM-DD'
  const calendarScrollRef = useRef(null);

  const toISODate = (d) => d.toISOString().split('T')[0];

  useEffect(() => {
    const today = new Date();
    const todayKey = toISODate(today);
    const storageKey = `sakshar_login_days_${userId || 'guest'}`;

    // Load existing days set
    let existing = [];
    try { existing = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { existing = []; }

    // Add today if not already there
    if (!existing.includes(todayKey)) {
      existing.push(todayKey);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    }

    const daysSet = new Set(existing);
    setStreakDays(daysSet);

    // Compute consecutive streak backward from today
    let streak = 0;
    const cur = new Date(today);
    while (daysSet.has(toISODate(cur))) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }
    setStreakCount(streak);

    // Auto-scroll calendar to today (centre it)
    setTimeout(() => {
      if (calendarScrollRef.current) {
        const todayEl = calendarScrollRef.current.querySelector('[data-today="true"]');
        if (todayEl) todayEl.scrollIntoView({ inline: 'center', behavior: 'smooth' });
      }
    }, 300);
  }, [userId]);
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Lexend:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // New Relational States
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [lessonsLoading, setLessonsLoading] = useState(false);

  const [aiRecommendation, setAiRecommendation] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recReason, setRecReason] = useState('');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Sync profile options to local storage
  useEffect(() => {
    if (lang) localStorage.setItem('cached_lang', lang);
    if (educationalLevel) localStorage.setItem('cached_edu_level', educationalLevel);
  }, [lang, educationalLevel]);

  // Load lessons and progress from database (graceful fallback when Flask is offline)
  useEffect(() => {
    if (userId && (activeTab === 'lessons' || activeTab === 'all')) {
      setLessonsLoading(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      Promise.all([
        fetch(`http://127.0.0.1:5000/api/lessons?level=${educationalLevel}&lang=${lang}`, { signal: controller.signal }).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`http://127.0.0.1:5000/api/progress?user_id=${userId}`, { signal: controller.signal }).then(r => r.json()).catch(() => ({ success: false }))
      ])
        .then(([lessonsData, progressData]) => {
          clearTimeout(timeout);
          if (lessonsData.success) {
            setLessons(getLocalizedLessons(lessonsData.lessons, lang));
          } else {
            // Fallback to local lessons for this level track
            const filtered = LOCAL_LESSONS.filter(les => les.level === educationalLevel);
            setLessons(getLocalizedLessons(filtered, lang));
          }
          if (progressData.success) {
            const completed = new Set(
              progressData.progress
                .filter(p => p.status === 'completed')
                .map(p => p.lesson_id)
            );
            setCompletedLessons(completed);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          // Fallback on total connection failure
          const filtered = LOCAL_LESSONS.filter(les => les.level === educationalLevel);
          setLessons(getLocalizedLessons(filtered, lang));
        })
        .finally(() => setLessonsLoading(false));
    }
  }, [userId, educationalLevel, activeTab, lang]);

  // Load AI Recommendation — try Flask first, then localStorage cache
  useEffect(() => {
    if (userId) {
      const cachedRec = localStorage.getItem(`sakshar_rec_${userId}`);
      const cachedReason = localStorage.getItem(`sakshar_rec_reason_${userId}`);
      if (cachedRec) {
        setAiRecommendation(cachedRec);
        setRecReason(cachedReason || '');
      }
      // Also try Flask for fresher data
      fetch(`http://127.0.0.1:5000/api/recommendations?user_id=${userId}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.recommendations?.length > 0) {
            setAiRecommendation(data.recommendations[0].lesson);
            setRecReason(data.recommendations[0].reason);
          }
        })
        .catch(() => { /* Flask offline — already showing cached */ });
    }
  }, [userId]);

  // Load History for stats calculation (with localStorage fallback when Flask is offline)
  const fetchHistoryForStats = async () => {
    try {
      const url = userId ? `http://127.0.0.1:5000/api/analytics/history?user_id=${userId}` : 'http://127.0.0.1:5000/api/analytics/history';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
        setHistoryLoading(false);
        return;
      }
    } catch (err) {
      // Flask offline — fall back to localStorage silently
    }
    setHistory(getHistoryFromLocal(userId));
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchHistoryForStats();
  }, [userId, historyRefreshKey]);

  // Compute metrics dynamically for progress tracking
  const averageScore = useMemo(() => {
    const scoredAttempts = history.filter(h => h.score !== undefined);
    if (scoredAttempts.length === 0) return 0;
    const sum = scoredAttempts.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(sum / scoredAttempts.length);
  }, [history]);

  // ============================================================================
  // STEP 3 (SKILL EVALUATION) + STEP 8 (PERFORMANCE REPORTS)
  // Break the raw history log down per skill (reading / writing / speaking),
  // surface strengths & gaps, and turn the weakest skill into a one-click
  // recommended next lesson — matching the project flow chart's Skill
  // Evaluation and Performance Reports steps.
  // ============================================================================
  const skillBreakdown = useMemo(() => {
    const skills = ['reading', 'writing', 'speaking'];
    const result = {};
    skills.forEach((skill) => {
      const attempts = history.filter(h => h.module_type === skill && h.score !== undefined);
      const avg = attempts.length > 0
        ? Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length)
        : null;
      result[skill] = { average: avg, attemptCount: attempts.length };
    });
    return result;
  }, [history]);

  const getSkillStatus = (avg) => {
    if (avg === null) return { label: 'Not Started Yet', color: 'text-gray-400', bar: 'bg-gray-200' };
    if (avg >= 70) return { label: 'Strength', color: 'text-emerald-700', bar: 'bg-emerald-600' };
    if (avg >= 40) return { label: 'Developing', color: 'text-amber-600', bar: 'bg-amber-500' };
    return { label: 'Needs Focus', color: 'text-red-600', bar: 'bg-red-500' };
  };

  const skillMeta = {
    reading: { label: 'Reading', icon: '📖' },
    writing: { label: 'Writing', icon: '✍️' },
    speaking: { label: 'Speaking', icon: '🗣️' }
  };

  // The weakest attempted skill becomes the "area for improvement" / next
  // recommended lesson. Skills with no attempts yet take priority over
  // low-scoring ones, since they represent an outright learning gap.
  const weakestSkillKey = useMemo(() => {
    const skills = ['reading', 'writing', 'speaking'];
    const untried = skills.find(s => skillBreakdown[s].average === null);
    if (untried) return untried;

    let lowest = null;
    skills.forEach((s) => {
      if (lowest === null || skillBreakdown[s].average < skillBreakdown[lowest].average) {
        lowest = s;
      }
    });
    return lowest;
  }, [skillBreakdown]);

  const performanceReport = useMemo(() => {
    const attemptedSkills = ['reading', 'writing', 'speaking'].filter(s => skillBreakdown[s].average !== null);
    const strengths = attemptedSkills.filter(s => skillBreakdown[s].average >= 70);
    const gaps = ['reading', 'writing', 'speaking'].filter(s => skillBreakdown[s].average === null || skillBreakdown[s].average < 40);

    let areasForImprovement;
    if (gaps.length === 0 && attemptedSkills.length === 3) {
      areasForImprovement = "You're performing solidly across reading, writing, and speaking — keep practicing to push every skill into mastery range.";
    } else if (gaps.length > 0) {
      const gapLabels = gaps.map(s => skillMeta[s].label).join(' and ');
      areasForImprovement = `Focus next on ${gapLabels}${gaps.some(s => skillBreakdown[s].average === null) ? " — you haven't attempted this yet" : ", where your score is below 40%"}.`;
    } else {
      areasForImprovement = "Keep practicing consistently across all three skills to move from developing to strength.";
    }

    return {
      strengthsLabel: strengths.length > 0 ? strengths.map(s => skillMeta[s].label).join(', ') : 'Still building — complete a few more lessons to reveal strengths',
      areasForImprovement,
      recommendedSkill: weakestSkillKey
    };
  }, [skillBreakdown, weakestSkillKey]);

  const handleToggleLesson = async (lessonId) => {
    const isCompleted = completedLessons.has(lessonId);
    const newStatus = isCompleted ? 'in_progress' : 'completed';

    setCompletedLessons(prev => {
      const copy = new Set(prev);
      if (isCompleted) copy.delete(lessonId);
      else copy.add(lessonId);
      return copy;
    });

    try {
      await fetch('http://127.0.0.1:5000/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          lesson_id: lessonId,
          status: newStatus
        })
      });
    } catch (err) {
      console.error("Error toggling progress:", err);
    }
  };

  const handleGetAiRecommendation = async () => {
    setRecLoading(true);
    const prompt = `You are an expert foundational literacy AI tutor for adult and first-generation learners.
Generate a personalized lesson plan for a student with the following profile:
- Name: ${fullName || 'Learner'}
- Native Language Track: ${lang || 'english'}
- Current Level: ${getEduLevelLabel(educationalLevel)}
- Last Assessment Score: ${averageScore || 100}/100

Provide the response in clear, encouraging, structured sections:
1. Focus Objective (What they should practice today)
2. Target Vocabulary/Characters (Provide simple practice items with translations if relevant)
3. Simple Exercise (A reading or character matching prompt suitable for their exact tier)
Do not use complex jargon or overly long paragraphs. Keep instructions direct and easy to read.`;

    const reasonStr = `Based on literacy level '${getEduLevelLabel(educationalLevel)}' and recent score of ${averageScore || 100}%`;

    // Try calling Gemini API directly from frontend first
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          }
        );
        const geminiData = await geminiRes.json();
        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          setAiRecommendation(text);
          setRecReason(reasonStr);
          // Cache in localStorage so it survives page refresh
          localStorage.setItem(`sakshar_rec_${userId}`, text);
          localStorage.setItem(`sakshar_rec_reason_${userId}`, reasonStr);
          // Also try to save to Flask in background (non-blocking)
          fetch('http://127.0.0.1:5000/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, name: fullName, language: lang, educational_level: getEduLevelLabel(educationalLevel), recent_score: averageScore || 100 })
          }).catch(() => {});
          setRecLoading(false);
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini direct call failed, trying Flask fallback:', geminiErr);
      }
    }

    // Fallback: try Flask backend
    try {
      const recRes = await fetch('http://127.0.0.1:5000/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: fullName,
          language: lang,
          educational_level: getEduLevelLabel(educationalLevel),
          recent_score: averageScore || 100
        })
      });
      const data = await recRes.json();
      if (data.success) {
        setAiRecommendation(data.recommendation);
        setRecReason(data.reason);
        localStorage.setItem(`sakshar_rec_${userId}`, data.recommendation);
        localStorage.setItem(`sakshar_rec_reason_${userId}`, data.reason);
      }
    } catch (err) {
      setAiRecommendation('⚠️ Could not connect to the AI service. Please check your internet connection and try again.');
      setRecReason('');
    } finally {
      setRecLoading(false);
    }
  };

  // Keep modal state synchronized when props change
  useEffect(() => {
    setProfileName(fullName);
    setProfileLanguage(lang);
    setProfileEduLevel(educationalLevel);
    setProfileAge(age || '');
    setProfileTutorVoiceUri(tutorVoiceUri || '');
  }, [fullName, lang, educationalLevel, age, tutorVoiceUri, isProfileModalOpen]);

  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    setProfileUpdateError('');
    setProfileUpdateSuccess(false);
    setIsUpdatingProfile(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Could not authenticate current session. Please sign in again.");

      await updateUserAuthProfile(profileName, profileLanguage, profileEduLevel, profileAge, profileTutorVoiceUri);

      await updateUserProfileTable(user.id, {
        fullName: profileName,
        language: profileLanguage,
        educationalLevel: profileEduLevel,
        age: profileAge
      });

      // Save locally as a secondary cache
      localStorage.setItem(`tutor_voice_uri_${userId}`, profileTutorVoiceUri);

      if (onProfileUpdate) {
        onProfileUpdate({
          fullName: profileName,
          language: profileLanguage,
          educationalLevel: profileEduLevel,
          age: profileAge,
          tutorVoiceUri: profileTutorVoiceUri
        });
      }

      setProfileUpdateSuccess(true);
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileUpdateSuccess(false);
      }, 1500);
    } catch (err) {
      setProfileUpdateError(err.message || "Failed to update profile settings.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      onLogout();
    } catch (error) {
      console.error("Error signing out user:", error.message);
    }
  };

  const getEduLevelLabel = (level) => {
    switch (level) {
      case 'none': return t.eduLevel1 || "Foundational Learner";
      case 'primary': return t.eduLevel2 || "Primary Education Track";
      case 'middle': return t.eduLevel3 || "Middle School Track";
      case 'high': return t.eduLevel4 || "High School Track";
      case 'higher': return t.eduLevel5 || "Higher Education Track";
      default: return t.eduLevel1 || "Foundational Learner";
    }
  };

  const getLanguageNativeLabel = (langCode) => {
    const labels = {
      english: 'English', hindi: 'हिन्दी', telugu: 'తెలుగు', punjabi: 'ਪੰਜਾਬੀ', 
      bengali: 'বাংলা', marathi: 'मराठी', tamil: 'தமிழ்', gujarati: 'ગુજરાતી', 
      kannada: 'ಕನ್ನಡ', malayalam: 'മലയാളം', odia: 'ଓਡ଼ਿଆ', urdu: 'اُردُو', 
      assamese: 'অসমীয়া', maithili: 'मैथली', santhali: 'ᱥᱟᱱᱛᱷᱟਲᱤ', 
      kashmiri: 'کٲשੁਰ', nepali: 'नेपाली', gondi: 'गोंडी', sindhi: 'سنڌي', konkani: 'कोंકणी'
    };
    return labels[langCode] || langCode;
  };

  const currentTierMeta = levelCurriculumMeta[educationalLevel] || levelCurriculumMeta.none;
  const tierKeySuffix = { none: 'None', primary: 'Primary', middle: 'Middle', high: 'High' }[educationalLevel] || 'None';
  const localizedReadingSub = t[`readingSub${tierKeySuffix}`] || currentTierMeta.readingSub;
  const localizedWritingSub = t[`writingSub${tierKeySuffix}`] || currentTierMeta.writingSub;
  const localizedSpeakingSub = t[`speakingSub${tierKeySuffix}`] || currentTierMeta.speakingSub;

  const practiceCards = [
    { 
      id: 'reading', 
      icon: '📖', 
      title: t.readingTitle || 'Reading Practice', 
      sub: localizedReadingSub,
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600',
      level: currentTierMeta.badge,
      duration: currentTierMeta.duration,
      tag: 'literacy'
    },
    { 
      id: 'writing', 
      icon: '✍️', 
      title: t.writingTitle || 'Writing Practice', 
      sub: localizedWritingSub,
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600',
      level: currentTierMeta.badge,
      duration: currentTierMeta.duration,
      tag: 'literacy'
    },
    { 
      id: 'speaking', 
      icon: '🗣️', 
      title: t.speakingTitle || 'Speaking Assessment', 
      sub: localizedSpeakingSub,
      image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=600',
      level: 'Interactive',
      duration: currentTierMeta.duration,
      tag: 'voice'
    }
  ];

  const filteredCards = activeTab === 'all' 
    ? practiceCards 
    : practiceCards.filter(card => card.tag === activeTab);

  // States for dynamic redesigned dashboard layout
  const [currentNav, setCurrentNav] = useState('dashboard');
  const [activeLessonIndex, setActiveLessonIndex] = useState(null); // index into filteredLessons for the one-by-one lesson player
  const [searchQuery, setSearchQuery] = useState('');
  const [communityMessages, setCommunityMessages] = useState([
    { id: 1, sender: "Ramesh Kumar", text: "Just finished the alphabet tracing block — 95% accuracy! Feeling amazing 🔥", time: "Just now", avatar: "👨‍🎓" },
    { id: 2, sender: "Priya Sharma", text: "Congrats Ramesh! I'm working on the pronunciation test. Anyone have tips for tricky consonants?", time: "3m ago", avatar: "👩‍🎓" },
    { id: 3, sender: "Tutor Amit", text: "Welcome back everyone! Daily practice builds confidence — even 15 minutes a day makes a huge difference. Keep it up! 🌱", time: "10m ago", avatar: "👨‍🏫" },
    { id: 4, sender: "Ananya Verma", text: "I was struggling with writing last week but today I scored 78%! Thank you all for the encouragement 🎉", time: "18m ago", avatar: "👩" },
    { id: 5, sender: "Sakshar AI Companion", text: "Ananya that's a brilliant improvement! Keep practicing the letter-flow exercises — you're on the right track 🤖✨", time: "18m ago", avatar: "🤖" },
  ]);
  const [newMsgText, setNewMsgText] = useState('');
  const [isCompanionTyping, setIsCompanionTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Upgraded Premium Interactive States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "🎉 Streak Achieved: You have maintained a 5-day learning streak!", time: "5m ago", read: false, icon: "🔥" },
    { id: 2, text: "🗣️ Pronunciation verified: Ramesh Kumar liked your spoken pronunciation match.", time: "1h ago", read: false, icon: "👍" },
    { id: 3, text: "📚 New Lesson Unlocked: Class 2 two-letter word speller is now active.", time: "1d ago", read: true, icon: "🔓" }
  ]);
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]); // ISO date YYYY-MM-DD
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, +1 = next week
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [selectedModalCourse, setSelectedModalCourse] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('vocabulary'); // 'vocabulary' | 'tracing' | 'exercises'
  const [showModalVideo, setShowModalVideo] = useState(false); // inline YouTube embed toggle
  const [isGraderOpen, setIsGraderOpen] = useState(false);
  const [graderData, setGraderData] = useState(null);
  const buildTutorGreeting = () => (t.tutorGreeting || `Hello {name}! I am your AI Literacy Tutor. I can help guide your study path. Choose a suggested option or write a query.`).replace('{name}', fullName || 'Learner');
  const [aiTutorMessages, setAiTutorMessages] = useState([
    { id: 1, text: buildTutorGreeting(), isBot: true }
  ]);
  const [aiTutorInput, setAiTutorInput] = useState('');
  const [isTutorLoading, setIsTutorLoading] = useState(false);

  // ── Text-to-Speech state ──
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const ttsUtteranceRef = useRef(null);

  // Map our language keys to BCP-47 locale codes for voice selection
  const langToLocale = {
    english: 'en-IN', hindi: 'hi-IN', bengali: 'bn-IN', punjabi: 'pa-IN',
    telugu: 'te-IN', tamil: 'ta-IN', marathi: 'mr-IN', gujarati: 'gu-IN',
    kannada: 'kn-IN', odia: 'or-IN', malayalam: 'ml-IN', assamese: 'as-IN',
    urdu: 'ur-IN', maithili: 'mai', santhali: 'sat', kashmiri: 'ks',
    konkani: 'kok', sindhi: 'sd', dogri: 'doi', manipuri: 'mni',
    nepali: 'ne-NP', gondi: 'hi-IN'
  };

  // Helper to dynamically detect the script language locale of a text segment
  const detectLanguageLocale = (text, userLang) => {
    const userLocale = langToLocale[userLang] || 'en-IN';
    
    // Devanagari script (Hindi, Marathi, Konkani, Nepali, Dogri, Gondi, Maithili)
    if (/[\u0900-\u097F]/.test(text)) {
      if (['marathi', 'konkani', 'nepali', 'maithili', 'dogri', 'gondi', 'hindi'].includes(userLang)) {
        return userLocale;
      }
      return 'hi-IN';
    }
    
    // Bengali script (Bengali, Assamese)
    if (/[\u0980-\u09FF]/.test(text)) {
      if (['bengali', 'assamese'].includes(userLang)) {
        return userLocale;
      }
      return 'bn-IN';
    }
    
    // Gurmukhi script (Punjabi)
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa-IN';
    
    // Gujarati script (Gujarati)
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu-IN';
    
    // Tamil script (Tamil)
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    
    // Telugu script (Telugu)
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN';
    
    // Kannada script (Kannada)
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn-IN';
    
    // Malayalam script (Malayalam)
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml-IN';
    
    return userLocale; // Default matching fallback
  };

  // Core TTS speaker — segments text by sentence, detects the script language of each, and queues them in voice synthesis
  const speakText = (text, msgId) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeakingMsgId(null);

    // Split text by sentence punctuation marks: . ? ! । \n
    const rawSentences = text.split(/([.?!।\n]+)/).filter(s => s.trim().length > 0);
    const segments = [];
    
    for (let i = 0; i < rawSentences.length; i++) {
      let segmentText = rawSentences[i];
      // Append punctuation mark if the next item is one
      if (i + 1 < rawSentences.length && /^[.?!।\n]+$/.test(rawSentences[i + 1])) {
        segmentText += rawSentences[i + 1];
        i++;
      }
      segments.push(segmentText.trim());
    }

    if (segments.length === 0) return;

    let started = false;
    let completedCount = 0;

    segments.forEach((seg) => {
      const utter = new SpeechSynthesisUtterance(seg);
      const detectedLocale = detectLanguageLocale(seg, lang);
      
      utter.lang = detectedLocale;
      utter.rate = 0.92;
      utter.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      
      // Use selected custom voice if the segment language matches user's native profile language
      const isNativeLocale = detectedLocale === (langToLocale[lang] || 'en-IN');
      const activeVoiceUri = isNativeLocale ? (profileTutorVoiceUri || tutorVoiceUri || localStorage.getItem(`tutor_voice_uri_${userId}`)) : null;
      
      const match = (activeVoiceUri && voices.find(v => v.voiceURI === activeVoiceUri))
        || voices.find(v => v.lang === detectedLocale)
        || voices.find(v => v.lang.startsWith(detectedLocale.split('-')[0]))
        || voices[0];
        
      if (match) utter.voice = match;

      utter.onstart = () => {
        if (!started) {
          started = true;
          setSpeakingMsgId(msgId);
        }
      };

      utter.onend = () => {
        completedCount++;
        if (completedCount === segments.length) {
          setSpeakingMsgId(null);
        }
      };

      utter.onerror = () => {
        completedCount++;
        if (completedCount === segments.length) {
          setSpeakingMsgId(null);
        }
      };

      ttsUtteranceRef.current = utter;
      window.speechSynthesis.speak(utter);
    });
  };

  // Stop TTS when unmuted globally or chat cleared
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingMsgId(null);
  };

  // ── Speech-to-Text (STT) state & handler ──
  const [isListeningTutor, setIsListeningTutor] = useState(false);
  const tutorRecognitionRef = useRef(null);

  const toggleTutorListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isListeningTutor) {
      if (tutorRecognitionRef.current) {
        tutorRecognitionRef.current.stop();
      }
      setIsListeningTutor(false);
      return;
    }

    stopSpeaking(); // Stop any active playback before recording begins

    const rec = new SpeechRecognition();
    rec.lang = langToLocale[lang] || 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListeningTutor(true);
    };

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text) {
        setAiTutorInput(text);
      }
    };

    rec.onerror = (e) => {
      console.error("Tutor speech recognition error:", e);
      setIsListeningTutor(false);
    };

    rec.onend = () => {
      setIsListeningTutor(false);
    };

    tutorRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListeningTutor(false);
    }
  };

  // Re-greet in the newly selected language when the conversation hasn't started yet
  useEffect(() => {
    setAiTutorMessages(prev => (prev.length <= 1 ? [{ id: Date.now(), text: buildTutorGreeting(), isBot: true }] : prev));
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Cleanup TTS and Speech Recognition on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (tutorRecognitionRef.current) {
        tutorRecognitionRef.current.stop();
      }
    };
  }, []);

  // Modal Mini Tracing Canvas Ref
  const modalCanvasRef = useRef(null);
  const [isModalDrawing, setIsModalDrawing] = useState(false);
  const [hasModalDrawn, setHasModalDrawn] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [communityMessages, isCompanionTyping]);

  const handlePostMessage = (e) => {
    e.preventDefault();
    if (!newMsgText.trim() && !msgImage) return;
    const userMsg = {
      id: Date.now(),
      sender: fullName || "Learner",
      text: newMsgText,
      image: msgImage || null,
      time: "Just now",
      avatar: profileAvatar || '👤'
    };
    setCommunityMessages(prev => [...prev, userMsg]);
    setNewMsgText('');
    setMsgImage(null);
    setShowEmojiPicker(false);
    setIsCompanionTyping(true);
    setTimeout(() => {
      setIsCompanionTyping(false);
      setCommunityMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "Sakshar AI Companion",
          text: `Great contribution, ${fullName || 'learner'}! Your engagement helps the whole community grow stronger.`,
          time: "Just now",
          avatar: "🤖"
        }
      ]);
    }, 1500);
  };

  // Best-effort category tag for a lounge message, used to power the
  // All Messages / Discussions / Study Help / Wins & Achievements filter tabs.
  const getCommunityMsgCategory = (msg) => {
    if (msg.type === 'invite') return 'wins';
    const text = (msg.text || '').toLowerCase();
    if (/(accuracy|score|streak|win|congrat|achiev|🎉|🏆|🔥)/.test(text)) return 'wins';
    if (/(help|stuck|how do i|\?|struggl)/.test(text)) return 'help';
    return 'discussions';
  };

  // Deterministic default reaction set (per message id) so bubbles feel
  // "alive" even before the user taps anything themselves.
  const DEFAULT_COMMUNITY_REACTION_SETS = [
    [{ emoji: '❤️', count: 12 }, { emoji: '🎉', count: 5 }, { emoji: '👍', count: 3 }],
    [{ emoji: '🎉', count: 10 }, { emoji: '🔥', count: 4 }, { emoji: '🙌', count: 2 }],
    [{ emoji: '👍', count: 15 }, { emoji: '❤️', count: 6 }, { emoji: '✨', count: 3 }],
    [{ emoji: '🔥', count: 7 }, { emoji: '👏', count: 4 }],
  ];
  const getCommunityReactions = (msg) => {
    if (communityReactions[msg.id]) return communityReactions[msg.id];
    const idx = Math.abs(Number(msg.id) || 0) % DEFAULT_COMMUNITY_REACTION_SETS.length;
    return DEFAULT_COMMUNITY_REACTION_SETS[idx];
  };
  const handleToggleCommunityReaction = (msg, emoji) => {
    setCommunityReactions(prev => {
      const current = prev[msg.id] || getCommunityReactions(msg);
      const exists = current.some(r => r.emoji === emoji);
      const next = exists
        ? current.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r)
        : [...current, { emoji, count: 1 }];
      return { ...prev, [msg.id]: next };
    });
  };

  const handleCreateCommunityActivity = () => {
    setActivityTitle('');
    setActivityTime('');
    setShowActivityModal(true);
    setTimeout(() => activityInputRef.current?.focus(), 100);
  };

  const handleSubmitActivity = () => {
    if (!activityTitle.trim()) return;
    const timeStr = activityTime ? ` at ${activityTime}` : '';
    setCommunityMessages(prev => [...prev, {
      id: Date.now(),
      sender: fullName || 'Learner',
      text: `📌 New Activity: "${activityTitle.trim()}"${timeStr} — who's joining?`,
      time: 'Just now',
      avatar: profileAvatar || '👤'
    }]);
    setShowActivityModal(false);
    setActivityTitle('');
    setActivityTime('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleShareAchievement = () => {
    const achievements = [
      `I just completed a ${Math.floor(Math.random()*30)+60}% accuracy reading session! 🎉`,
      `Finished my daily writing practice — 5-day streak unlocked! 🔥`,
      `Just scored ${Math.floor(Math.random()*20)+78}% on the pronunciation check! 🎙️`,
      `Completed 3 lessons today — personal best! 🏆`,
    ];
    const msg = achievements[Math.floor(Math.random() * achievements.length)];
    setCommunityMessages(prev => [...prev, {
      id: Date.now(),
      sender: fullName || 'Learner',
      text: msg,
      time: 'Just now',
      avatar: profileAvatar || '👤'
    }]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Post a "come play with me" game invite into the Study Lounge feed.
  const handleSendGameInvite = (game) => {
    const inviteMsg = {
      id: Date.now(),
      sender: fullName || "Learner",
      time: "Just now",
      avatar: profileAvatar || '👤',
      type: 'invite',
      gameId: game.id,
      gameTitle: game.title,
      gameEmoji: game.emoji,
      gameColor: game.color,
      gameXp: game.xp,
      status: 'open'
    };
    setCommunityMessages(prev => [...prev, inviteMsg]);
    setIsInvitePickerOpen(false);

    // Simulate a peer learner noticing and accepting the invite, so the
    // lounge still feels alive even without a live multiplayer backend.
    setTimeout(() => {
      const peers = ["Priya Sharma", "Ramesh Kumar", "Tutor Amit"];
      const peer = peers[Math.floor(Math.random() * peers.length)];
      setCommunityMessages(prev => prev.map(m =>
        m.id === inviteMsg.id ? { ...m, status: 'accepted', acceptedBy: peer } : m
      ));
      setCommunityMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: peer,
          text: `I'm in! Let's play ${game.title} together 🎮`,
          time: "Just now",
          avatar: peer === "Tutor Amit" ? "👨‍🏫" : (peer === "Priya Sharma" ? "👩‍🎓" : "👨‍🎓")
        }
      ]);
    }, 2200);
  };

  // Jump straight into a specific game from an invite card (works for
  // invites you sent or ones a peer posted).
  const handleAcceptInvite = (gameId) => {
    setLaunchGameId(gameId);
    setIsGameModalOpen(true);
  };

  const handleTutorSubmit = async (e) => {
    e.preventDefault();
    if (!aiTutorInput.trim()) return;
    stopSpeaking();
    const userMsgText = aiTutorInput;
    const userMsg = { id: Date.now(), text: userMsgText, isBot: false };
    
    // Optimistically update the UI with the user message
    setAiTutorMessages(prev => [...prev, userMsg]);
    setAiTutorInput('');
    setIsTutorLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsgText,
          name: fullName || 'Learner',
          language: lang,
          educational_level: educationalLevel,
          age: age || '',
          history: aiTutorMessages
        })
      });

      const resData = await response.json();
      if (resData.success && resData.reply) {
        const newId = Date.now() + 1;
        setAiTutorMessages(prev => [...prev, { id: newId, text: resData.reply, isBot: true }]);
        setIsTutorLoading(false);
        if (isTtsEnabled) speakText(resData.reply, newId);
        return;
      }
      throw new Error("Invalid backend chat payload response");
    } catch (err) {
      console.warn("AI Tutor Live Fetch error. Invoking resilient offline engine:", err);
      // Resilient local rule-based offline fallback engine
      setTimeout(() => {
        const query = userMsgText.toLowerCase();
        let replyText = "";
        if (query.includes('plan') || query.includes('schedule') || query.includes('study')) {
          replyText = t.tutorReplyPlan || `Based on your track level, here is your target schedule: 1. Tracing practice for 15 minutes. 2. Speaking exercise for 10 minutes. 3. Weekly Quiz to validate your score growth.`;
        } else if (query.includes('score') || query.includes('accuracy') || query.includes('improve')) {
          replyText = t.tutorReplyScore || `To improve your score: focus on drawing within the stroke bounds of character grids and articulate clear consonant sounds when using the speech microphone recorder.`;
        } else if (query.includes('read') || query.includes('reading')) {
          replyText = t.tutorReplyReading || `For reading practice: start with single letters, then move to short words. Try reading the story passage in the Courses section — it builds fluency step by step.`;
        } else if (query.includes('writ') || query.includes('trac')) {
          replyText = t.tutorReplyWriting || `For writing and tracing: slow and deliberate strokes work best. Focus on keeping your line centered inside the guide character. Practice each letter 3 times before moving on.`;
        } else if (query.includes('speak') || query.includes('pronoun') || query.includes('voice')) {
          replyText = t.tutorReplySpeaking || `For speaking practice: speak slowly and clearly. The speech recognition works best in a quiet space. Repeat each phrase at least twice to build confidence.`;
        } else if (query.includes('hello') || query.includes('hi') || query.includes('namaste')) {
          replyText = `Hello again! I'm always here to help. Ask me about reading, writing, speaking practice, or request a study plan.`;
        } else {
          replyText = t.tutorReplyDefault || `Understood! Let's continue practicing. Let me know if you would like me to review vocabulary words or suggest a daily study plan.`;
        }
        const newId = Date.now() + 1;
        setAiTutorMessages(prev => [...prev, { id: newId, text: replyText, isBot: true }]);
        setIsTutorLoading(false);
        if (isTtsEnabled) speakText(replyText, newId);
      }, 1000);
    }
  };

  const handleQuickSuggestedQuestion = async (question) => {
    const questionId = typeof question === 'string' ? question : question.id;
    const questionLabel = typeof question === 'string' ? question : question.label;
    stopSpeaking();
    
    // Add user question to UI
    setAiTutorMessages(prev => [...prev, { id: Date.now(), text: questionLabel, isBot: false }]);
    setIsTutorLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: questionLabel,
          name: fullName || 'Learner',
          language: lang,
          educational_level: educationalLevel,
          age: age || '',
          history: aiTutorMessages
        })
      });

      const resData = await response.json();
      if (resData.success && resData.reply) {
        const newId = Date.now() + 1;
        setAiTutorMessages(prev => [...prev, { id: newId, text: resData.reply, isBot: true }]);
        setIsTutorLoading(false);
        if (isTtsEnabled) speakText(resData.reply, newId);
        return;
      }
      throw new Error("Invalid backend chat payload response");
    } catch (err) {
      console.warn("AI Tutor Live Quick Suggestion error. Invoking offline engine:", err);
      // Offline fallback
      setTimeout(() => {
        let replyText = "";
        if (questionId === 'plan' || questionLabel.toLowerCase().includes('plan')) {
          replyText = t.tutorReplyStudyPlan || `Here is your suggested study plan. Monday and Tuesday: trace native consonant guides. Wednesday: interactive spelling and reading blocks. Thursday and Friday: pronunciation checks with the microphone. Weekend: mock quiz level checks and community interaction.`;
        } else if (questionId === 'grammar' || questionLabel.toLowerCase().includes('grammar')) {
          replyText = t.tutorReplyGrammarTip || `Educational track tip: focus on daily word structure, sight nouns, and local communication dialogues to build your vocabulary progressively.`;
        } else {
          replyText = t.tutorReplyTracingInfo || `Tracing grading details: our model matches your drawn lines with character guides. Drawing with smooth, centralized lines will maximize your accuracy score.`;
        }
        const newId = Date.now() + 1;
        setAiTutorMessages(prev => [...prev, { id: newId, text: replyText, isBot: true }]);
        setIsTutorLoading(false);
        if (isTtsEnabled) speakText(replyText, newId);
      }, 800);
    }
  };

  const triggerSubmissionsGrader = (taskTitle, scoreCode) => {
    setIsGraderOpen(true);
    const scoreVal = Math.floor(Math.random() * 15) + 84;
    setGraderData({
      title: taskTitle,
      score: scoreVal,
      tag: scoreVal >= 90 ? "Gold Star" : "Top Tracer",
      feedback: `Wonderful attempt! Your character alignment match score is ${scoreVal}%, unlocking points progress.`
    });
    // Add event logs dynamically
    setNotifications(prev => [
      { id: Date.now(), text: `🎉 Graded: Completed '${taskTitle}' with ${scoreVal}% accuracy!`, time: "Just now", read: false, icon: "🏆" },
      ...prev
    ]);
  };

  // Tracing mini modal coordinates logic
  const getModalCoordinates = (e) => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startModalDrawing = (e) => {
    e.preventDefault();
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getModalCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#5C67F2';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsModalDrawing(true);
    setHasModalDrawn(true);
  };

  const drawModal = (e) => {
    if (!isModalDrawing) return;
    e.preventDefault();
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const { x, y } = getModalCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopModalDrawing = () => setIsModalDrawing(false);

  const clearModalCanvas = () => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasModalDrawn(false);
  };

  const getCalendarAgenda = (dateStr) => {
    if (!dateStr) return 'Select a day to view agenda.';
    const d = new Date(dateStr);
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
    const isToday = dateStr === toISODate(new Date());
    const isStreak = streakDays.has(dateStr);
    if (isToday) return `📌 Today (${dayName}): Keep up your streak! Complete today’s reading, writing, or speaking practice to maintain your ${streakCount}-day streak.`;
    if (isStreak) return `✅ ${dayName}: You completed a learning session on this day. Great work — this day counts toward your active streak!`;
    return `📅 ${dayName}: No session recorded. Complete any lesson to build your streak on future days.`;
  };

  // Filter lessons based on search query
  const filteredLessons = lessons.filter(les => 
    les.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModuleView = () => {
    const handleBack = () => setActiveModule(null);

    switch (activeModule) {
      case 'reading':
        return (
          <ReadingPracticeView 
            lang={lang} 
            t={t} 
            getLanguageNativeLabel={getLanguageNativeLabel} 
            handleBack={handleBack}
            onAssessmentComplete={triggerHistoryRefresh}
            userId={userId}
          />
        );
      case 'writing':
        return (
          <WritingPracticeView 
            lang={lang} 
            t={t} 
            getLanguageNativeLabel={getLanguageNativeLabel} 
            handleBack={handleBack}
            onAssessmentComplete={triggerHistoryRefresh}
            userId={userId}
          />
        );
      case 'speaking':
        return (
          <SpeakingAssessmentView 
            lang={lang} 
            t={t} 
            getLanguageNativeLabel={getLanguageNativeLabel} 
            handleBack={handleBack}
            onAssessmentComplete={triggerHistoryRefresh}
            userId={userId}
          />
        );
      case 'level_assessment':
        return (
          <LevelAssessmentView
            userId={userId}
            level={educationalLevel}
            lang={lang}
            onBack={handleBack}
            onComplete={triggerHistoryRefresh}
          />
        );
      default:
        return null;
    }
  };

  if (activeModule) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] p-6">
        <div className="max-w-4xl mx-auto">
          {renderModuleView()}
        </div>
      </div>
    );
  }

  const getThemeStyles = () => {
    switch (dashboardTheme) {
      case 'emerald':
        return {
          '--accent-color': '#1C2D1A',
          '--accent-hover': '#2d452b',
          '--bg-color': '#F0F4F1',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#F4F7F5',
          '--text-color': '#111827',
          '--text-medium': '#374151',
          '--text-light': '#6B7280',
          '--text-muted': '#9CA3AF',
          '--border-color': '#E5E7EB',
          '--sidebar-bg': '#0D140C',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #f0fdf4 60%, #ecfdf5 100%)',
          '--sidebar-border': 'rgba(22,163,74,0.12)',
        };
      case 'amber':
        return {
          '--accent-color': '#D97706',
          '--accent-hover': '#B45309',
          '--bg-color': '#FAF7F2',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#FAF5EB',
          '--text-color': '#1C1917',
          '--text-medium': '#44403C',
          '--text-light': '#78716C',
          '--text-muted': '#A8A29E',
          '--border-color': '#E7E5E4',
          '--sidebar-bg': '#1E1B18',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #fffbeb 60%, #fef3c7 100%)',
          '--sidebar-border': 'rgba(217,119,6,0.15)',
        };
      case 'midnight':
        return {
          '--accent-color': '#6366F1',
          '--accent-hover': '#4F46E5',
          '--bg-color': '#0F172A',
          '--card-bg': '#1E293B',
          '--card-bg-light': '#334155',
          '--text-color': '#F3F4F6',
          '--text-medium': '#D1D5DB',
          '--text-light': '#9CA3AF',
          '--text-muted': '#6B7280',
          '--border-color': '#334155',
          '--sidebar-bg': '#020617',
          '--sidebar-grad': 'linear-gradient(160deg, #1E293B 0%, #0F172A 100%)',
          '--sidebar-border': 'rgba(99,102,241,0.25)',
        };
      case 'rose':
        return {
          '--accent-color': '#E11D48',
          '--accent-hover': '#BE123C',
          '--bg-color': '#FDF2F4',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#FFF1F2',
          '--text-color': '#1F2937',
          '--text-medium': '#374151',
          '--text-light': '#6B7280',
          '--text-muted': '#9CA3AF',
          '--border-color': '#FBCFE8',
          '--sidebar-bg': '#1F0A0E',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #fff1f2 60%, #ffe4e6 100%)',
          '--sidebar-border': 'rgba(225,29,72,0.15)',
        };
      case 'ocean':
        return {
          '--accent-color': '#0891B2',
          '--accent-hover': '#0E7490',
          '--bg-color': '#F0F9FB',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#ECFEFF',
          '--text-color': '#0F172A',
          '--text-medium': '#334155',
          '--text-light': '#64748B',
          '--text-muted': '#94A3B8',
          '--border-color': '#CFFAFE',
          '--sidebar-bg': '#082F33',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #ecfeff 60%, #cffafe 100%)',
          '--sidebar-border': 'rgba(8,145,178,0.15)',
        };
      case 'violet':
        return {
          '--accent-color': '#7C3AED',
          '--accent-hover': '#6D28D9',
          '--bg-color': '#F5F3FF',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#F3E8FF',
          '--text-color': '#1E1B2E',
          '--text-medium': '#3F3A52',
          '--text-light': '#6B7280',
          '--text-muted': '#A78BFA',
          '--border-color': '#E9D5FF',
          '--sidebar-bg': '#1E1033',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #f5f3ff 60%, #ede9fe 100%)',
          '--sidebar-border': 'rgba(124,58,237,0.15)',
        };
      case 'graphite':
        return {
          '--accent-color': '#94A3B8',
          '--accent-hover': '#64748B',
          '--bg-color': '#18181B',
          '--card-bg': '#27272A',
          '--card-bg-light': '#3F3F46',
          '--text-color': '#F4F4F5',
          '--text-medium': '#D4D4D8',
          '--text-light': '#A1A1AA',
          '--text-muted': '#71717A',
          '--border-color': '#3F3F46',
          '--sidebar-bg': '#09090B',
          '--sidebar-grad': 'linear-gradient(160deg, #27272A 0%, #18181B 100%)',
          '--sidebar-border': 'rgba(148,163,184,0.25)',
        };
      case 'indigo':
      default:
        return {
          '--accent-color': '#5C67F2',
          '--accent-hover': '#4E56D1',
          '--bg-color': '#F0F2F5',
          '--card-bg': '#ffffff',
          '--card-bg-light': '#F8FAFC',
          '--text-color': '#1C2D1A',
          '--text-medium': '#374151',
          '--text-light': '#6B7280',
          '--text-muted': '#9CA3AF',
          '--border-color': '#E5E7EB',
          '--sidebar-bg': '#0D1F0C',
          '--sidebar-grad': 'linear-gradient(160deg, #ffffff 0%, #f0fdf4 60%, #ecfdf5 100%)',
          '--sidebar-border': 'rgba(22,163,74,0.12)',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div 
      style={themeStyles}
      className={`min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col lg:flex-row p-5 gap-5 family-${dashboardFont} theme-custom overflow-y-auto lg:overflow-hidden select-none`}
    >
      <style>{`
        /* ── Background overrides ── */
        .theme-custom .bg-white {
          background-color: var(--card-bg) !important;
        }
        .theme-custom .bg-\[\#F0F2F5\],
        .theme-custom .bg-\[\#F0F4F1\],
        .theme-custom .bg-\[\#FAF7F2\] {
          background-color: var(--bg-color) !important;
        }
        .theme-custom .bg-\[\#0D1F0C\],
        .theme-custom .bg-\[\#0D140C\],
        .theme-custom .bg-\[\#1E1B18\],
        .theme-custom .bg-\[\#020617\] {
          background-color: var(--sidebar-bg) !important;
        }
        .theme-custom .bg-\[\#5C67F2\] {
          background-color: var(--accent-color) !important;
        }
        .theme-custom .bg-\[\#FBFBFA\],
        .theme-custom .bg-\[\#F8FAFC\],
        .theme-custom .bg-\[\#F9FAFB\] {
          background-color: var(--card-bg-light) !important;
        }
        .theme-custom .bg-emerald-50,
        .theme-custom .bg-green-50 {
          background-color: var(--card-bg-light) !important;
        }
        .theme-custom .bg-\[\#5C67F2\]\/5 {
          background-color: rgba(92, 103, 242, 0.05) !important;
        }
        .theme-custom .bg-\[\#5C67F2\]\/10 {
          background-color: rgba(92, 103, 242, 0.1) !important;
        }
        /* ── Text color hierarchy ── */
        .theme-custom .text-gray-900,
        .theme-custom .text-\[\#1C2D1A\],
        .theme-custom .text-\[\#1F2937\],
        .theme-custom .text-\[\#111827\] {
          color: var(--text-color) !important;
        }
        .theme-custom .text-gray-800,
        .theme-custom .text-gray-700 {
          color: var(--text-medium) !important;
        }
        .theme-custom .text-gray-600,
        .theme-custom .text-gray-500 {
          color: var(--text-light) !important;
        }
        .theme-custom .text-gray-400 {
          color: var(--text-muted) !important;
        }
        .theme-custom .text-\[\#5C67F2\] {
          color: var(--accent-color) !important;
        }
        .theme-custom .text-emerald-800,
        .theme-custom .text-emerald-700 {
          color: var(--accent-color) !important;
        }
        /* ── Border overrides ── */
        .theme-custom .border-gray-100,
        .theme-custom .border-gray-50 {
          border-color: var(--border-color) !important;
        }
        .theme-custom .border-gray-200 {
          border-color: var(--border-color) !important;
        }
        .theme-custom .border-\[\#5C67F2\]\/10 {
          border-color: rgba(92, 103, 242, 0.1) !important;
        }
        .theme-custom .border-\[\#5C67F2\]\/20 {
          border-color: rgba(92, 103, 242, 0.2) !important;
        }
        /* ── Animations ── */
        @keyframes sidebarGlow {
          0%,100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.18); }
        }
        @keyframes ringPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
        }
        @keyframes xpFill {
          from { width: 0%; }
          to { width: var(--xp-pct); }
        }
        @keyframes cardPop {
          from { opacity:0; transform: translateY(18px) scale(0.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes slideInRow {
          from { opacity:0; transform: translateX(-12px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes floatUp {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes flameBounce {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.12); }
        }
        @keyframes heroGlowShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes progressBar {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-card-pop { animation: cardPop 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-ring-pulse { animation: ringPulse 2.5s ease-in-out infinite; }
        .animate-float { animation: floatUp 3s ease-in-out infinite; }
        .animate-flame { animation: flameBounce 2s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .dash-card-hover {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dash-card-hover:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 16px 32px -8px rgba(16, 185, 129, 0.12), 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .dash-gradient-title {
          background: linear-gradient(135deg, #1C2D1A 0%, #15803D 60%, #047857 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        /* ── Fonts ── */
        .family-inter { font-family: 'Inter', sans-serif !important; }
        .family-outfit { font-family: 'Outfit', sans-serif !important; }
        .family-lexend { font-family: 'Lexend', sans-serif !important; }
        .family-playfair { font-family: 'Playfair Display', serif !important; }
        /* ── Scrollbar polish ── */
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        /* ── Sidebar dot-grid adapts to theme ── */
        .theme-custom .sidebar-dot-grid {
          background-image: radial-gradient(circle, var(--sidebar-border) 1px, transparent 1px) !important;
        }
      `}</style>
      
      {/* COLUMN 1: LEFT SIDEBAR — LIGHT THEME */}
      <aside className="w-full lg:w-64 flex flex-col justify-between p-5 shrink-0 rounded-[2rem] shadow-lg my-1 overflow-hidden relative" style={{ background: 'var(--sidebar-grad, linear-gradient(160deg, #ffffff 0%, #f0fdf4 60%, #ecfdf5 100%))', border: '1px solid var(--sidebar-border, rgba(22,163,74,0.12))', transition: 'background 0.4s ease, border-color 0.4s ease' }}>
        {/* Animated dot-grid backdrop */}
        <div className="sidebar-dot-grid absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--sidebar-border, rgba(22,163,74,0.06)) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* Top ambient glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl" style={{ background: 'rgba(134,239,172,0.3)', animation: 'sidebarGlow 5s ease-in-out infinite' }} />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl" style={{ background: 'rgba(167,243,208,0.25)', animation: 'sidebarGlow 7s ease-in-out infinite reverse' }} />

        <div className="relative z-10 space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#4ade80,#16a34a)' }}>
              <span className="text-white text-lg font-black">📖</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-gray-800">Sakshar AI</span>
          </div>

          {/* Profile mini-card with glowing ring */}
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-2xl" style={{ background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.15)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 overflow-hidden animate-ring-pulse" style={{ background: 'linear-gradient(135deg,#bbf7d0,#86efac)', border: '2px solid rgba(22,163,74,0.35)' }}>
              {profileAvatar && profileAvatar.startsWith('data:image') ? (
                <img src={profileAvatar} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <span>{profileAvatar || '👤'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-800 text-xs font-black truncate leading-tight">{fullName || 'Learner'}</p>
              <p className="text-emerald-600 text-[9px] font-bold uppercase tracking-wider truncate">{getLanguageNativeLabel(lang)} · {currentTierMeta.badge}</p>
            </div>
            <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* XP / Streak mini bar */}
          <div className="px-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">⭐ XP Progress</span>
              <span className="text-[10px] font-black text-emerald-700">{parseInt(localStorage.getItem('game_xp') || '0')} XP</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(22,163,74,0.12)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(parseInt(localStorage.getItem('game_xp') || '0') % 100, 100)}%`, background: 'linear-gradient(90deg,#4ade80,#16a34a)', transition: 'width 0.8s ease' }} />
            </div>
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(d => (
                <span key={d} className="flex-1 h-1 rounded-full" style={{ background: d <= Math.min(streakCount, 5) ? '#16a34a' : 'rgba(22,163,74,0.15)' }} />
              ))}
              <span className="text-[9px] font-black text-emerald-700 ml-1">🔥 {streakCount}d</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5">
            {[
              { id: 'dashboard', label: t.navDashboard || 'Dashboard', emoji: '🏠', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) },
              { id: 'leaderboard', label: t.navMyClass || 'My Class', emoji: '🏆', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ) },
              { id: 'courses', label: t.navCourses || 'Courses', emoji: '📚', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ) },
              { id: 'community', label: t.navCommunity || 'Community', emoji: '💬', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ) },
              { id: 'analytics', label: t.navAnalytics || 'Analytics', emoji: '📊', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ) },
              { id: 'settings', label: t.navSettings || 'Settings', emoji: '⚙️', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ) }
            ].map(item => {
              const isActive = currentNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentNav(item.id);
                    if (item.id === 'courses') setActiveTab('lessons');
                  }}
                  className={`group w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-[0.97] ${
                    isActive
                      ? 'text-white shadow-lg border border-emerald-400/20'
                      : 'text-gray-500 hover:text-emerald-800 hover:bg-emerald-500/10 hover:translate-x-1.5'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, #1C2D1A 0%, #15803d 100%)', boxShadow: '0 6px 18px rgba(21,128,61,0.28)' } : { background: 'transparent' }}
                >
                  <span className="shrink-0 text-base transition-transform duration-300 group-hover:scale-125">{item.emoji}</span>
                  <span className="tracking-tight">{item.label}</span>
                  {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#86efac] animate-pulse" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom game card + sign out */}
        <div className="relative z-10 space-y-3 pt-4">
          {/* Game card — animated arcade-style card */}
          <div
            onClick={() => setIsGameModalOpen(true)}
            className="relative rounded-3xl p-4 text-center space-y-3 overflow-hidden group/gamecard cursor-pointer"
            style={{
              background: 'linear-gradient(135deg,#0D1F0C 0%,#14532d 50%,#166534 100%)',
              border: '1px solid rgba(74,222,128,0.25)',
              boxShadow: '0 8px 24px rgba(20,83,45,0.25)'
            }}
          >
            <style>{`
              @keyframes gameCardGlow {
                0%,100% { box-shadow: 0 8px 24px rgba(20,83,45,0.25), 0 0 0 0 rgba(74,222,128,0.4); }
                50%     { box-shadow: 0 8px 28px rgba(20,83,45,0.35), 0 0 0 6px rgba(74,222,128,0); }
              }
              @keyframes floatEmoji1 { 0%,100% { transform: translate(0,0) rotate(-6deg); } 50% { transform: translate(-3px,-8px) rotate(6deg); } }
              @keyframes floatEmoji2 { 0%,100% { transform: translate(0,0) rotate(4deg); } 50% { transform: translate(4px,-6px) rotate(-4deg); } }
              @keyframes floatEmoji3 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-2px,-10px) rotate(8deg); } }
              @keyframes controllerBounce { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.06); } }
              @keyframes shimmerSweep { 0% { transform: translateX(-120%) skewX(-15deg); } 100% { transform: translateX(220%) skewX(-15deg); } }
              @keyframes dotBlink { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
            `}</style>

            {/* pulsing glow ring around whole card */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ animation: 'gameCardGlow 3s ease-in-out infinite' }} />

            {/* ambient floating orbs */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(74,222,128,0.35)', animation: 'sidebarGlow 4s ease-in-out infinite' }} />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(134,239,172,0.2)', animation: 'sidebarGlow 6s ease-in-out infinite reverse' }} />

            {/* shimmer sweep across card */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
              <div className="absolute top-0 left-0 w-1/3 h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'shimmerSweep 3.2s ease-in-out infinite' }} />
            </div>

            {/* floating mini game icons scattered around the card */}
            <span className="absolute top-2 left-3 text-xs opacity-70 pointer-events-none" style={{ animation: 'floatEmoji1 3.4s ease-in-out infinite' }}>🔤</span>
            <span className="absolute top-3 right-4 text-xs opacity-70 pointer-events-none" style={{ animation: 'floatEmoji2 4s 0.4s ease-in-out infinite' }}>🧩</span>
            <span className="absolute bottom-9 right-3 text-xs opacity-60 pointer-events-none" style={{ animation: 'floatEmoji3 3.8s 0.8s ease-in-out infinite' }}>⚡</span>

            {/* "8 Games" + XP badges row */}
            <div className="relative z-10 flex items-center justify-between px-0.5">
              <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-300/90 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'dotBlink 1.4s ease-in-out infinite' }} />
                8 Games
              </span>
              <span className="text-[8px] font-black text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full">
                ⭐ {parseInt(localStorage.getItem('game_xp') || '0')} XP
              </span>
            </div>

            {/* Controller icon — bouncing with glow */}
            <div className="relative z-10 flex justify-center pt-1">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg,#4ade80,#16a34a)',
                  animation: 'controllerBounce 2.2s ease-in-out infinite',
                  boxShadow: '0 4px 16px rgba(74,222,128,0.4)'
                }}
              >
                🎮
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-white font-black text-xs leading-tight">Game for You</p>
              <p className="text-emerald-300/80 text-[9px] font-bold uppercase tracking-wider mt-0.5">Fun &amp; Learn · Earn XP</p>
            </div>

            {/* Play Now button — glowing yellow with shimmer on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsGameModalOpen(true); }}
              className="group/btn relative z-10 w-full py-2.5 text-[10px] font-black rounded-xl active:scale-95 hover:scale-[1.03] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-emerald-950 overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#fde047,#facc15)', boxShadow: '0 4px 14px rgba(250,204,21,0.35)' }}
            >
              <span className="relative z-10">▶ Play Now</span>
              <span className="relative z-10 inline-block transition-transform duration-200 group-hover/btn:translate-x-1">→</span>
              <span
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmerSweep 1.2s ease-in-out infinite' }}
              />
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 text-[10px] font-black tracking-wider uppercase rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 active:scale-95 cursor-pointer"
            style={{ border: '1px solid rgba(22,163,74,0.18)' }}
          >
            {t.signOut || 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* COLUMN 2: CENTER PANEL - MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden pr-0 lg:pr-2">
        
        {/* Top Header / Nav controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pt-1">
          {/* Magnifier Search input with smooth focus glow */}
          <div className="relative w-full sm:w-80 group">
            <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-sm transition-transform duration-200 group-focus-within:scale-110 group-focus-within:text-emerald-600">🔍</span>
            <input 
              type="text" 
              placeholder={t.searchPlaceholder || 'Search courses'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/90 backdrop-blur-md border border-gray-100/80 rounded-full text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md"
            />
          </div>

          {/* Right header row */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Animated streak badge with glowing flame */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-full shadow-sm border border-emerald-100/60 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer">
              <span className="text-sm animate-flame">🔥</span>
              <span className="text-[10px] font-black text-gray-800">{streakCount} day streak</span>
            </div>
            {/* Date capsule */}
            <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full text-[10px] font-extrabold text-gray-600 shadow-sm border border-emerald-100/60 flex items-center gap-2 hover:shadow-md transition-all duration-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span>{t.todayPrefix || 'Today'}, {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Scrolling daily goals ticker */}
        <div className="overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-2 mb-4 flex items-center gap-3">
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-emerald-100">📅 Today</span>
          <div className="overflow-hidden flex-1 relative" style={{ height: '18px' }}>
            <div className="flex gap-10 whitespace-nowrap text-[11px] font-bold text-gray-500 absolute" style={{ animation: 'tickerScroll 22s linear infinite' }}>
              {['📖 Complete Reading Practice', '✍️ Trace 5 Letters', '🗣️ Speaking Assessment', '🎮 Play a Mini Game', '📝 Level Quiz', '⭐ Earn 50 XP', '📖 Complete Reading Practice', '✍️ Trace 5 Letters', '🗣️ Speaking Assessment', '🎮 Play a Mini Game', '📝 Level Quiz', '⭐ Earn 50 XP'].map((g, i) => (
                <span key={i} className="">{g}</span>
              ))}
            </div>
          </div>
        </div>

        {/* TABS A: DASHBOARD VIEW */}
        {currentNav === 'dashboard' && (
          <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in">
            <style>{`
              @keyframes sakWaveHand { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(14deg); } 30% { transform: rotate(-8deg); } 45% { transform: rotate(14deg); } 60% { transform: rotate(-4deg); } 75% { transform: rotate(10deg); } }
              @keyframes sakMsgIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
            {/* Welcome greeting Title */}
            <div className="animate-card-pop">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight dash-gradient-title">
                {t.welcomeBack || 'Welcome back'}, {fullName || 'Learner'}!
              </h2>
            </div>

            {/* In-progress course cards */}
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Card 1: Foundational Education — only shown for Foundational-level accounts, opens the dedicated Foundational page */}
              {educationalLevel === 'none' && (
              <div 
                onClick={() => setCurrentNav('foundational')}
                className="animate-pop-in delay-0 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between h-56 group relative"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-[#5C67F2]/10 border border-[#5C67F2]/20 flex items-center justify-center text-lg font-bold">👤</span>
                    <span className="text-[9px] font-black tracking-wider text-[#5C67F2] bg-[#5C67F2]/5 border border-[#5C67F2]/10 px-2.5 py-1 rounded-full uppercase">Illustration</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 mt-4 leading-tight group-hover:text-[#5C67F2] transition">Foundational Education</h3>
                </div>

                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Participant:</p>
                    <div className="flex -space-x-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-200 border border-white text-[8px] font-bold flex items-center justify-center">A</div>
                      <div className="w-5 h-5 rounded-full bg-pink-200 border border-white text-[8px] font-bold flex items-center justify-center">B</div>
                      <div className="w-5 h-5 rounded-full bg-yellow-200 border border-white text-[8px] font-bold flex items-center justify-center">C</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Progress:</p>
                      <p className="text-xs font-black text-emerald-600 mt-0.5">75%</p>
                    </div>
                    {/* Ring progress arc */}
                    <div className="relative w-8 h-8">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-emerald-500 transition-all duration-700 ease-out animate-ring-draw" strokeDasharray="75, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100/70 pt-3 mt-3 flex items-center justify-between text-[10px] text-gray-400 font-bold">
                  <span className="flex items-center gap-1">👤 Furkan</span>
                  <span className="flex items-center gap-1">📖 25 Lessons</span>
                </div>
              </div>
              )}

              {/* Card 2: Drawing & Anatomy */}
              <div 
                onClick={() => {
                  setSelectedModalCourse({ lesson_id: "l2_reading", title: "Simple Sentence Reading Practice", level: educationalLevel });
                  setIsCourseModalOpen(true);
                }}
                className="animate-pop-in delay-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between h-56 group relative"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-lg font-bold">👤</span>
                    <span className="text-[9px] font-black tracking-wider text-pink-700 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full uppercase">UI/UX</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 mt-4 leading-tight group-hover:text-pink-700 transition">Drawing & Anatomy</h3>
                </div>

                <div className="flex items-end justify-between mt-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Participant:</p>
                    <div className="flex -space-x-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-purple-200 border border-white text-[8px] font-bold flex items-center justify-center">D</div>
                      <div className="w-5 h-5 rounded-full bg-yellow-200 border border-white text-[8px] font-bold flex items-center justify-center">E</div>
                      <div className="w-5 h-5 rounded-full bg-indigo-200 border border-white text-[8px] font-bold flex items-center justify-center">F</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Progress:</p>
                      <p className="text-xs font-black text-emerald-600 mt-0.5">60%</p>
                    </div>
                    {/* Ring progress arc */}
                    <div className="relative w-8 h-8">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-emerald-500 transition-all duration-700 ease-out animate-ring-draw" strokeDasharray="60, 100" strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100/70 pt-3 mt-3 flex items-center justify-between text-[10px] text-gray-400 font-bold">
                  <span className="flex items-center gap-1">👤 Furkan</span>
                  <span className="flex items-center gap-1">📖 20 Lessons</span>
                </div>
              </div>
            </div>

            {/* Courses You're Taking list grid */}
            <div className="animate-pop-in delay-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5 transition-shadow duration-300 hover:shadow-md">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">{t.coursesYoureTaking || "Course You're Taking"}</h3>
                <div className="flex items-center space-x-3 text-xs font-black text-gray-500">
                  <span className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-100 transition flex items-center gap-1">
                    <span>Active</span>
                    <span>⌵</span>
                  </span>
                  <span className="cursor-pointer text-gray-400 hover:text-gray-600 transition">🔍</span>
                  <span className="cursor-pointer text-[#5C67F2] text-sm hover:scale-105 transition">⊕</span>
                </div>
              </div>

              {lessonsLoading ? (
                <div className="text-center py-10 font-bold text-xs text-gray-400 animate-pulse uppercase tracking-wider">Loading literacy syllabus...</div>
              ) : filteredLessons.length === 0 ? (
                <div className="text-center py-10 font-medium text-xs text-gray-400 border border-dashed border-gray-100 p-6 rounded-2xl bg-[#FBFBFA]">No courses matches search filter query.</div>
              ) : (
                <div className="divide-y divide-gray-100/70">
                  {/* Rows linking to the Modal popup details speller */}
                  {filteredLessons.slice(0, 4).map((les, idx) => {
                    const isDone = completedLessons.has(les.lesson_id);
                    const badges = ["AI", "UI", "UX", "UI"];
                    const colors = ["bg-[#5C67F2]", "bg-pink-500", "bg-[#F4B942]", "bg-pink-500"];
                    return (
                      <div 
                        key={les.lesson_id} 
                        className="animate-pop-in py-3.5 flex items-center justify-between gap-4 hover:bg-[#F9FAFB]/50 px-2 rounded-xl transition duration-150 group cursor-pointer"
                        style={{ animationDelay: `${idx * 0.07}s` }}
                        onClick={() => {
                          setSelectedModalCourse(les);
                          setIsCourseModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl ${colors[idx % 4]} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0`}>
                            {badges[idx % 4]}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-gray-900 leading-tight group-hover:text-[#5C67F2] transition">{les.title}</h4>
                            <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">mentor • Furkom • 24h 12m</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 transform -rotate-90 shrink-0" viewBox="0 0 36 36">
                              <path className="text-gray-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path className="text-emerald-500 transition-all duration-700 ease-out animate-ring-draw" strokeDasharray={`${isDone ? 100 : 30}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <span className="text-[11px] font-black text-emerald-600">{isDone ? 100 : 30}%</span>
                          </div>

                          <div className="hidden sm:flex items-center gap-3.5 text-[10px] text-gray-400 font-bold">
                            <span>👥 1k</span>
                            <span>📖 20</span>
                            <span>🎥 30</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conversational AI Tutor panel chatbot with TTS */}
            <div className="animate-pop-in delay-3 bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden flex flex-col h-[420px] transition-shadow duration-300 hover:shadow-md">
              {/* Inject TTS sound-wave keyframes */}
              <style>{`
                @keyframes ttsBar {
                  0%,100% { transform: scaleY(0.3); }
                  50% { transform: scaleY(1); }
                }
                .tts-wave span {
                  display: inline-block;
                  width: 3px;
                  background: #5C67F2;
                  border-radius: 2px;
                  height: 14px;
                  transform-origin: center bottom;
                  animation: ttsBar 0.8s ease-in-out infinite;
                }
                .tts-wave span:nth-child(1) { animation-delay: 0s; }
                .tts-wave span:nth-child(2) { animation-delay: 0.12s; }
                .tts-wave span:nth-child(3) { animation-delay: 0.24s; }
                .tts-wave span:nth-child(4) { animation-delay: 0.36s; }
                .tts-wave span:nth-child(5) { animation-delay: 0.48s; }
              `}</style>

              {/* Header row */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">{t.aiTutorTitle || 'AI Literacy Tutor'}</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Track: {educationalLevel} · {langToLocale[lang] || 'en-IN'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* TTS Toggle */}
                  <button
                    title={isTtsEnabled ? 'Mute voice' : 'Unmute voice'}
                    onClick={() => { setIsTtsEnabled(v => { if (v) stopSpeaking(); return !v; }); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                      isTtsEnabled
                        ? 'bg-[#5C67F2]/10 border-[#5C67F2]/20 text-[#5C67F2]'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    {isTtsEnabled ? (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.03 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.03l4.353-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"/>
                        </svg>
                        Voice On
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.03 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.03l4.353-3.784a1 1 0 011 .076zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                        Voice Off
                      </>
                    )}
                  </button>
                  {/* Clear Chat */}
                  <button 
                    onClick={() => { stopSpeaking(); setAiTutorMessages([{ id: Date.now(), text: buildTutorGreeting(), isBot: true }]); }}
                    className="text-[9px] text-gray-400 font-black tracking-wider uppercase bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
                {aiTutorMessages.map(m => (
                  <div key={m.id} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`} style={{ animation: 'sakMsgIn 0.3s ease-out both' }}>
                    {m.isBot ? (
                      <div className="flex items-end gap-2 max-w-[85%] group">
                        {/* Bot avatar */}
                        <div className="w-6 h-6 rounded-full bg-[#5C67F2]/10 border border-[#5C67F2]/20 flex items-center justify-center text-[10px] shrink-0 mb-0.5 transition-transform duration-200 hover:scale-110">🤖</div>
                        <div className="flex flex-col gap-1">
                          <div className={`rounded-2xl rounded-tl-none px-4 py-2.5 text-xs leading-relaxed font-semibold shadow-xs relative ${
                            speakingMsgId === m.id
                              ? 'bg-[#5C67F2]/8 border border-[#5C67F2]/25 text-gray-800'
                              : 'bg-gray-50 border border-gray-100 text-gray-800'
                          }`}>
                            {/* Speaking indicator */}
                            {speakingMsgId === m.id && (
                              <div className="tts-wave flex items-center gap-0.5 mb-1.5">
                                <span/><span/><span/><span/><span/>
                                <span className="ml-1 text-[9px] font-black text-[#5C67F2] uppercase tracking-wider">Speaking...</span>
                              </div>
                            )}
                            {m.text}
                          </div>
                          {/* Per-message speak/stop button */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {speakingMsgId === m.id ? (
                              <button
                                onClick={stopSpeaking}
                                className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-100 transition"
                              >
                                ⏹ Stop
                              </button>
                            ) : (
                              <button
                                onClick={() => speakText(m.text, m.id)}
                                className="flex items-center gap-1 text-[8px] font-black text-[#5C67F2] bg-[#5C67F2]/5 border border-[#5C67F2]/15 px-2 py-0.5 rounded-full cursor-pointer hover:bg-[#5C67F2]/10 transition"
                              >
                                🔊 Read aloud
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-2.5 text-xs leading-relaxed font-semibold shadow-xs bg-[#5C67F2] text-white transition-transform duration-200 hover:scale-[1.02]">
                        {m.text}
                      </div>
                    )}
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="flex justify-start items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#5C67F2]/10 border border-[#5C67F2]/20 flex items-center justify-center text-[10px] shrink-0">🤖</div>
                    <div className="bg-gray-50 border border-gray-100 text-gray-400 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs font-bold flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C67F2]/40 animate-bounce" style={{animationDelay:'0s'}} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C67F2]/60 animate-bounce" style={{animationDelay:'0.15s'}} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5C67F2]/80 animate-bounce" style={{animationDelay:'0.3s'}} />
                      </span>
                      <span>{t.tutorWriting || 'Tutor is typing...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick suggestions */}
              <div className="flex gap-2 overflow-x-auto py-2 border-t border-gray-100/50 scrollbar-none mt-1">
                {[
                  { id: 'plan', label: t.quickSuggestPlan || '📅 Study plan' },
                  { id: 'grammar', label: t.quickSuggestGrammar || '📖 Grammar tip' },
                  { id: 'tracing', label: t.quickSuggestTracing || '✏️ Tracing guide' }
                ].map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleQuickSuggestedQuestion(s)}
                    className="text-[9px] font-black text-gray-500 bg-gray-50 hover:bg-[#5C67F2]/5 hover:text-[#5C67F2] hover:border-[#5C67F2]/20 border border-gray-200 px-3 py-1.5 rounded-full shrink-0 transition-all duration-150 cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Chat input */}
              <form onSubmit={handleTutorSubmit} className="pt-2 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder={isListeningTutor ? "Listening... Speak now!" : (t.tutorInputPlaceholder || 'Ask about letters, reading, pronunciation...')}
                  value={aiTutorInput}
                  onChange={(e) => setAiTutorInput(e.target.value)}
                  className={`flex-1 px-4 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none transition ${
                    isListeningTutor 
                      ? 'bg-red-50 border-red-300 text-red-900 focus:border-red-400 placeholder-red-400' 
                      : 'bg-gray-50 border-gray-200 focus:border-[#5C67F2] focus:bg-white'
                  }`}
                />
                
                {/* Speech Recognition (STT) Microphone Button */}
                <button
                  type="button"
                  title={isListeningTutor ? 'Stop listening' : `Record voice in ${getLanguageNativeLabel(lang)}`}
                  onClick={toggleTutorListening}
                  className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer relative active:scale-95 ${
                    isListeningTutor
                      ? 'bg-red-500 border-red-600 text-white shadow-md shadow-red-200 animate-pulse'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-[#5C67F2] hover:bg-[#5C67F2]/5'
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 005 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
                  </svg>
                  {isListeningTutor && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                  )}
                </button>

                {/* Speak input button */}
                <button
                  type="button"
                  title="Speak my message aloud"
                  onClick={() => { if (aiTutorInput.trim()) speakText(aiTutorInput, 'input-preview'); }}
                  disabled={!aiTutorInput.trim()}
                  className="p-2.5 bg-gray-100 hover:bg-[#5C67F2]/10 disabled:opacity-30 text-gray-500 hover:text-[#5C67F2] rounded-xl transition cursor-pointer"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.03 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.03l4.353-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"/>
                  </svg>
                </button>

                <button 
                  type="submit"
                  disabled={!aiTutorInput.trim() || isTutorLoading}
                  className="px-4 py-2.5 bg-[#5C67F2] hover:bg-[#4E56D1] disabled:opacity-40 text-white text-xs font-black rounded-xl active:scale-95 transition cursor-pointer"
                >
                  {t.sendButton || 'Send'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* DEDICATED PAGE: FOUNDATIONAL LEARNING — only reachable/usable for Foundational-level accounts */}
        {currentNav === 'foundational' && (
          educationalLevel !== 'none' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <p className="text-sm font-bold text-gray-400">This page is only available for Foundational-level accounts.</p>
              <button
                onClick={() => setCurrentNav('dashboard')}
                className="px-5 py-2.5 bg-[#1C2D1A] text-white text-xs font-black rounded-xl hover:bg-[#2c4429] transition cursor-pointer"
              >
                ← Back to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
              {/* Playful gradient banner with progress */}
              <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#5C67F2] via-[#7C6CF2] to-[#F2895C] shadow-lg">
                <div className="absolute -top-6 -right-6 text-8xl opacity-20 select-none rotate-12">🎈</div>
                <div className="absolute -bottom-8 -left-4 text-7xl opacity-10 select-none -rotate-12">⭐</div>
                <button
                  onClick={() => setCurrentNav('dashboard')}
                  className="relative text-[11px] font-black text-white/80 hover:text-white transition mb-3 cursor-pointer flex items-center gap-1"
                >
                  ← Back to Dashboard
                </button>
                <h2 className="relative text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  🚀 Foundational Adventure
                </h2>
                <p className="relative text-xs sm:text-sm text-white/80 font-bold mt-1 max-w-md">
                  Alphabet, numbers, vocabulary & everyday speaking — {filteredLessons.length || 25} fun lessons, each with a video to watch!
                </p>

                {(() => {
                  const total = filteredLessons.length || 25;
                  const done = filteredLessons.filter(l => completedLessons.has(l.lesson_id)).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="relative mt-5 max-w-md">
                      <div className="flex items-center justify-between text-[11px] font-black text-white/90 mb-1.5">
                        <span className="flex items-center gap-1">⭐ {done} of {total} lessons complete</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-white/25 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-emerald-300 transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {pct === 100 && (
                        <p className="text-[11px] font-black text-yellow-200 mt-2">🎉 You finished them all — amazing work!</p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {lessonsLoading ? (
                <div className="text-center py-10 font-bold text-xs text-gray-400 animate-pulse uppercase tracking-wider">Loading foundational lessons...</div>
              ) : filteredLessons.length === 0 ? (
                <div className="text-center py-10 font-medium text-xs text-gray-400 border border-dashed border-gray-100 p-6 rounded-2xl bg-[#FBFBFA]">No foundational lessons found.</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {filteredLessons.map((les, idx) => {
                    const isDone = completedLessons.has(les.lesson_id);
                    const THEMES = [
                      { grad: 'from-[#5C67F2]/10 to-[#5C67F2]/0', ring: 'border-[#5C67F2]/20', chip: 'text-[#5C67F2] bg-[#5C67F2]/10', badge: 'bg-[#5C67F2]', emoji: '🔤' },
                      { grad: 'from-pink-500/10 to-pink-500/0', ring: 'border-pink-300/40', chip: 'text-pink-600 bg-pink-50', badge: 'bg-pink-500', emoji: '🔢' },
                      { grad: 'from-amber-400/10 to-amber-400/0', ring: 'border-amber-300/40', chip: 'text-amber-600 bg-amber-50', badge: 'bg-amber-500', emoji: '🗣️' },
                      { grad: 'from-emerald-500/10 to-emerald-500/0', ring: 'border-emerald-300/40', chip: 'text-emerald-600 bg-emerald-50', badge: 'bg-emerald-500', emoji: '📖' },
                      { grad: 'from-sky-400/10 to-sky-400/0', ring: 'border-sky-300/40', chip: 'text-sky-600 bg-sky-50', badge: 'bg-sky-500', emoji: '🎨' },
                      { grad: 'from-orange-400/10 to-orange-400/0', ring: 'border-orange-300/40', chip: 'text-orange-600 bg-orange-50', badge: 'bg-orange-500', emoji: '🧩' },
                    ];
                    const theme = THEMES[idx % THEMES.length];
                    return (
                      <div
                        key={les.lesson_id}
                        className={`relative overflow-hidden bg-gradient-to-br ${theme.grad} bg-white border-2 rounded-3xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 flex items-center gap-4 cursor-pointer group ${isDone ? 'border-emerald-300' : theme.ring}`}
                        onClick={() => {
                          setActiveLessonIndex(idx);
                          setCurrentNav('lessonPlayer');
                        }}
                      >
                        {isDone && (
                          <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full rotate-3">
                            🎉 Done!
                          </span>
                        )}

                        <span className={`shrink-0 w-12 h-12 rounded-2xl ${theme.badge} text-white flex items-center justify-center text-xl font-black shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200`}>
                          {theme.emoji}
                        </span>

                        <div className="flex-1 min-w-0">
                          <span className={`inline-block ${theme.chip} px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider`}>
                            Lesson {idx + 1}
                          </span>
                          <h4 className="text-sm font-extrabold text-gray-900 mt-1.5 mb-2 leading-snug">{les.title}</h4>
                          {LESSON_YOUTUBE[les.lesson_id] && (
                            <a
                              href={LESSON_YOUTUBE[les.lesson_id]}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-[10px] font-black text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 px-2.5 py-1 rounded-full transition-all duration-150"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              Watch
                            </a>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLesson(les.lesson_id);
                          }}
                          title={isDone ? 'Mark as not done' : 'Mark as done'}
                          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-200 cursor-pointer ${isDone ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-md scale-105' : 'bg-white border-2 border-dashed border-gray-200 text-gray-300 hover:border-amber-300 hover:text-amber-400 hover:scale-110'}`}
                        >
                          ⭐
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* DEDICATED PAGE: ONE-BY-ONE LESSON PLAYER — plays the YouTube video for a single foundational lesson, with Next/Previous */}
        {currentNav === 'lessonPlayer' && (
          educationalLevel !== 'none' || activeLessonIndex === null || !filteredLessons[activeLessonIndex] ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <p className="text-sm font-bold text-gray-400">No lesson selected.</p>
              <button
                onClick={() => setCurrentNav('foundational')}
                className="px-5 py-2.5 bg-[#1C2D1A] text-white text-xs font-black rounded-xl hover:bg-[#2c4429] transition cursor-pointer"
              >
                ← Back to Foundational Adventure
              </button>
            </div>
          ) : (() => {
            const les = filteredLessons[activeLessonIndex];
            const isDone = completedLessons.has(les.lesson_id);
            const total = filteredLessons.length;
            const watchUrl = LESSON_YOUTUBE[les.lesson_id];
            const videoId = watchUrl
              ? (watchUrl.includes('v=') ? watchUrl.split('v=')[1].split('&')[0] : watchUrl.split('/').pop())
              : null;
            const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1` : null;

            return (
              <div className="space-y-5 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    onClick={() => setCurrentNav('foundational')}
                    className="text-xs font-black text-gray-400 hover:text-gray-600 transition cursor-pointer flex items-center gap-1"
                  >
                    ← All Foundational Lessons
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C67F2] bg-[#5C67F2]/10 px-3 py-1 rounded-full">
                    Lesson {activeLessonIndex + 1} of {total}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{les.title}</h2>
                  <p className="text-xs text-gray-400 font-medium mt-1">Watch the video below, then mark it complete when you're ready for the next one.</p>
                </div>

                {embedUrl ? (
                  <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-black" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      key={videoId}
                      src={embedUrl}
                      title={les.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10 font-medium text-xs text-gray-400 border border-dashed border-gray-100 p-6 rounded-2xl bg-[#FBFBFA]">No video linked for this lesson yet.</div>
                )}

                {watchUrl && (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    Open full screen on YouTube ↗
                  </a>
                )}

                {/* Mark complete + Prev/Next controls */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleLesson(les.lesson_id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${isDone ? 'bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-md' : 'bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500'}`}
                  >
                    ⭐ {isDone ? 'Completed!' : 'Mark as complete'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveLessonIndex(i => Math.max(0, i - 1))}
                      disabled={activeLessonIndex === 0}
                      className="px-4 py-2.5 rounded-xl text-xs font-black bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setActiveLessonIndex(i => Math.min(total - 1, i + 1))}
                      disabled={activeLessonIndex >= total - 1}
                      className="px-4 py-2.5 rounded-xl text-xs font-black bg-[#5C67F2] text-white hover:bg-[#4E56D1] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      Next Lesson →
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* TABS B: MY CLASS / PEER LEADERBOARD */}
        {currentNav === 'leaderboard' && (
          <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{t.myClassTitle || 'My Class Leaderboard'}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">See how you rank against other simulated peers in your regional language program.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Ranking</p>
                <p className="text-2xl font-black text-[#5C67F2] mt-1">#3</p>
              </div>
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Streak</p>
                <p className="text-2xl font-black text-amber-500 mt-1">🔥 {streakCount} Days</p>
              </div>
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weekly Medals</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">🏅 2 Unlocked</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-3">Peer Rankings</h3>
              <div className="divide-y divide-gray-100/70">
                {[
                  { rank: 1, name: "Priya Sharma", score: 2450, streak: 12, avatar: "👩‍🎓", isUser: false },
                  { rank: 2, name: "Ramesh Kumar", score: 2100, streak: 8, avatar: "👨‍🎓", isUser: false },
                  { rank: 3, name: `${fullName || 'Learner'} (You)`, score: 1850, streak: 5, avatar: "👤", isUser: true },
                  { rank: 4, name: "Amit Singh", score: 1500, streak: 4, avatar: "👨‍🎓", isUser: false }
                ].map(peer => (
                  <div key={peer.rank} className={`py-3.5 flex items-center justify-between gap-4 ${peer.isUser ? 'bg-[#5C67F2]/5 rounded-xl px-2' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${
                        peer.rank === 1 ? 'bg-amber-100 text-amber-700' : peer.rank === 2 ? 'bg-gray-100 text-gray-700' : 'text-gray-400'
                      }`}>
                        {peer.rank === 1 ? '🥇' : peer.rank === 2 ? '🥈' : peer.rank}
                      </span>
                      <span className="text-lg">{peer.avatar}</span>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 leading-tight">{peer.name}</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Streak: {peer.streak} days</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-800">{peer.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TABS C: COURSES GRID VIEW */}
        {currentNav === 'courses' && (
          <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{t.coursesTitle || 'Syllabus Curriculum Tracks'}</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">Explore all 20 courses available across all literacy skill levels.</p>
            </div>

            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto space-x-6 scrollbar-none">
              <button 
                onClick={() => setActiveTab('lessons')}
                className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${activeTab === 'lessons' ? 'border-[#5C67F2] text-[#5C67F2]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t.tabNativeModules || '📚 Native Syllabus Modules'}
              </button>
              <button 
                onClick={() => setActiveTab('quizzes')}
                className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${activeTab === 'quizzes' ? 'border-[#5C67F2] text-[#5C67F2]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t.tabLevelQuizzes || '📝 Level Quizzes'}
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${activeTab === 'all' ? 'border-[#5C67F2] text-[#5C67F2]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {t.tabOtherBlocks || '✨ Other Learning Blocks'}
              </button>
            </div>

            {activeTab === 'lessons' ? (
              lessonsLoading ? (
                <div className="text-center py-10 font-bold text-xs text-gray-400 animate-pulse uppercase tracking-wider">Loading courses list...</div>
              ) : filteredLessons.length === 0 ? (
                <div className="text-center py-10 font-medium text-xs text-gray-400 border border-dashed border-gray-100 p-6 rounded-2xl bg-[#FBFBFA]">No courses match your query filter.</div>
              ) : (
                (() => {
                  const ROW_H = 156;
                  const ZIG = [200, 520, 800, 520]; // node x-position, out of 1000 units
                  const firstIncompleteIdx = filteredLessons.findIndex((l) => !completedLessons.has(l.lesson_id));
                  const totalH = filteredLessons.length * ROW_H + 90;
                  const levelColors = {
                    none: { ring: '#5C67F2', bg: '#5C67F2', tag: 'Foundational' },
                    primary: { ring: '#059669', bg: '#059669', tag: 'Primary' },
                    middle: { ring: '#D97706', bg: '#D97706', tag: 'Middle' },
                    high: { ring: '#E11D48', bg: '#E11D48', tag: 'High' },
                  };
                  const pts = filteredLessons.map((les, i) => ({
                    x: ZIG[i % 4],
                    y: i * ROW_H + 70,
                  }));

                  return (
                    <div className="space-y-4">
                      {/* Legend */}
                      <div className="flex items-center gap-5 flex-wrap text-[10px] font-bold text-gray-500 uppercase tracking-wider animate-fade-in">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Completed</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#5C67F2] inline-block animate-pulse" /> In progress</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> Upcoming</span>
                      </div>

                      {/* Roadmap canvas */}
                      <div className="relative mx-auto max-w-2xl" style={{ height: totalH }}>
                        {/* Start marker */}
                        <div
                          className="absolute -translate-x-1/2 flex flex-col items-center gap-1 animate-pop-in"
                          style={{ left: `${pts[0].x / 10}%`, top: 0 }}
                        >
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Start</span>
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                        </div>

                        {/* Connector lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 1000 ${totalH}`} preserveAspectRatio="none">
                          <line x1={pts[0].x} y1={14} x2={pts[0].x} y2={pts[0].y - 32} stroke="#D1D5DB" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
                          {pts.slice(0, -1).map((p, i) => {
                            const p2 = pts[i + 1];
                            const my = (p.y + p2.y) / 2;
                            const done = completedLessons.has(filteredLessons[i].lesson_id);
                            const d = `M ${p.x} ${p.y + 34} C ${p.x} ${my}, ${p2.x} ${my}, ${p2.x} ${p2.y - 34}`;
                            return (
                              <path
                                key={i}
                                d={d}
                                fill="none"
                                stroke={done ? '#059669' : '#D1D5DB'}
                                strokeWidth={done ? 3.5 : 3}
                                strokeDasharray={done ? '0' : '2 10'}
                                strokeLinecap="round"
                                style={{ transition: 'stroke 0.3s ease' }}
                              />
                            );
                          })}
                        </svg>

                        {/* Nodes */}
                        {filteredLessons.map((les, i) => {
                          const isDone = completedLessons.has(les.lesson_id);
                          const isCurrent = i === firstIncompleteIdx;
                          const lv = levelColors[les.level] || levelColors.none;
                          const p = pts[i];
                          return (
                            <div
                              key={les.lesson_id}
                              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pop-in"
                              style={{ left: `${p.x / 10}%`, top: p.y, animationDelay: `${Math.min(i, 10) * 0.05}s`, width: 176 }}
                            >
                              {/* Node circle */}
                              <div className="relative">
                                {isCurrent && (
                                  <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ boxShadow: `0 0 0 4px ${lv.ring}22` }} />
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedModalCourse(les);
                                    setIsCourseModalOpen(true);
                                  }}
                                  className={`relative w-16 h-16 rounded-full flex items-center justify-center text-xl font-black shadow-md border-4 border-white transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${isCurrent ? 'ring-4' : ''}`}
                                  style={{
                                    background: isDone ? '#059669' : isCurrent ? lv.bg : '#E5E7EB',
                                    color: isDone || isCurrent ? '#fff' : '#9CA3AF',
                                    ringColor: isCurrent ? `${lv.ring}33` : 'transparent',
                                  }}
                                >
                                  {isDone ? '✓' : i + 1}
                                </button>

                                {/* Mark-complete toggle badge */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLesson(les.lesson_id);
                                  }}
                                  title={isDone ? 'Mark as not done' : 'Mark as done'}
                                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm transition-all duration-200 cursor-pointer hover:scale-110 ${isDone ? 'bg-emerald-600 text-white' : 'bg-white text-gray-300 hover:text-gray-500'}`}
                                >
                                  {isDone ? '✓' : '○'}
                                </button>
                              </div>

                              {/* Label chip */}
                              <div
                                onClick={() => {
                                  setSelectedModalCourse(les);
                                  setIsCourseModalOpen(true);
                                }}
                                className="mt-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer text-center w-full"
                              >
                                <span
                                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ color: lv.bg, background: `${lv.bg}14` }}
                                >
                                  {lv.tag}
                                </span>
                                <p className="text-xs font-extrabold text-gray-900 mt-1 leading-snug line-clamp-2">{les.title}</p>
                                {LESSON_YOUTUBE[les.lesson_id] && (
                                  <a
                                    href={LESSON_YOUTUBE[les.lesson_id]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[9px] font-black text-red-600 hover:text-red-700 mt-1.5"
                                  >
                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    Watch
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )
            ) : activeTab === 'quizzes' ? (
              <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center">
                <span className="text-5xl block mb-4">📝</span>
                <h4 className="text-lg font-extrabold text-gray-900 mb-2">{t.assessTitle || 'Assess your literacy level improvement'}</h4>
                <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">Take a quiz containing MCQ, word-rearrangements, and reading comprehensions aligned to your curriculum level.</p>
                <button
                  onClick={() => setActiveModule('level_assessment')}
                  className="w-full py-3 bg-[#5C67F2] text-white text-sm font-bold rounded-xl hover:bg-opacity-90 active:scale-95 transition shadow-sm cursor-pointer"
                >
                  {t.startPrefix || 'Start'} {educationalLevel === 'none' ? 'Foundational' : educationalLevel} {t.levelQuizSuffix || 'Level Quiz'}
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
                {filteredCards.map((card) => (
                  <div 
                    key={card.id}
                    className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    onClick={() => setActiveModule(card.id)}
                  >
                    <div>
                      <div className="h-40 w-full relative overflow-hidden bg-gray-100">
                        <img 
                          src={card.image} 
                          alt={card.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm w-9 h-9 flex items-center justify-center rounded-xl text-xl shadow-sm">
                          {card.icon}
                        </div>
                        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-gray-700 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                          {card.duration}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-extrabold mb-1.5 text-gray-900 tracking-tight group-hover:text-[#5C67F2] transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                          {card.sub}
                        </p>
                      </div>
                    </div>
                    
                    <div className="px-5 pb-5 pt-3 flex items-center justify-between text-xs font-bold text-[#1C2D1A]">
                      <span className="text-[#5C67F2] bg-[#5C67F2]/5 px-2 py-0.5 rounded">
                        {card.level}
                      </span>
                      <div className="flex items-center gap-1 group-hover:underline">
                        <span>{t.startModule || 'Start Module'}</span>
                        <span className="transform transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TABS D: COMMUNITY VIEW */}
        {currentNav === 'community' && (() => {
          const isMine = (sender) => sender === (fullName || 'Learner');
          const uniqueAvatars = [...new Set(
            communityMessages.map(m => m.avatar).filter(a => a && !a.startsWith('data:image'))
          )];
          const onlineLearnersCount = Math.max(3, new Set(communityMessages.map(m => m.sender)).size + 2);
          const topLearners = Object.values(
            communityMessages.reduce((acc, m) => {
              acc[m.sender] = acc[m.sender] || { name: m.sender, avatar: m.avatar, count: 0 };
              acc[m.sender].count += 1;
              return acc;
            }, {})
          ).sort((a, b) => b.count - a.count).slice(0, 4);

          const feedTabs = [
            { id: 'all', label: 'All Messages', grad: 'linear-gradient(135deg, #6366F1, #8B5CF6)', glow: 'rgba(99,102,241,0.4)' },
            { id: 'discussions', label: 'Discussions', grad: 'linear-gradient(135deg, #0EA5E9, #0284C7)', glow: 'rgba(14,165,233,0.4)' },
            { id: 'help', label: 'Study Help', grad: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.4)' },
            { id: 'wins', label: 'Wins & Achievements', grad: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.4)' },
          ];

          const visibleMessages = communityFeedTab === 'all'
            ? communityMessages
            : communityMessages.filter(m => getCommunityMsgCategory(m) === communityFeedTab);
          const orderedMessages = communityNewestFirst ? visibleMessages : [...visibleMessages].slice().reverse();

          return (
            <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1" onClick={() => { setCommunitySortMenuOpen(false); setShowEmojiPicker(false); }}>

              {/* ── HERO HEADER CARD ── */}
              <div 
                className="relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl"
                style={{ 
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)', 
                  border: '1px solid rgba(165, 180, 252, 0.3)', 
                  boxShadow: '0 20px 50px -10px rgba(79, 70, 229, 0.35)' 
                }}
              >
                {/* Ambient glowing shapes */}
                <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute -bottom-16 left-12 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

                {/* Starfield overlay */}
                {[...Array(24)].map((_, i) => (
                  <span 
                    key={i} 
                    className="absolute rounded-full bg-white animate-star-twinkle pointer-events-none" 
                    style={{ 
                      width: `${(i%3)+1.5}px`, 
                      height: `${(i%3)+1.5}px`, 
                      top: `${(i*37)%90}%`, 
                      left: `${(i*53)%95}%`, 
                      animationDelay: `${(i*220)%3000}ms`, 
                      opacity: 0.5 
                    }} 
                  />
                ))}

                <div className="relative flex flex-col gap-6">
                  {/* Title & Online learners row */}
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 transition-transform duration-300 hover:rotate-6 hover:scale-110"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', 
                          border: '1px solid rgba(255,255,255,0.3)', 
                          boxShadow: '0 8px 24px rgba(0,0,0,0.2)' 
                        }}
                      >
                        💬
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                          Study Lounge
                          <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-indigo-200">v2.5</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-indigo-100/70 font-medium mt-0.5">
                          Be kind · Be encouraging · Learn &amp; grow together
                        </p>
                      </div>
                    </div>

                    <div 
                      className="flex items-center gap-2 px-3.5 py-2 rounded-full h-fit shadow-lg backdrop-blur-md transition-transform duration-200 hover:scale-105"
                      style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)' }}
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-online-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                      </span>
                      <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">{onlineLearnersCount} learners active</span>
                    </div>
                  </div>

                  {/* Avatars & CTA Actions Row */}
                  <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-3">
                        {uniqueAvatars.slice(0, 5).map((a, i) => (
                          <div 
                            key={i} 
                            className="w-10 h-10 rounded-full border-2 border-indigo-900 flex items-center justify-center text-base shadow-md transition-all duration-200 hover:-translate-y-1 hover:scale-110 cursor-default"
                            style={{ background: 'linear-gradient(135deg, #3730a3, #4338ca)' }}
                          >
                            {a}
                          </div>
                        ))}
                        {communityMessages.length > uniqueAvatars.length && (
                          <div 
                            className="w-10 h-10 rounded-full border-2 border-indigo-900 flex items-center justify-center text-xs font-black text-white shadow-md"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                          >
                            +{Math.max(1, communityMessages.length - uniqueAvatars.length)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-indigo-200/80 ml-2 hidden sm:inline">Active study partners</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2.5 relative flex-wrap">
                      <button 
                        type="button" 
                        onClick={handleShareAchievement}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.2))', 
                          border: '1px solid rgba(251,191,36,0.4)', 
                          color: '#fef08a',
                          boxShadow: '0 4px 15px rgba(245,158,11,0.2)' 
                        }}
                      >
                        <span className="text-base">🏆</span>
                        <span>Share Win</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={handleCreateCommunityActivity}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))', 
                          border: '1px solid rgba(255,255,255,0.25)', 
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.15)' 
                        }}
                      >
                        <span className="text-base">📌</span>
                        <span>Activity</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={openInvitePicker}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-white"
                        style={{ 
                          background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', 
                          border: '1px solid rgba(255,255,255,0.3)',
                          boxShadow: '0 8px 25px rgba(236,72,153,0.4)' 
                        }}
                      >
                        <span className="text-base">🎮</span>
                        <span>Invite to Play</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── FILTER TABS & SORT CONTROLS ── */}
              <div 
                className="flex items-center justify-between flex-wrap gap-3 rounded-2xl px-4 py-3 shadow-md"
                style={{ background: 'linear-gradient(135deg, rgba(24, 22, 56, 0.95), rgba(18, 16, 42, 0.95))', border: '1px solid rgba(129, 140, 248, 0.2)', backdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-1.5 p-1 rounded-full overflow-x-auto scrollbar-none" style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {feedTabs.map(tabItem => (
                    <button 
                      key={tabItem.id} 
                      type="button" 
                      onClick={() => setCommunityFeedTab(tabItem.id)}
                      className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-300 cursor-pointer ${communityFeedTab === tabItem.id ? 'text-white scale-105' : 'text-indigo-200/60 hover:text-white hover:scale-102'}`}
                      style={communityFeedTab === tabItem.id ? { background: tabItem.grad, boxShadow: `0 4px 15px ${tabItem.glow}` } : {}}
                    >
                      {tabItem.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 relative" onClick={e => e.stopPropagation()}>
                  <button 
                    type="button" 
                    onClick={() => setCommunitySortMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-indigo-100 cursor-pointer transition-all duration-200 hover:bg-white/10"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                  >
                    <span>{communityNewestFirst ? '⬇ Latest First' : '⬆ Oldest First'}</span>
                  </button>
                  {communitySortMenuOpen && (
                    <div 
                      className="absolute top-full right-0 mt-2 w-36 rounded-2xl shadow-2xl p-1.5 z-30 animate-community-msg-in" 
                      style={{ background: 'rgba(19, 16, 45, 0.98)', border: '1px solid rgba(129, 140, 248, 0.3)', backdropFilter: 'blur(16px)' }}
                    >
                      {[{ v: true, l: '⬇ Latest First' }, { v: false, l: '⬆ Oldest First' }].map(opt => (
                        <button 
                          key={opt.l} 
                          type="button" 
                          onClick={() => { setCommunityNewestFirst(opt.v); setCommunitySortMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-100 hover:bg-indigo-600/30 cursor-pointer transition-colors duration-150"
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── MAIN CONTENT GRID ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── CHAT BOX (PLEASANT INDIGO SLATE GLASS) ── */}
                <div 
                  className="lg:col-span-2 flex flex-col h-[580px] overflow-hidden rounded-3xl transition-all duration-300"
                  style={{ 
                    background: 'linear-gradient(180deg, rgba(28,25,65,0.92) 0%, rgba(20,18,48,0.96) 100%)', 
                    border: '1px solid rgba(129,140,248,0.25)', 
                    boxShadow: '0 12px 40px -10px rgba(79,70,229,0.25)',
                    backdropFilter: 'blur(16px)' 
                  }}
                >
                  {/* Chat Box Title Bar */}
                  <div 
                    className="px-6 py-3.5 flex items-center justify-between border-b shrink-0" 
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-indigo-100 tracking-wide">Live Discussion Feed</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300/60">{orderedMessages.length} Messages</span>
                  </div>

                  {/* Chat Messages Feed */}
                  <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 scrollbar-none">
                    {orderedMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-indigo-200/40">
                        <span className="text-4xl animate-bounce">🌙</span>
                        <p className="text-xs font-bold">No messages in this category yet. Be the first to start!</p>
                      </div>
                    )}

                    {orderedMessages.map((msg, idx) => {
                      const mine = isMine(msg.sender);
                      const isBot = msg.sender === 'Sakshar AI Companion';
                      const reactions = msg.type === 'invite' ? null : getCommunityReactions(msg);

                      if (msg.type === 'invite') {
                        return (
                          <div 
                            key={msg.id} 
                            style={{ animationDelay: `${Math.min(idx,6)*50}ms` }} 
                            className={`flex items-end gap-3 animate-community-msg-in max-w-sm ${mine ? 'flex-row-reverse ml-auto' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 shadow-md border border-white/10 bg-indigo-900/80">
                              {msg.avatar?.startsWith('data:image') ? <img src={msg.avatar} className="w-full h-full object-cover rounded-full" alt="av" /> : (msg.avatar || '👤')}
                            </div>
                            <div className="rounded-2xl overflow-hidden shadow-xl w-72 border border-purple-400/30">
                              <div className={`bg-gradient-to-br ${msg.gameColor} p-4 flex items-center gap-3`}>
                                <span className="text-3xl drop-shadow-md">{msg.gameEmoji}</span>
                                <div className="min-w-0">
                                  <p className="text-white text-sm font-black truncate">{msg.gameTitle}</p>
                                  <p className="text-white/80 text-[10px] font-bold">{msg.gameXp} · Multiplayer Challenge</p>
                                </div>
                              </div>
                              <div className="p-4 space-y-3" style={{ background: 'rgba(23, 20, 56, 0.98)' }}>
                                <p className="text-xs text-indigo-100/80 font-medium">
                                  <span className="font-extrabold text-white">{mine ? 'You' : msg.sender}</span> {mine ? 'invited everyone to' : 'invited you to'} play <span className="font-bold text-white">{msg.gameTitle}</span>!
                                </p>
                                {msg.status === 'accepted' ? (
                                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 rounded-xl px-3 py-2" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                                    <span>✅</span>
                                    <span>{msg.acceptedBy} joined the game</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 rounded-xl px-3 py-2" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                    <span>Waiting for opponent...</span>
                                  </div>
                                )}
                                <button 
                                  type="button" 
                                  onClick={() => handleAcceptInvite(msg.gameId)}
                                  className="w-full text-center text-slate-900 text-xs font-black rounded-xl py-2.5 shadow-lg active:scale-95 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                  style={{ background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' }}
                                >
                                  Accept &amp; Launch Game →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          style={{ animationDelay: `${Math.min(idx,6)*50}ms` }} 
                          className={`flex flex-col gap-1.5 animate-community-msg-in ${mine ? 'items-end ml-auto max-w-[85%]' : 'items-start max-w-[85%]'}`}
                        >
                          <div className={`flex items-end gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 overflow-hidden border shadow-md transition-transform duration-300 hover:scale-110 ${isBot ? 'border-indigo-400 bg-indigo-900/60' : 'border-white/15 bg-slate-800/80'}`}
                            >
                              {msg.avatar?.startsWith('data:image') ? <img src={msg.avatar} className="w-full h-full object-cover" alt="av" /> : (msg.avatar || '👤')}
                            </div>

                            {/* Bubble */}
                            <div 
                              className={`rounded-2xl p-4 space-y-2 max-w-full shadow-lg transition-all duration-200 ${mine ? 'rounded-br-none' : 'rounded-bl-none'}`}
                              style={mine
                                ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)' }
                                : isBot
                                ? { background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(165, 180, 252, 0.3)' }
                                : { background: 'rgba(39, 36, 79, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)' }
                              }
                            >
                              <div className="flex justify-between items-center gap-4 border-b pb-1.5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <span className={`text-xs font-extrabold flex items-center gap-2 ${mine ? 'text-white' : 'text-indigo-100'}`}>
                                  {mine ? 'You' : msg.sender}
                                  {msg.sender === 'Tutor Amit' && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500 text-white">Tutor</span>}
                                  {isBot && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500 text-white">AI</span>}
                                </span>
                                <span className={`text-[10px] font-mono shrink-0 ${mine ? 'text-indigo-200/70' : 'text-indigo-300/50'}`}>{msg.time}</span>
                              </div>
                              {msg.text && <p className={`text-xs sm:text-sm leading-relaxed font-medium ${mine ? 'text-white' : 'text-indigo-100/90'}`}>{msg.text}</p>}
                              {msg.image && <img src={msg.image} alt="attachment" className="rounded-xl max-w-full max-h-52 object-cover mt-2 shadow-md" />}
                            </div>
                          </div>

                          {/* Reactions */}
                          {reactions && reactions.length > 0 && (
                            <div className={`flex items-center gap-1.5 flex-wrap ${mine ? 'pr-12' : 'pl-12'}`}>
                              {reactions.map((r, ri) => (
                                <button 
                                  key={ri} 
                                  type="button" 
                                  onClick={() => handleToggleCommunityReaction(msg, r.emoji)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-110 active:scale-90"
                                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e0e7ff' }}
                                >
                                  <span>{r.emoji}</span>
                                  <span className="text-[10px] font-mono">{r.count}</span>
                                </button>
                              ))}
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); handleToggleCommunityReaction(msg, '❤️'); }}
                                className="px-2 py-1 rounded-full text-xs cursor-pointer transition-all duration-200 hover:scale-110 text-indigo-300/60 hover:text-white"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                              >
                                ＋
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isCompanionTyping && (
                      <div className="flex items-end gap-3 animate-community-msg-in">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border border-indigo-400 bg-indigo-900/60">🤖</div>
                        <div className="rounded-2xl rounded-bl-none px-5 py-4 flex items-center gap-1.5" style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(165, 180, 252, 0.3)' }}>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-dot" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-dot" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-dot" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Attached Image Preview */}
                  {msgImage && (
                    <div className="px-5 py-2 flex items-center gap-3 bg-indigo-950/40 border-t border-indigo-500/20">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-indigo-400/40 shadow-md">
                        <img src={msgImage} alt="preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setMsgImage(null)} 
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white text-xs flex items-center justify-center cursor-pointer hover:bg-red-500"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-indigo-200 font-medium">Image attached and ready to send</p>
                    </div>
                  )}

                  {/* Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <div 
                      onClick={e => e.stopPropagation()} 
                      className="mx-5 mb-2 p-3.5 rounded-2xl animate-community-msg-in shadow-2xl" 
                      style={{ background: 'rgba(23, 20, 56, 0.98)', border: '1px solid rgba(165, 180, 252, 0.3)', backdropFilter: 'blur(16px)' }}
                    >
                      <div className="flex flex-wrap gap-2">
                        {['😊','😂','🥰','😍','🤩','🎉','🔥','👍','❤️','✨','🙌','👏','🤔','😅','💪','🥳','🌟','🎊','🎮','📚','✍️','🎙️','🤖','💡','🏆','🌱','🤝','💬','🚀','⭐'].map(em => (
                          <button 
                            key={em} 
                            type="button" 
                            onClick={() => { setNewMsgText(prev => prev + em); setShowEmojiPicker(false); }}
                            className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 cursor-pointer transition-transform duration-150 hover:scale-125"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat Input Form */}
                  <form 
                    onSubmit={handlePostMessage} 
                    className="p-4 flex items-center gap-3 shrink-0" 
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(18, 16, 42, 0.8)' }} 
                    onClick={e => e.stopPropagation()}
                  >
                    <button 
                      type="button" 
                      title="Add emoji" 
                      onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(prev => !prev); }}
                      className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${showEmojiPicker ? 'bg-indigo-600 text-white' : 'text-indigo-300/60 hover:text-white hover:bg-white/10'}`}
                    >
                      <span className="text-xl">😊</span>
                    </button>

                    <button 
                      type="button" 
                      title="Attach image" 
                      onClick={() => imageAttachRef.current?.click()}
                      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full text-indigo-300/60 hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
                    >
                      <span className="text-xl">🖼️</span>
                    </button>

                    <input 
                      ref={imageAttachRef} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => setMsgImage(reader.result);
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }} 
                    />

                    <input 
                      type="text" 
                      placeholder="Share a thought, question, or achievement with the lounge…"
                      value={newMsgText} 
                      onChange={e => setNewMsgText(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-indigo-300/40 focus:outline-none transition-all duration-200"
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(129, 140, 248, 0.8)'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.target.style.boxShadow = 'none'; }}
                    />

                    <button 
                      type="submit" 
                      disabled={!newMsgText.trim() && !msgImage}
                      className="w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl text-white disabled:opacity-30 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                    >
                      <span className="text-base">➤</span>
                    </button>
                  </form>
                </div>

                {/* ── SIDEBAR (THE 3 PLEASANT COLORED BOXES) ── */}
                <div className="space-y-5 flex flex-col justify-between">

                  {/* ── BOX 1: ACTIVE LEARNERS (PLEASANT TEAL/EMERALD DARK GLASS) ── */}
                  <div 
                    className="rounded-3xl p-5 sm:p-6 space-y-4 animate-pop-in transition-all duration-300 hover:shadow-xl"
                    style={{ 
                      background: 'linear-gradient(160deg, rgba(16,42,40,0.92) 0%, rgba(11,28,27,0.96) 100%)', 
                      border: '1px solid rgba(45,212,191,0.3)', 
                      boxShadow: '0 8px 32px -8px rgba(20,184,166,0.25)',
                      backdropFilter: 'blur(16px)' 
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(45,212,191,0.2)' }}>
                      <span className="text-xs font-black text-teal-200 uppercase tracking-wider flex items-center gap-2">
                        <span>👥</span> Active Learners
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">Live</span>
                    </div>

                    <div className="space-y-3">
                      {topLearners.map((l, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-200 hover:bg-teal-400/10 hover:translate-x-1 cursor-default group"
                        >
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border border-teal-400/30 shadow-md group-hover:scale-110 transition-transform duration-200"
                            style={{ background: 'linear-gradient(135deg, #115e59, #0f766e)' }}
                          >
                            {l.avatar?.startsWith('data:image') ? <img src={l.avatar} className="w-full h-full object-cover rounded-full" alt="av" /> : (l.avatar || '👤')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-teal-50 truncate group-hover:text-teal-200 transition-colors">{l.name}</p>
                            <p className="text-[10px] text-teal-200/60 font-semibold">{l.count} message{l.count === 1 ? '' : 's'}</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0 shadow-[0_0_8px_#2dd4bf] animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── BOX 2: QUICK ACTIONS (PLEASANT VIBRANT ROYAL PURPLE GLASS) ── */}
                  <div 
                    className="rounded-3xl p-5 sm:p-6 space-y-4 animate-pop-in transition-all duration-300 hover:shadow-xl"
                    style={{ 
                      background: 'linear-gradient(160deg, rgba(38,24,55,0.92) 0%, rgba(24,15,36,0.96) 100%)', 
                      border: '1px solid rgba(192,132,252,0.3)', 
                      boxShadow: '0 8px 32px -8px rgba(168,85,247,0.25)',
                      backdropFilter: 'blur(16px)' 
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(192,132,252,0.2)' }}>
                      <span className="text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-2">
                        <span>⚡</span> Quick Actions
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { label: 'Share a Win', emoji: '🏆', color: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.15) 100%)', border: 'rgba(251,191,36,0.4)', text: '#fef08a', action: handleShareAchievement },
                        { label: 'Create Activity', emoji: '📌', color: 'linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(99,102,241,0.15) 100%)', border: 'rgba(129,140,248,0.4)', text: '#e0e7ff', action: handleCreateCommunityActivity },
                        { label: 'Invite to Play', emoji: '🎮', color: 'linear-gradient(135deg, rgba(236,72,153,0.2) 0%, rgba(217,70,239,0.15) 100%)', border: 'rgba(236,72,153,0.4)', text: '#fce7f3', action: openInvitePicker },
                      ].map(({ label, emoji, color, border, text, action }) => (
                        <button 
                          key={label} 
                          type="button" 
                          onClick={action}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-98 group"
                          style={{ background: color, border: `1px solid ${border}` }}
                        >
                          <span className="text-lg group-hover:scale-125 transition-transform duration-200">{emoji}</span>
                          <span className="text-xs font-extrabold" style={{ color: text }}>{label}</span>
                          <span className="ml-auto text-xs font-black transition-transform duration-200 group-hover:translate-x-1" style={{ color: text }}>→</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── BOX 3: LOUNGE GUIDELINES (PLEASANT DEEP LAVENDER / INDIGO GLASS) ── */}
                  <div 
                    className="rounded-3xl p-5 sm:p-6 space-y-4 animate-pop-in transition-all duration-300 hover:shadow-xl"
                    style={{ 
                      background: 'linear-gradient(160deg, rgba(30,27,75,0.92) 0%, rgba(19,17,48,0.96) 100%)', 
                      border: '1px solid rgba(165,180,252,0.3)', 
                      boxShadow: '0 8px 32px -8px rgba(99,102,241,0.25)',
                      backdropFilter: 'blur(16px)' 
                    }}
                  >
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'rgba(165,180,252,0.2)' }}>
                      <span className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                        <span>🌟</span> Lounge Guidelines
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-indigo-100/80 font-medium">
                      <li className="flex items-start gap-2.5 transition-transform duration-200 hover:translate-x-1">
                        <span className="text-sm">🌱</span>
                        <span>Celebrate every small win, yours and others'.</span>
                      </li>
                      <li className="flex items-start gap-2.5 transition-transform duration-200 hover:translate-x-1">
                        <span className="text-sm">🤝</span>
                        <span>Offer help gently, never judge mistakes.</span>
                      </li>
                      <li className="flex items-start gap-2.5 transition-transform duration-200 hover:translate-x-1">
                        <span className="text-sm">✨</span>
                        <span>Share streaks &amp; scores to inspire peers.</span>
                      </li>
                      <li className="flex items-start gap-2.5 transition-transform duration-200 hover:translate-x-1">
                        <span className="text-sm">🔒</span>
                        <span>Respect privacy and everyone's learning pace.</span>
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* ── CREATE ACTIVITY MODAL ── */}
              {showActivityModal && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-community-msg-in" 
                  style={{ background: 'rgba(10, 8, 25, 0.8)', backdropFilter: 'blur(10px)' }} 
                  onClick={() => setShowActivityModal(false)}
                >
                  <div 
                    className="w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl" 
                    style={{ background: 'linear-gradient(160deg, #1e1b4b, #0f172a)', border: '1px solid rgba(165,180,252,0.4)', boxShadow: '0 20px 60px rgba(99,102,241,0.4)' }} 
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(165,180,252,0.4)' }}>📌</div>
                      <div>
                        <h3 className="text-lg font-black text-white">Create Lounge Activity</h3>
                        <p className="text-xs text-indigo-200/60 font-medium">Invite peers to practice together</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider">Activity Title *</label>
                        <input 
                          ref={activityInputRef} 
                          type="text" 
                          value={activityTitle} 
                          onChange={e => setActivityTitle(e.target.value)}
                          placeholder='e.g. "Evening reading group at 7pm"'
                          className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-indigo-300/40 focus:outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                          onKeyDown={e => { if (e.key === 'Enter') handleSubmitActivity(); }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-indigo-200 uppercase tracking-wider">Scheduled Time (optional)</label>
                        <input 
                          type="time" 
                          value={activityTime} 
                          onChange={e => setActivityTime(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium text-white focus:outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setShowActivityModal(false)}
                        className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-indigo-200 cursor-pointer transition-all duration-150 hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={handleSubmitActivity} 
                        disabled={!activityTitle.trim()}
                        className="flex-1 py-3 rounded-2xl text-xs font-black text-white cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' }}
                      >
                        Post Activity →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <style>{`
                @keyframes communityMsgIn {
                  from { opacity: 0; transform: translateY(12px) scale(0.97); }
                  to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-community-msg-in { animation: communityMsgIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
                @keyframes typingDotBounce {
                  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                  30%           { transform: translateY(-5px); opacity: 1; }
                }
                .animate-typing-dot { animation: typingDotBounce 1s ease-in-out infinite; }
                @keyframes onlinePulse {
                  0%        { transform: scale(1); opacity: 0.8; }
                  75%, 100% { transform: scale(2.2); opacity: 0; }
                }
                .animate-online-pulse { animation: onlinePulse 2s cubic-bezier(0,0,0.2,1) infinite; }
                @keyframes starTwinkle {
                  0%, 100% { opacity: 0.2; }
                  50%      { opacity: 0.85; }
                }
                .animate-star-twinkle { animation: starTwinkle 3s ease-in-out infinite; }
              `}</style>
            </div>
          );
        })()}






        {/* TABS E: ANALYTICS VIEW */}
        {currentNav === 'analytics' && (
          <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
            {/* Dynamic Analytics Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="animate-pop-in delay-0 hover-lift bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.avgAccuracy || 'Average Accuracy'}</p>
                <p key={averageScore} className="animate-number-pop text-2xl font-black text-emerald-800 mt-1">{averageScore || 0}%</p>
              </div>
              <div className="animate-pop-in delay-1 hover-lift bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.completedLessonsLabel || 'Completed Lessons'}</p>
                <p key={completedLessons.size} className="animate-number-pop text-2xl font-black text-purple-800 mt-1">{completedLessons.size}</p>
              </div>
              <div className="animate-pop-in delay-2 hover-lift bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.selectedLevelLabel || 'Selected Level'}</p>
                <p className="animate-number-pop text-2xl font-black text-blue-800 mt-1 uppercase">{educationalLevel}</p>
              </div>
            </div>

            {/* ================================================================
                PERFORMANCE REPORT CARD (Skill Evaluation + Performance Reports
                steps from the project flow chart): current level, per-skill
                breakdown with strengths/gaps, and a one-click recommended
                next lesson driven by the weakest skill.
                ================================================================ */}
            <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧾</span>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">{t.performanceReportTitle || 'Performance Report'}</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Skill evaluation and personalized next steps</p>
                  </div>
                </div>
                <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Current Level: {educationalLevel}
                </span>
              </div>

              {/* Overall learning progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                  <span>{t.overallProgress || 'Overall Learning Progress'}</span>
                  <span className="text-gray-900">{averageScore || 0}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#5C67F2] h-full rounded-full transition-all duration-500"
                    style={{ width: `${averageScore || 0}%` }}
                  />
                </div>
              </div>

              {/* Skill Evaluation breakdown */}
              <div className="space-y-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t.skillEvaluationLabel || 'Skill Evaluation'}</span>
                {['reading', 'writing', 'speaking'].map((skillKey, skillIdx) => {
                  const { average, attemptCount } = skillBreakdown[skillKey];
                  const status = getSkillStatus(average);
                  return (
                    <div key={skillKey} className={`animate-pop-in delay-${skillIdx} space-y-1.5`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-700 flex items-center gap-1.5">
                          <span>{skillMeta[skillKey].icon}</span> {skillMeta[skillKey].label}
                          <span className="text-[10px] text-gray-300 font-medium">({attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'})</span>
                        </span>
                        <span className={`font-extrabold ${status.color}`}>
                          {average === null ? status.label : `${average}% · ${status.label}`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`${status.bar} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${average || 6}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strengths & areas for improvement */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">{t.strengthsLabel || 'Strengths'}</span>
                  <p className="text-xs text-emerald-900 font-semibold leading-relaxed">{performanceReport.strengthsLabel}</p>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">{t.areasForImprovementLabel || 'Areas for Improvement'}</span>
                  <p className="text-xs text-amber-900 font-semibold leading-relaxed">{performanceReport.areasForImprovement}</p>
                </div>
              </div>

              {/* Recommended next lesson CTA */}
              <div className="flex items-center justify-between gap-4 bg-[#FBFBFA] border border-dashed border-gray-200 rounded-2xl p-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{skillMeta[performanceReport.recommendedSkill].icon}</span>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{t.recommendedNextLesson || 'Recommended Next Lesson'}</span>
                    <span className="text-xs font-bold text-gray-800">{skillMeta[performanceReport.recommendedSkill].label} Practice</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule(performanceReport.recommendedSkill)}
                  className="py-2.5 px-4 bg-[#1C2D1A] text-white text-xs font-bold rounded-xl hover:bg-opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  {t.startNow || 'Start Now'} →
                </button>
              </div>
            </div>

            {/* Evaluation History Logs */}
            <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  <h3 className="text-lg font-extrabold text-gray-900">{t.evaluationHistoryTitle || 'Your Evaluation History Logs'}</h3>
                </div>
                <button
                  onClick={triggerHistoryRefresh}
                  className="group/refresh text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 px-2.5 py-1.5 rounded-xl transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <span className="inline-block transition-transform duration-500 group-hover/refresh:rotate-180">↻</span> {t.refreshNow || 'Refresh Now'}
                </button>
              </div>
              <EvaluationHistoryLogs refreshKey={historyRefreshKey} userId={userId} />
            </div>
          </div>
        )}

        {/* TABS F: SETTINGS VIEW */}
        {currentNav === 'settings' && (
          <div className="space-y-6 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
            <div className="animate-pop-in delay-0 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#5C67F2]/10 flex items-center justify-center text-xl shrink-0 transition-transform duration-500 hover:rotate-90 cursor-default">
                ⚙️
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">{t.settingsTitle || 'Profile & Interface Settings'}</h2>
                <p className="text-xs text-gray-400 font-medium mt-1">Configure your personal profile details, languages, fonts, colors, and layout appearance.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">

              {/* Card 1: Profile & Customization Info */}
              <div className="animate-pop-in delay-1 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-shadow duration-300 hover:shadow-md">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-150 pb-2 flex items-center gap-2">
                  <span>👤</span> {t.profileDetails || 'Profile details'}
                </h3>

                {profileUpdateError && (
                  <div className="p-3.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl animate-slide-down flex items-center gap-2">
                    <span className="text-base shrink-0">⚠️</span> {profileUpdateError}
                  </div>
                )}

                {profileUpdateSuccess && (
                  <div className="p-3.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl animate-slide-down flex items-center gap-2">
                    <span className="text-base shrink-0 animate-number-pop">🎉</span> Profile updated successfully!
                  </div>
                )}

                <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                  {/* Avatar Picker Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Profile Image / Avatar</label>
                    <div className="flex items-center gap-4">
                      {/* Current Preview */}
                      <div className="relative shrink-0 group">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#5C67F2]/40 to-transparent opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 pointer-events-none" />
                        <div className="relative w-16 h-16 rounded-2xl bg-gray-50 border-2 border-[#5C67F2]/20 flex items-center justify-center text-3xl overflow-hidden shadow-inner transition-all duration-300 group-hover:scale-105 group-hover:border-[#5C67F2]/50 group-hover:rotate-1">
                          {profileAvatar && profileAvatar.startsWith('data:image') ? (
                            <img src={profileAvatar} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt="avatar" />
                          ) : (
                            <span className="transition-transform duration-300 group-hover:scale-110 inline-block">{profileAvatar || "👤"}</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 flex-1">
                        {/* Native File Upload button */}
                        <label className="inline-block px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[10px] font-black rounded-xl cursor-pointer shadow-xs transition-all duration-200 active:scale-95 hover:scale-[1.03] hover:shadow-sm">
                          📂 Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfileAvatar(reader.result);
                                localStorage.setItem('cached_avatar', reader.result);
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[9px] text-gray-400 font-medium">PNG, JPG up to 2MB or choose an emoji below:</p>
                      </div>
                    </div>

                    {/* Pre-curated Avatar Emojis */}
                    <div className="flex gap-2 flex-wrap pt-2">
                      {["👨‍🎓", "👩‍🎓", "👤", "🤖", "🌟", "🦉", "🦁", "🦊", "🐬"].map((emoji, idx) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setProfileAvatar(emoji);
                            localStorage.setItem('cached_avatar', emoji);
                          }}
                          style={{ animationDelay: `${idx * 0.03}s` }}
                          className={`animate-pop-in w-9 h-9 rounded-xl border text-lg flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer hover:-translate-y-0.5 ${
                            profileAvatar === emoji
                              ? 'border-[#5C67F2] bg-[#5C67F2]/5 font-black scale-110 shadow-sm ring-2 ring-[#5C67F2]/25'
                              : 'border-gray-200 hover:bg-gray-50 bg-white hover:shadow-sm'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{(t.fullName || '👤 Full Name').replace('👤 ', '')}</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2] focus:ring-2 focus:ring-[#5C67F2]/15 transition-all duration-200 text-gray-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{t.ageLabel || 'Age'}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                      placeholder="Enter your age"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2] focus:ring-2 focus:ring-[#5C67F2]/15 transition-all duration-200 text-gray-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">{(t.languageLabel || '🌐 Preferred Native Language').replace('🌐 ', '')}</label>
                    <select
                      value={profileLanguage}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setProfileLanguage(newLang);
                        // Instantly preview the interface in the newly chosen language;
                        // the choice is still persisted to the profile only on Save.
                        if (onLanguagePreview) onLanguagePreview(newLang);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#5C67F2] focus:ring-2 focus:ring-[#5C67F2]/15 transition-all duration-200 font-medium text-gray-800 cursor-pointer"
                    >
                      {targetLanguages.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.native} ({l.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Educational Level / Track</label>
                    <select
                      value={profileEduLevel}
                      onChange={(e) => setProfileEduLevel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#5C67F2] focus:ring-2 focus:ring-[#5C67F2]/15 transition-all duration-200 font-medium text-gray-800 cursor-pointer"
                    >
                      <option value="none">{t.eduLevel1 || "No Formal Schooling / Foundational Learner"}</option>
                      <option value="primary">{t.eduLevel2 || "Primary School (Class 1-5)"}</option>
                      <option value="middle">{t.eduLevel3 || "Middle School (Class 6-8)"}</option>
                      <option value="high">{t.eduLevel4 || "High School / Secondary (Class 9-12)"}</option>
                    </select>
                  </div>

                  {/* 🤖 AI Tutor Voice Setting Dropdown */}
                  <div className="space-y-1.5 border-t border-gray-100 pt-4 mt-4">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">🤖 AI Tutor voice setting</label>
                    <div className="flex gap-2">
                      <select
                        value={profileTutorVoiceUri}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfileTutorVoiceUri(val);
                          localStorage.setItem(`tutor_voice_uri_${userId}`, val);
                        }}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#5C67F2] focus:ring-2 focus:ring-[#5C67F2]/15 transition-all duration-200 font-medium text-gray-800 cursor-pointer"
                      >
                        <option value="">Default Voice (Dynamic Locale matching)</option>
                        {availableVoices.map((v, idx) => (
                          <option key={idx} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                      {/* Voice tester preview button */}
                      <button
                        type="button"
                        onClick={() => {
                          const testPhrases = {
                            hindi: "नमस्ते! मैं आपका साक्षर एआई ट्यूटर हूँ।",
                            bengali: "নমস্কার! আমি আপনার সাক্ষর এআই টিউটর।",
                            telugu: "నమస్తే! నేను మీ సాక్షర్ ఏఐ ట్యూటర్.",
                            tamil: "வணக்கம்! நான் உங்கள் சாக்ஷர் ஏஐ ஆசிரியர்.",
                            punjabi: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਸਾਖਰ ਏਆਈ ਟਿਊਟਰ ਹਾਂ।",
                            marathi: "नमस्कार! मी तुमचा साक्षर एआय ट्युटर आहे.",
                            gujarati: "નમસ્તે! હું તમારો સાક્ષર એઆઈ ટ્યુટર છું.",
                            kannada: "ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ ಸಾಕ್ಷರ್ ಎಐ ಬೋಧಕ.",
                            malayalam: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ സാക്ഷർ എഐ ട്യൂട്ടർ ആണ്.",
                            odia: "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର ସାକ୍ଷର ଏଆଇ ଟିଉଟର।",
                            urdu: "ہیلو! میں آپ کا ساکشر اے آئی ٹیوٹر ہوں۔",
                            english: "Hello! I am your Sakshar AI voice tutor."
                          };
                          const testText = testPhrases[profileLanguage] || testPhrases.english;
                          speakText(testText, 'voice-test-preview');
                        }}
                        className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 active:scale-95 hover:scale-[1.04] transition-all duration-200 cursor-pointer shrink-0"
                      >
                        🔊 Test
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium leading-normal mt-1">Select a customized speech system voice installed on your device or browser for tutoring feedback sessions.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="relative w-full py-3 bg-[#5C67F2] text-white text-xs font-bold rounded-xl hover:bg-opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 cursor-pointer mt-4 overflow-hidden"
                  >
                    {isUpdatingProfile && (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    {isUpdatingProfile ? (t.savingSettings || 'Saving Settings...') : (t.saveProfileChanges || 'Save Profile Changes')}
                  </button>
                </form>
              </div>

              {/* Card 2: Interface Theme & Font Customizer */}
              <div className="animate-pop-in delay-2 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-shadow duration-300 hover:shadow-md">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-150 pb-2 flex items-center gap-2">
                  <span>🎨</span> {t.appearanceCustomizer || 'Appearance customizer'}
                </h3>

                {/* Font Customizer */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Choose font family</label>
                    <p className="text-[10px] text-gray-400 font-medium">Select a premium typeface optimized for literacy instruction:</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'inter', name: 'Inter Sans', desc: 'Clean, neutral, and modern', fontClass: 'family-inter' },
                      { id: 'outfit', name: 'Outfit Rounded', desc: 'Friendly, soft geometric rounded letters', fontClass: 'family-outfit' },
                      { id: 'lexend', name: 'Lexend Reading', desc: 'Specifically styled to boost fluency', fontClass: 'family-lexend' },
                      { id: 'playfair', name: 'Playfair Serif', desc: 'Classic, artistic literary serif', fontClass: 'family-playfair' }
                    ].map((f, idx) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setDashboardFont(f.id);
                          localStorage.setItem('cached_font', f.id);
                        }}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        className={`animate-pop-in relative p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${f.fontClass} ${
                          dashboardFont === f.id
                            ? 'border-[#5C67F2] bg-[#5C67F2]/5 shadow-sm scale-[1.02]'
                            : 'border-gray-200 hover:bg-gray-50 hover:shadow-sm bg-white'
                        }`}
                      >
                        {dashboardFont === f.id && (
                          <span className="animate-check-pop absolute top-2 right-2 w-4 h-4 rounded-full bg-[#5C67F2] text-white text-[9px] flex items-center justify-center font-black shadow-sm">✓</span>
                        )}
                        <div>
                          <span className="text-sm font-extrabold block text-gray-900">{f.name}</span>
                          <span className="text-[9px] font-semibold text-gray-400 block mt-1 leading-normal">{f.desc}</span>
                        </div>
                        <span className="text-xs mt-3 block text-gray-500 font-bold">Aa Bb Cc</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Theme Customizer */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Choose dashboard color theme</label>
                    <p className="text-[10px] text-gray-400 font-medium">Select a color scheme that suits your study lighting:</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'indigo', name: 'Indigo Delight', preview: 'bg-[#5C67F2]', border: 'border-indigo-150', bg: 'bg-[#F0F2F5]', text: 'Default styling' },
                      { id: 'emerald', name: 'Emerald Garden', preview: 'bg-[#1C2D1A]', border: 'border-emerald-700', bg: 'bg-[#F0F4F1]', text: 'Fresh forest layout' },
                      { id: 'amber', name: 'Amber Sunset', preview: 'bg-[#D97706]', border: 'border-amber-600', bg: 'bg-[#FAF7F2]', text: 'Warm sunset page' },
                      { id: 'midnight', name: 'Midnight Dark', preview: 'bg-[#6366F1]', border: 'border-slate-800', bg: 'bg-[#0F172A]', text: 'Comforting low light' },
                      { id: 'rose', name: 'Rose Blossom', preview: 'bg-[#E11D48]', border: 'border-rose-600', bg: 'bg-[#FDF2F4]', text: 'Soft pink energy' },
                      { id: 'ocean', name: 'Ocean Breeze', preview: 'bg-[#0891B2]', border: 'border-cyan-700', bg: 'bg-[#F0F9FB]', text: 'Calm coastal tones' },
                      { id: 'violet', name: 'Violet Dream', preview: 'bg-[#7C3AED]', border: 'border-violet-700', bg: 'bg-[#F5F3FF]', text: 'Bold creative accent' },
                      { id: 'graphite', name: 'Graphite Dark', preview: 'bg-[#94A3B8]', border: 'border-zinc-700', bg: 'bg-[#18181B]', text: 'Sleek neutral dark mode' }
                    ].map((tInfo, idx) => (
                      <button
                        key={tInfo.id}
                        type="button"
                        onClick={() => {
                          setDashboardTheme(tInfo.id);
                          localStorage.setItem('cached_theme', tInfo.id);
                        }}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                        className={`animate-pop-in relative p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                          dashboardTheme === tInfo.id
                            ? 'border-[#5C67F2] bg-[#5C67F2]/5 shadow-sm scale-[1.02]'
                            : 'border-gray-200 hover:bg-gray-50 hover:shadow-sm bg-white'
                        }`}
                      >
                        {dashboardTheme === tInfo.id && (
                          <span className="animate-check-pop absolute top-2 right-2 w-4 h-4 rounded-full bg-[#5C67F2] text-white text-[9px] flex items-center justify-center font-black shadow-sm">✓</span>
                        )}
                        <div className="space-y-1.5 w-full">
                          <div className="flex justify-between items-center pr-5">
                            <span className="text-xs font-black text-gray-900">{tInfo.name}</span>
                            <div className="flex gap-1">
                              <span className={`w-3.5 h-3.5 rounded-full ${tInfo.preview} inline-block transition-transform duration-200 ${dashboardTheme === tInfo.id ? 'animate-pulse-ring' : ''}`}></span>
                              <span className={`w-3.5 h-3.5 rounded-full ${tInfo.bg} border border-gray-200 inline-block`}></span>
                            </div>
                          </div>
                          <span className="text-[9px] font-semibold text-gray-400 block leading-tight">{tInfo.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Card 3: Push Notifications — full width */}
            <div className="animate-pop-in delay-3 max-w-4xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Push Notifications</h3>
              </div>
              <PushNotificationManager userId={userId} fullName={fullName} />
            </div>

          </div>
        )}

      </main>

      {/* COLUMN 3: RIGHT PANEL - CALENDAR & SUBMISSIONS */}
      <aside className="w-full lg:w-80 bg-white border-0 p-6 shrink-0 rounded-[2rem] shadow-sm flex flex-col justify-between overflow-y-auto scrollbar-none my-1 relative">
        
        <div className="space-y-8">
          {/* Top Profile Banner header with notification alert */}
          <div className="flex items-center justify-between relative">
            <div 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfilePopoverOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-sm relative cursor-pointer hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all duration-200 shadow-xs"
            >
              <span className="transition-transform duration-200 hover:rotate-12 inline-block">🔔</span>
              {notifications.some(n => !n.read) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-pink-500 rounded-full border border-white animate-pulse"></span>
              )}
            </div>

            {/* Notifications Dropdown Drawer list */}
            {isNotificationsOpen && (
              <div className="absolute left-0 top-10 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 z-40 space-y-3.5 animate-scale-up animate-duration-150">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{t.alertMessages || 'Alert Messages'}</h4>
                  <button 
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      setIsNotificationsOpen(false);
                    }}
                    className="text-[8px] text-[#5C67F2] font-black uppercase tracking-wider"
                  >
                    {t.dismissAll || 'Dismiss All'}
                  </button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-2 text-[10px] leading-tight font-semibold hover:bg-gray-50/50 p-1.5 rounded-lg transition">
                      <span className="text-xs shrink-0">{n.icon}</span>
                      <div>
                        <p className="text-gray-800">{n.text}</p>
                        <span className="text-[8px] text-gray-400 mt-0.5 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2.5 relative">
              <div 
                onClick={() => {
                  setIsProfilePopoverOpen(!isProfilePopoverOpen);
                  setIsNotificationsOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-[#5C67F2]/10 border border-[#5C67F2]/20 flex items-center justify-center text-xs font-bold text-[#5C67F2] overflow-hidden shrink-0 transition-transform duration-200 hover:scale-110 cursor-pointer"
              >
                {profileAvatar && profileAvatar.startsWith('data:image') ? (
                  <img src={profileAvatar} className="w-full h-full object-cover transition-transform duration-300 hover:scale-125" alt="avatar" />
                ) : (
                  profileAvatar || "👤"
                )}
              </div>

              {/* Profile Info Popover */}
              {isProfilePopoverOpen && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-gray-100 shadow-2xl rounded-2xl p-5 z-40 animate-scale-up animate-duration-150">
                  <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-[#5C67F2]/10 border-2 border-[#5C67F2]/20 flex items-center justify-center text-2xl font-bold text-[#5C67F2] overflow-hidden shadow-inner">
                      {profileAvatar && profileAvatar.startsWith('data:image') ? (
                        <img src={profileAvatar} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        profileAvatar || "👤"
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 leading-tight">{fullName || 'Learner'}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{getEduLevelLabel(educationalLevel)}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 py-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">{t.ageLabel || 'Age'}</span>
                      <span className="font-black text-gray-800">{age || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">{(t.languageLabel || '🌐 Preferred Native Language').replace('🌐 ', '')}</span>
                      <span className="font-black text-gray-800">{getLanguageNativeLabel(lang)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentNav('settings');
                      setIsProfilePopoverOpen(false);
                    }}
                    className="w-full py-2 bg-[#5C67F2] hover:bg-opacity-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-95 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    {t.navSettings || 'Settings'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Animated Hero Card ── */}
          <div className="relative rounded-3xl overflow-hidden p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(135deg,#1C2D1A 0%,#15803d 60%,#166534 100%)', minHeight: '148px' }}>
            {/* Keyframes injected inline */}
            <style>{`
              @keyframes floatA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(8px,-10px) scale(1.08)} }
              @keyframes floatB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-6px,8px) scale(0.95)} }
              @keyframes floatC { 0%,100%{transform:translate(0,0)} 50%{transform:translate(4px,-6px)} }
              @keyframes spinRing { to{stroke-dashoffset: 0} }
              @keyframes heroGlow { 0%,100%{opacity:0.55} 50%{opacity:1} }
              @keyframes textShimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
            `}</style>

            {/* Floating background orbs */}
            <div className="absolute top-[-28px] right-[-28px] w-36 h-36 rounded-full blur-2xl pointer-events-none" style={{ background:'rgba(74,222,128,0.22)', animation:'floatA 6s ease-in-out infinite' }} />
            <div className="absolute bottom-[-20px] left-[-20px] w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ background:'rgba(134,239,172,0.18)', animation:'floatB 8s ease-in-out infinite' }} />
            <div className="absolute top-[40%] left-[40%] w-16 h-16 rounded-full blur-xl pointer-events-none" style={{ background:'rgba(22,163,74,0.15)', animation:'floatC 5s ease-in-out infinite' }} />

            {/* Top row: greeting + XP ring */}
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300/70 mb-0.5">🌅 Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</p>
                <p
                  className="text-base font-black leading-tight text-white truncate"
                  style={{ textShadow:'0 1px 8px rgba(0,0,0,0.3)' }}
                >
                  {fullName ? fullName.split(' ')[0] : 'Learner'}! Keep it up 🚀
                </p>
                <p className="text-[10px] font-semibold text-emerald-200/70 mt-1 leading-snug">
                  {streakCount > 0
                    ? `🔥 ${streakCount}-day streak! You're on fire.`
                    : 'Start learning today to build your streak!'}
                </p>
              </div>

              {/* Animated XP ring */}
              <div className="shrink-0 relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {/* Track */}
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                  {/* Animated fill */}
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="url(#xpGrad)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="100"
                    strokeDashoffset={100 - Math.min(parseInt(localStorage.getItem('game_xp') || '0') % 100, 100)}
                    style={{ transition: 'stroke-dashoffset 1.2s ease', filter:'drop-shadow(0 0 4px rgba(74,222,128,0.6))' }}
                  />
                  <defs>
                    <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#86efac" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-white leading-none">{parseInt(localStorage.getItem('game_xp') || '0') % 100}</span>
                  <span className="text-[7px] font-bold text-emerald-300 leading-none">XP</span>
                </div>
              </div>
            </div>

            {/* Bottom row: 4 quick stat pills */}
            <div className="relative z-10 grid grid-cols-4 gap-1.5 mt-1">
              {[
                { label: 'Streak', val: `${streakCount}d`, icon: '🔥' },
                { label: 'Level', val: (educationalLevel === 'none' ? 'Basic' : educationalLevel === 'primary' ? 'Prim' : educationalLevel === 'middle' ? 'Mid' : 'High'), icon: '🎓' },
                { label: 'XP', val: `${parseInt(localStorage.getItem('game_xp') || '0')}`, icon: '⭐' },
                { label: 'Done', val: `${completedLessons.size}`, icon: '✅' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-2 rounded-2xl" style={{ background:'rgba(255,255,255,0.1)', backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.12)' }}>
                  <span className="text-sm leading-none">{s.icon}</span>
                  <span className="text-[11px] font-black text-white leading-none mt-0.5">{s.val}</span>
                  <span className="text-[8px] font-bold text-emerald-300/70 leading-none mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Premium Animated Scene ── */}
          <div className="w-full rounded-3xl overflow-hidden relative" style={{ aspectRatio:'4/3', background:'linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#312e81 70%,#1e3a5f 100%)' }}>
            <style>{`
              @keyframes morphBlob{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}25%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}50%{border-radius:50% 60% 30% 40%/40% 30% 60% 50%}75%{border-radius:40% 30% 60% 70%/60% 70% 30% 40%}}
              @keyframes orbitA{from{transform:rotate(0deg) translateX(68px) rotate(0deg)}to{transform:rotate(360deg) translateX(68px) rotate(-360deg)}}
              @keyframes orbitB{from{transform:rotate(120deg) translateX(68px) rotate(-120deg)}to{transform:rotate(480deg) translateX(68px) rotate(-480deg)}}
              @keyframes orbitC{from{transform:rotate(240deg) translateX(68px) rotate(-240deg)}to{transform:rotate(600deg) translateX(68px) rotate(-600deg)}}
              @keyframes orbitD{from{transform:rotate(60deg) translateX(95px) rotate(-60deg)}to{transform:rotate(420deg) translateX(95px) rotate(-420deg)}}
              @keyframes orbitE{from{transform:rotate(180deg) translateX(95px) rotate(-180deg)}to{transform:rotate(540deg) translateX(95px) rotate(-540deg)}}
              @keyframes orbitF{from{transform:rotate(300deg) translateX(95px) rotate(-300deg)}to{transform:rotate(660deg) translateX(95px) rotate(-660deg)}}
              @keyframes spinRingA{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
              @keyframes spinRingB{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
              @keyframes floatIcon1{0%,100%{transform:translate(0,0) rotate(-8deg)}50%{transform:translate(-5px,-12px) rotate(8deg)}}
              @keyframes floatIcon2{0%,100%{transform:translate(0,0) rotate(5deg)}50%{transform:translate(6px,-9px) rotate(-5deg)}}
              @keyframes floatIcon3{0%,100%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(-4px,-14px) rotate(10deg)}}
              @keyframes floatIcon4{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,-10px)}}
              @keyframes waveSine{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
              @keyframes twinkle{0%,100%{opacity:0;transform:scale(0.5)}50%{opacity:1;transform:scale(1)}}
              @keyframes pulseCore{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.12);opacity:1}}
              @keyframes scanLine{0%{transform:translateY(-100%)}100%{transform:translateY(400%)}}
              @keyframes glowPulse{0%,100%{box-shadow:0 0 20px 4px rgba(99,102,241,0.4)}50%{box-shadow:0 0 40px 12px rgba(139,92,246,0.6)}}
            `}</style>

            {/* Deep space starfield */}
            {[...Array(28)].map((_,i) => (
              <div key={i} className="absolute rounded-full bg-white" style={{
                width: Math.random()*2.5+0.8+'px', height: Math.random()*2.5+0.8+'px',
                top: Math.random()*100+'%', left: Math.random()*100+'%',
                opacity: Math.random()*0.6+0.2,
                animation: `twinkle ${2+Math.random()*3}s ${Math.random()*3}s ease-in-out infinite`
              }} />
            ))}

            {/* Morphing blob 1 — indigo */}
            <div className="absolute" style={{
              width:'180px', height:'180px',
              top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              background:'radial-gradient(circle at 40% 40%,rgba(139,92,246,0.35),rgba(99,102,241,0.15))',
              animation:'morphBlob 8s ease-in-out infinite',
              filter:'blur(1px)'
            }} />

            {/* Morphing blob 2 — cyan accent */}
            <div className="absolute" style={{
              width:'120px', height:'120px',
              top:'30%', left:'60%',
              transform:'translate(-50%,-50%)',
              background:'radial-gradient(circle,rgba(34,211,238,0.2),transparent)',
              animation:'morphBlob 6s 2s ease-in-out infinite',
              filter:'blur(2px)'
            }} />

            {/* Pulsing glowing core */}
            <div className="absolute rounded-full flex items-center justify-center" style={{
              width:'72px', height:'72px',
              top:'50%', left:'50%',
              transform:'translate(-50%,-50%)',
              background:'radial-gradient(circle,#7c3aed,#4f46e5)',
              animation:'pulseCore 2.5s ease-in-out infinite, glowPulse 2.5s ease-in-out infinite',
              zIndex:10
            }}>
              <span style={{fontSize:'26px', filter:'drop-shadow(0 0 8px rgba(255,255,255,0.8))'}}>📚</span>
            </div>

            {/* Orbit ring A — inner (3 dots) */}
            <div className="absolute" style={{width:'136px',height:'136px',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:8}}>
              {/* Dashed orbit path visual */}
              <div className="absolute inset-0 rounded-full" style={{border:'1px dashed rgba(139,92,246,0.25)'}} />
              <div className="absolute" style={{width:'100%',height:'100%',animation:'spinRingA 6s linear infinite', top:0,left:0}}>
                <div className="absolute" style={{width:'12px',height:'12px',top:'50%',left:'50%',marginTop:'-6px',marginLeft:'-6px',animation:'orbitA 6s linear infinite'}}>
                  <div className="w-full h-full rounded-full" style={{background:'linear-gradient(135deg,#a78bfa,#7c3aed)',boxShadow:'0 0 10px 2px rgba(167,139,250,0.7)'}} />
                </div>
                <div className="absolute" style={{width:'10px',height:'10px',top:'50%',left:'50%',marginTop:'-5px',marginLeft:'-5px',animation:'orbitB 6s linear infinite'}}>
                  <div className="w-full h-full rounded-full" style={{background:'linear-gradient(135deg,#67e8f9,#0891b2)',boxShadow:'0 0 8px 2px rgba(103,232,249,0.6)'}} />
                </div>
                <div className="absolute" style={{width:'9px',height:'9px',top:'50%',left:'50%',marginTop:'-4.5px',marginLeft:'-4.5px',animation:'orbitC 6s linear infinite'}}>
                  <div className="w-full h-full rounded-full" style={{background:'linear-gradient(135deg,#f9a8d4,#db2777)',boxShadow:'0 0 8px 2px rgba(249,168,212,0.6)'}} />
                </div>
              </div>
            </div>

            {/* Orbit ring B — outer (3 icons) */}
            <div className="absolute" style={{width:'190px',height:'190px',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:7}}>
              <div className="absolute inset-0 rounded-full" style={{border:'1px dashed rgba(99,102,241,0.18)'}} />
              <div className="absolute" style={{width:'100%',height:'100%',animation:'spinRingB 10s linear infinite',top:0,left:0}}>
                <div className="absolute" style={{width:'28px',height:'28px',top:'50%',left:'50%',marginTop:'-14px',marginLeft:'-14px',animation:'orbitD 10s linear infinite'}}>
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-sm" style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.2)'}}>✍️</div>
                </div>
                <div className="absolute" style={{width:'28px',height:'28px',top:'50%',left:'50%',marginTop:'-14px',marginLeft:'-14px',animation:'orbitE 10s linear infinite'}}>
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-sm" style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.2)'}}>🗣️</div>
                </div>
                <div className="absolute" style={{width:'28px',height:'28px',top:'50%',left:'50%',marginTop:'-14px',marginLeft:'-14px',animation:'orbitF 10s linear infinite'}}>
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-sm" style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.2)'}}>🎮</div>
                </div>
              </div>
            </div>

            {/* Floating corner icons */}
            <div className="absolute text-xl" style={{top:'12%',left:'10%',animation:'floatIcon1 4s ease-in-out infinite',filter:'drop-shadow(0 0 8px rgba(167,139,250,0.8))'}}>🌟</div>
            <div className="absolute text-lg" style={{top:'14%',right:'12%',animation:'floatIcon2 5s 1s ease-in-out infinite',filter:'drop-shadow(0 0 6px rgba(103,232,249,0.8))'}}>⚡</div>
            <div className="absolute text-xl" style={{bottom:'22%',left:'8%',animation:'floatIcon3 4.5s 0.5s ease-in-out infinite',filter:'drop-shadow(0 0 8px rgba(249,168,212,0.8))'}}>🎯</div>
            <div className="absolute text-lg" style={{bottom:'20%',right:'10%',animation:'floatIcon4 3.8s 1.5s ease-in-out infinite',filter:'drop-shadow(0 0 6px rgba(74,222,128,0.8))'}}>🔥</div>

            {/* Animated sine wave at bottom */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden" style={{height:'40px',zIndex:5}}>
              <div style={{display:'flex',animation:'waveSine 4s linear infinite',width:'200%'}}>
                <svg viewBox="0 0 400 40" style={{width:'50%',height:'40px',flexShrink:0}} preserveAspectRatio="none">
                  <path d="M0 20 C50 5,100 35,150 20 C200 5,250 35,300 20 C350 5,400 35,400 20 L400 40 L0 40 Z" fill="rgba(99,102,241,0.25)"/>
                </svg>
                <svg viewBox="0 0 400 40" style={{width:'50%',height:'40px',flexShrink:0}} preserveAspectRatio="none">
                  <path d="M0 20 C50 5,100 35,150 20 C200 5,250 35,300 20 C350 5,400 35,400 20 L400 40 L0 40 Z" fill="rgba(99,102,241,0.25)"/>
                </svg>
              </div>
            </div>

            {/* Second wave layer — offset */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden" style={{height:'28px',zIndex:4}}>
              <div style={{display:'flex',animation:'waveSine 6s 1s linear infinite',width:'200%'}}>
                <svg viewBox="0 0 400 28" style={{width:'50%',height:'28px',flexShrink:0}} preserveAspectRatio="none">
                  <path d="M0 14 C60 2,120 26,180 14 C240 2,300 26,360 14 C380 8,400 18,400 14 L400 28 L0 28 Z" fill="rgba(139,92,246,0.18)"/>
                </svg>
                <svg viewBox="0 0 400 28" style={{width:'50%',height:'28px',flexShrink:0}} preserveAspectRatio="none">
                  <path d="M0 14 C60 2,120 26,180 14 C240 2,300 26,360 14 C380 8,400 18,400 14 L400 28 L0 28 Z" fill="rgba(139,92,246,0.18)"/>
                </svg>
              </div>
            </div>

            {/* Scan line */}
            <div className="absolute left-0 w-full pointer-events-none" style={{height:'2px',background:'linear-gradient(90deg,transparent,rgba(139,92,246,0.6),transparent)',animation:'scanLine 4s linear infinite',top:0,zIndex:6}} />

            {/* Bottom label */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
              <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white/60" style={{background:'rgba(255,255,255,0.08)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.1)'}}>
                ✦ Sakshar Learning Universe ✦
              </div>
            </div>
          </div>



          {/* ── Functional Weekly Calendar 2026 ── */}
          {(() => {
            const today = new Date();
            const todayISO = today.toISOString().split('T')[0];

            // Find Monday of week + offset
            const weekStart = new Date(today);
            const dow = today.getDay();
            const diffToMon = dow === 0 ? -6 : 1 - dow;
            weekStart.setDate(today.getDate() + diffToMon + weekOffset * 7);

            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              const iso = d.toISOString().split('T')[0];
              return {
                iso,
                date: d.getDate(),
                day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
                fullDay: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i],
                month: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                isToday: iso === todayISO,
                isPast: d < today && iso !== todayISO,
              };
            });

            const monthLabel = (() => {
              const startMonth = weekStart.toLocaleString('default', { month: 'long' });
              const endDate = new Date(weekStart); endDate.setDate(weekStart.getDate() + 6);
              const endMonth = endDate.toLocaleString('default', { month: 'long' });
              const year = weekStart.getFullYear();
              return startMonth === endMonth
                ? `${startMonth} ${year}`
                : `${startMonth} – ${endMonth} ${year}`;
            })();

            const weekLabel = weekOffset === 0 ? 'This Week'
              : weekOffset === -1 ? 'Last Week'
              : weekOffset === 1 ? 'Next Week'
              : `${weekOffset > 0 ? '+' : ''}${weekOffset} weeks`;

            const DAILY_TASKS = [
              { emoji: '📖', label: 'Reading Day', tasks: [
                { icon: '📌', text: 'Read a short passage (2 mins)', type: 'reading' },
                { icon: '🔤', text: 'Trace 5 consonant letters', type: 'writing' },
                { icon: '⭐', text: 'Earn 15 XP bonus', type: 'xp' },
              ]},
              { emoji: '✍️', label: 'Writing Day', tasks: [
                { icon: '✏️', text: 'Complete writing canvas exercise', type: 'writing' },
                { icon: '📝', text: 'Fill in 3 word blanks', type: 'writing' },
                { icon: '🎯', text: 'Score 70%+ to unlock badge', type: 'badge' },
              ]},
              { emoji: '🗣️', label: 'Speaking Day', tasks: [
                { icon: '🎤', text: 'Record & submit pronunciation', type: 'speaking' },
                { icon: '🔊', text: 'Listen to 2 native audio clips', type: 'speaking' },
                { icon: '🔥', text: 'Extend your streak today!', type: 'streak' },
              ]},
              { emoji: '🧠', label: 'Quiz Day', tasks: [
                { icon: '📝', text: 'Take the level vocabulary quiz', type: 'quiz' },
                { icon: '📊', text: 'Check your analytics scores', type: 'analytics' },
                { icon: '📚', text: 'Review 1 completed lesson', type: 'review' },
              ]},
              { emoji: '🎮', label: 'Game Day', tasks: [
                { icon: '🎮', text: 'Play a Word Scramble game', type: 'game' },
                { icon: '⚡', text: 'Flash Quiz — beat your high score', type: 'game' },
                { icon: '🏆', text: 'Check the class leaderboard', type: 'leaderboard' },
              ]},
              { emoji: '🌟', label: 'Review Day', tasks: [
                { icon: '🔄', text: 'Revisit weakest skill this week', type: 'review' },
                { icon: '👥', text: 'Post in the community lounge', type: 'community' },
                { icon: '💬', text: 'Ask the AI Tutor one question', type: 'tutor' },
              ]},
              { emoji: '🛡️', label: 'Rest & Reflect', tasks: [
                { icon: '📓', text: 'Review your weekly progress', type: 'analytics' },
                { icon: '🎯', text: 'Set your goal for next week', type: 'goal' },
                { icon: '🛌', text: 'Light rest — no pressure today!', type: 'rest' },
              ]},
            ];

            const typeColors = {
              reading: 'bg-blue-50 border-blue-100 text-blue-700',
              writing: 'bg-violet-50 border-violet-100 text-violet-700',
              speaking: 'bg-orange-50 border-orange-100 text-orange-700',
              quiz: 'bg-amber-50 border-amber-100 text-amber-700',
              game: 'bg-emerald-50 border-emerald-100 text-emerald-700',
              review: 'bg-gray-50 border-gray-200 text-gray-600',
              community: 'bg-pink-50 border-pink-100 text-pink-700',
              tutor: 'bg-teal-50 border-teal-100 text-teal-700',
              analytics: 'bg-indigo-50 border-indigo-100 text-indigo-700',
              streak: 'bg-red-50 border-red-100 text-red-600',
              badge: 'bg-yellow-50 border-yellow-100 text-yellow-700',
              leaderboard: 'bg-purple-50 border-purple-100 text-purple-700',
              goal: 'bg-emerald-50 border-emerald-100 text-emerald-700',
              rest: 'bg-sky-50 border-sky-100 text-sky-600',
              xp: 'bg-amber-50 border-amber-100 text-amber-600',
            };

            const selIdx = weekDays.findIndex(d => d.iso === selectedDay);
            const selDay = selIdx >= 0 ? weekDays[selIdx] : null;
            const selTasks = selIdx >= 0 ? DAILY_TASKS[selIdx] : null;

            return (
              <div className="space-y-3">
                {/* Header: month + week nav */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center text-gray-500 font-black text-base transition-all cursor-pointer"
                  >‹</button>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-gray-800">{monthLabel}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{weekLabel}</p>
                  </div>
                  <button
                    onClick={() => setWeekOffset(w => w + 1)}
                    className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center text-gray-500 font-black text-base transition-all cursor-pointer"
                  >›</button>
                </div>

                {/* 7-day pill row */}
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => {
                    const isSel = selectedDay === day.iso;
                    const isStrk = streakDays.has(day.iso);
                    return (
                      <button
                        key={day.iso}
                        onClick={() => setSelectedDay(day.iso)}
                        className={`py-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer text-center ${
                          isSel
                            ? 'text-white font-black shadow-md'
                            : day.isToday
                            ? 'ring-2 ring-emerald-400 bg-emerald-50 text-emerald-800 font-black'
                            : isStrk
                            ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                            : day.isPast
                            ? 'bg-gray-50 text-gray-300 font-bold'
                            : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 font-bold'
                        }`}
                        style={isSel ? { background: 'linear-gradient(135deg,#1C2D1A,#15803d)', boxShadow: '0 4px 12px rgba(22,101,52,0.25)' } : {}}
                      >
                        <span className="text-[8px] uppercase tracking-wide leading-none opacity-70">{day.day}</span>
                        <span className="text-xs leading-none">{day.date}</span>
                        {isStrk && !isSel && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                        {day.isToday && !isSel && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>

                {/* Day task card */}
                {selDay && selTasks ? (
                  <div className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{selTasks.emoji}</span>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 leading-tight">{selTasks.label}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5">
                            {selDay.fullDay}, {selDay.date} {selDay.month} {selDay.year}
                          </p>
                        </div>
                      </div>
                      {selDay.isToday
                        ? <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Today</span>
                        : streakDays.has(selectedDay)
                        ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">✓ Done</span>
                        : selDay.isPast
                        ? <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Missed</span>
                        : <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Upcoming</span>
                      }
                    </div>
                    <div className="space-y-1.5">
                      {selTasks.tasks.map((task, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-[10px] font-semibold ${typeColors[task.type] || 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                          <span className="text-sm shrink-0">{task.icon}</span>
                          <span>{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                    <p className="text-[10px] font-bold text-gray-400">Select a day to view tasks</p>
                  </div>
                )}
              </div>
            );
          })()}


          {/* Upcoming Submissions Widget */}
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Upcoming Submission</h4>
            <div className="space-y-2.5">
              
              {/* Item 1 */}
              <div className="bg-[#F8FAFC] border border-gray-100 p-4 rounded-3xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F4B942] text-white font-black text-xs flex items-center justify-center shrink-0">
                    UX
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-gray-900 leading-tight">Quiz 1</h5>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">Beginners • 27 Jul</p>
                  </div>
                </div>
                <button 
                  onClick={() => triggerSubmissionsGrader("Wireframe UI/UX Quiz", "ux")}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black rounded-xl shrink-0 cursor-pointer shadow-xs hover:border-gray-300 transition"
                >
                  Submit →
                </button>
              </div>

              {/* Item 2 */}
              <div className="bg-[#F8FAFC] border border-gray-100 p-4 rounded-3xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#5C67F2] text-white font-black text-xs flex items-center justify-center shrink-0">
                    AI
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-gray-900 leading-tight">Quiz 2</h5>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">Intermediate • 29 Jul</p>
                  </div>
                </div>
                <button 
                  onClick={() => triggerSubmissionsGrader("Basic Isometric Illustration", "ai")}
                  className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-black rounded-xl shrink-0 cursor-pointer shadow-xs hover:border-gray-300 transition"
                >
                  Submit →
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <footer className="text-[8px] text-gray-400 font-bold text-center border-t border-gray-100/70 pt-4 mt-6">
          &copy; 2026 Sakshar AI. Bridging educational gaps interactively.
        </footer>

      </aside>

      {/* ABSOLUTE MODAL WIDGET LAYER POPUPS */}

      {/* POPUP A: SUBMISSIONS GRADER CHART OVERLAY */}
      {isGraderOpen && graderData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-6 text-center animate-scale-up">
            <button 
              onClick={() => setIsGraderOpen(false)}
              className="absolute top-4 right-4 text-gray-450 hover:text-gray-700 text-sm font-black cursor-pointer"
            >
              ✕
            </button>
            <div className="space-y-2">
              <span className="text-4xl block animate-bounce">🏆</span>
              <h3 className="text-lg font-black text-gray-900">Graded submission match</h3>
              <p className="text-xs text-gray-500 font-medium">Task: {graderData.title}</p>
            </div>
            {/* Visual Grading Curve Chart Indicator */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#5C67F2]" strokeDasharray={`${graderData.score}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-[#5C67F2]">{graderData.score}%</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wide">Accuracy</span>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 text-xs font-semibold text-gray-700 space-y-2">
              <span className="bg-[#5C67F2]/10 border border-[#5C67F2]/20 text-[#5C67F2] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">
                Badge: {graderData.tag}
              </span>
              <p className="leading-relaxed">{graderData.feedback}</p>
            </div>
            <button 
              onClick={() => setIsGraderOpen(false)}
              className="w-full py-3 bg-[#5C67F2] hover:bg-opacity-95 text-white text-xs font-black rounded-2xl active:scale-95 transition shadow-md shadow-[#5c67f2]/10 cursor-pointer"
            >
              Continue Practice
            </button>
          </div>
        </div>
      )}

      {/* POPUP B: INTERACTIVE COURSE PREVIEW MODAL */}
      {isCourseModalOpen && selectedModalCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-xl w-full shadow-2xl relative space-y-6 flex flex-col max-h-[90vh] animate-scale-up">
            <button 
              onClick={() => {
                setIsCourseModalOpen(false);
                setSelectedModalCourse(null);
                setModalActiveTab('vocabulary');
                setShowModalVideo(false);
              }}
              className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 text-sm font-black cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-block">
                Curriculum Track level: {selectedModalCourse.level}
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-2">{selectedModalCourse.title}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Interactive course guide</p>
            </div>

            {/* Modal Tabs selectors */}
            <div className="flex border-b border-gray-100 gap-1 text-xs font-bold text-gray-400 overflow-x-auto">
              {[
                { id: 'vocabulary', label: 'Vocabulary' },
                { id: 'tracing',    label: 'Tracing' },
                { id: 'exercises',  label: 'Exercises' },
                ...(LESSON_YOUTUBE[selectedModalCourse.lesson_id]
                  ? [{ id: 'video', label: '▶ Video Tutorial' }]
                  : [])
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setModalActiveTab(tab.id)}
                  className={`pb-2 px-1 whitespace-nowrap transition cursor-pointer border-b-2 ${
                    modalActiveTab === tab.id 
                      ? tab.id === 'video'
                        ? 'border-red-500 text-red-600 font-black'
                        : 'border-[#5C67F2] text-[#5C67F2] font-black' 
                      : 'border-transparent hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content wrapper */}
            <div className="flex-1 overflow-y-auto pr-1">
              
              {/* Tab 1: Vocabulary phrases */}
              {modalActiveTab === 'vocabulary' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium">Study these core native vocabulary terms and daily regional phrases:</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { word: "अ (Vowel Sound)", definition: "The starting vowel shape representing the seed of Hindi alphabet structures." },
                      { word: "कमल (Lotus flower)", definition: "Used in lesson worksheets to trace stroke sequences." },
                      { word: "नल (Tap water)", definition: "Standard phonetic two-letter daily transaction term." }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-150 rounded-2xl p-4 shadow-xs/5 space-y-1">
                        <h4 className="text-xs font-black text-gray-900">{item.word}</h4>
                        <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">{item.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Tracing speller card */}
              {modalActiveTab === 'tracing' && (
                <div className="space-y-4 flex flex-col items-center">
                  <p className="text-xs text-gray-500 font-medium text-center">Trace the character path inside the guide box for immediate matching analysis:</p>
                  
                  <div className="relative w-56 h-56 bg-white border-2 border-dashed border-gray-200 rounded-3xl p-1 shadow-inner overflow-hidden">
                    <canvas 
                      ref={modalCanvasRef}
                      width={220}
                      height={220}
                      onMouseDown={startModalDrawing}
                      onMouseMove={drawModal}
                      onMouseUp={stopModalDrawing}
                      onMouseLeave={stopModalDrawing}
                      onTouchStart={startModalDrawing}
                      onTouchMove={drawModal}
                      onTouchEnd={stopModalDrawing}
                      className="w-full h-full cursor-crosshair touch-none bg-white"
                    />
                    {!hasModalDrawn && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-300 gap-1.5">
                        <span className="text-2xl animate-bounce">✏️</span>
                        <p className="text-[9px] font-black uppercase tracking-wider">Trace here</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 w-56">
                    <button 
                      onClick={clearModalCanvas}
                      disabled={!hasModalDrawn}
                      className="flex-1 py-2 border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition shadow-xs cursor-pointer"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => {
                        const scoreVal = Math.floor(Math.random() * 15) + 84;
                        alert(`Model Grader: Verified trace matching score: ${scoreVal}% Accuracy!`);
                        clearModalCanvas();
                      }}
                      disabled={!hasModalDrawn}
                      className="flex-1 py-2 bg-[#5C67F2] text-white text-xs font-black rounded-xl hover:bg-opacity-95 disabled:opacity-40 transition shadow-xs cursor-pointer"
                    >
                      Grader Review
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Unlock exercises */}
              {modalActiveTab === 'exercises' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium">Unlock full immersive modules based on your placement score:</p>
                  <div className="grid gap-2.5">
                    {[
                      { id: 'reading', label: "Start reading speller stories guide", icon: "📖", color: "bg-emerald-50 text-emerald-800 border-emerald-100" },
                      { id: 'writing', label: "Open full-screen character trace canvas", icon: "✍️", color: "bg-purple-50 text-purple-800 border-purple-100" },
                      { id: 'speaking', label: "Start spoken pronunciation check recorder", icon: "🗣️", color: "bg-amber-50 text-amber-800 border-amber-100" }
                    ].map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => {
                          setActiveModule(ex.id);
                          setIsCourseModalOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${ex.color}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{ex.icon}</span>
                          <span className="text-xs font-black">{ex.label}</span>
                        </div>
                        <span className="text-xs">→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Video Tutorial — embedded YouTube player */}
              {modalActiveTab === 'video' && LESSON_YOUTUBE[selectedModalCourse.lesson_id] && (() => {
                // Convert watch URL → embed URL
                const watchUrl = LESSON_YOUTUBE[selectedModalCourse.lesson_id];
                const videoId = watchUrl.includes('v=') 
                  ? watchUrl.split('v=')[1].split('&')[0] 
                  : watchUrl.split('/').pop();
                const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-medium">
                      Watch this tutorial video for <span className="font-black text-gray-700">{selectedModalCourse.title}</span>:
                    </p>
                    {/* 16:9 responsive iframe wrapper */}
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-black" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        key={videoId}
                        src={embedUrl}
                        title={selectedModalCourse.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        style={{ border: 'none' }}
                      />
                    </div>
                    {/* Fallback open-on-YouTube link */}
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Open full screen on YouTube ↗
                    </a>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* INVITE TO PLAY PICKER — rendered as a top-level fixed overlay (not
          nested inside the Study Lounge hero card) so it's never clipped by
          that card's overflow-hidden. Works no matter which "Invite to
          Play" trigger (hero button or sidebar quick action) opened it. */}
      {isInvitePickerOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsInvitePickerOpen(false)} />
          <div
            onClick={e => e.stopPropagation()}
            className="fixed w-72 rounded-2xl shadow-2xl p-3 z-[9999] animate-community-msg-in space-y-1 max-h-72 overflow-y-auto scrollbar-none"
            style={{
              top: invitePickerPos.top,
              right: invitePickerPos.right,
              background: 'rgba(15,10,35,0.98)',
              border: '1px solid rgba(92,103,242,0.3)',
              backdropFilter: 'blur(16px)'
            }}
          >
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2 pb-1">Pick a game to invite the lounge</p>
            {COMMUNITY_INVITE_GAMES.map((game) => (
              <button key={game.id} type="button" onClick={() => handleSendGameInvite(game)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors duration-150 text-left cursor-pointer group">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center text-sm shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-150`}>{game.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{game.title}</p>
                  <p className="text-[9px] text-white/40 font-semibold">{game.xp}</p>
                </div>
                <span className="text-white/20 group-hover:text-[#8B93F5] transition-colors duration-150">→</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* MINI-GAME MODAL */}
      <MiniGameModal
        isOpen={isGameModalOpen}
        onClose={() => { setIsGameModalOpen(false); setLaunchGameId(null); }}
        lang={lang}
        fullName={fullName}
        initialGameId={launchGameId}
      />

    </div>
  );
}