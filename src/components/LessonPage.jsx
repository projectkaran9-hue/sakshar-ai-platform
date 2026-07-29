import React, { useState, useEffect } from 'react';
import { LESSON_YOUTUBE, getYouTubeEmbedUrl } from '../data/lessonVideos';
import { getQuizForLesson } from '../data/lessonQuizzes';

const PASS_SCORE = 70;

/**
 * LessonPage — a dedicated, full-page (non-modal) player for a single lesson.
 *
 * Flow: Video → Lecture Quiz → Automatic Mark-Complete.
 * The lesson is marked complete automatically the moment the quiz is passed
 * at PASS_SCORE% or higher — there is no manual "mark as done" step here.
 *
 * Props:
 *  - lessons: full ordered list of lessons in the current track
 *  - activeIndex: index of the lesson currently being viewed
 *  - completedLessons: Set of completed lesson_ids
 *  - onComplete(lessonId): called automatically once the quiz is passed
 *  - onNavigateIndex(newIndex): move the player to a different lesson
 *  - onBack(): return to the lesson list / roadmap
 */
const LessonPage = ({
  lessons = [],
  activeIndex,
  completedLessons = new Set(),
  onComplete,
  onNavigateIndex,
  onBack,
}) => {
  const total = lessons.length;
  const lesson = (activeIndex !== null && activeIndex !== undefined) ? lessons[activeIndex] : null;

  const [step, setStep] = useState('video'); // 'video' | 'quiz'
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // Whenever the learner moves to a different lesson, reset the player back to step 1.
  useEffect(() => {
    setStep('video');
    setAnswers({});
    setResult(null);
  }, [activeIndex]);

  if (!lesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <p className="text-sm font-bold text-gray-400">No lesson selected.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-[#1C2D1A] text-white text-xs font-black rounded-xl hover:bg-[#2c4429] transition cursor-pointer"
        >
          ← Back to Lessons
        </button>
      </div>
    );
  }

  const isDone = completedLessons.has(lesson.lesson_id);
  const watchUrl = LESSON_YOUTUBE[lesson.lesson_id];
  const embedUrl = getYouTubeEmbedUrl(watchUrl);
  const quizQuestions = getQuizForLesson(lesson);
  const hasQuiz = quizQuestions.length > 0;
  const isSubmitted = result !== null;
  const isPassed = isSubmitted && result.score >= PASS_SCORE;
  const allAnswered = Object.keys(answers).length >= quizQuestions.length;
  const hasNext = activeIndex < total - 1;

  const submitQuiz = () => {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correct) correct++;
    });
    const score = Math.round((correct / quizQuestions.length) * 100);
    const passed = score >= PASS_SCORE;
    setResult({ score, passed, correct, total: quizQuestions.length });

    // --- Automatic mark system ---
    // No manual toggle required: passing the quiz marks the lesson done right away.
    if (passed && !isDone) {
      onComplete(lesson.lesson_id);
    }
  };

  const markWatchedComplete = () => {
    // Fallback for lessons that have a video but no quiz bank yet.
    if (!isDone) onComplete(lesson.lesson_id);
  };

  const goToNextLesson = () => {
    if (hasNext) onNavigateIndex(activeIndex + 1);
    else onBack();
  };

  return (
    <div className="space-y-5 overflow-y-auto pr-0 sm:pr-1 scrollbar-none animate-fade-in flex-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="text-xs font-black text-gray-400 hover:text-gray-600 transition cursor-pointer flex items-center gap-1"
        >
          ← All Lessons
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-[#5C67F2] bg-[#5C67F2]/10 px-3 py-1 rounded-full">
          Lesson {activeIndex + 1} of {total}
        </span>
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{lesson.title}</h2>
        <p className="text-xs text-gray-400 font-medium mt-1">
          {step === 'video'
            ? 'Watch the video, then take the lecture quiz — passing marks this lesson complete automatically.'
            : `Score ${PASS_SCORE}%+ to complete this lesson and unlock the next one.`}
        </p>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider flex-wrap">
        <span className={`px-3 py-1.5 rounded-full border ${step === 'video' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
          ▶ 1. Video Lecture
        </span>
        <span className="text-gray-300">→</span>
        <span className={`px-3 py-1.5 rounded-full border ${step === 'quiz' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-300 border-gray-200'}`}>
          📝 2. Lecture Quiz
        </span>
        <span className="ml-auto px-3 py-1.5 rounded-full border bg-white text-[#5C67F2] border-[#5C67F2]/30 shadow-2xs">
          {isDone ? '✓ Node Completed' : '🔒 Quiz Required'}
        </span>
      </div>

      {/* Step 1: Video */}
      {step === 'video' && (
        <div className="space-y-4">
          {embedUrl ? (
            <div className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-black" style={{ paddingTop: '56.25%' }}>
              <iframe
                key={lesson.lesson_id}
                src={embedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
          ) : (
            <div className="text-center py-10 font-medium text-xs text-gray-400 border border-dashed border-gray-100 p-6 rounded-2xl bg-[#FBFBFA]">
              No video linked for this lesson yet.
            </div>
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

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={() => onNavigateIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              ← Previous
            </button>

            {hasQuiz ? (
              <button
                onClick={() => setStep('quiz')}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#5C67F2] to-[#7C3AED] text-white hover:opacity-95 transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>▶ Continue to Lecture Quiz</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                onClick={markWatchedComplete}
                disabled={isDone}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md cursor-pointer ${isDone ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                {isDone ? '✓ Completed' : '✓ Mark Watched & Complete'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Quiz */}
      {step === 'quiz' && hasQuiz && (
        <div className="space-y-4">
          {!isSubmitted ? (
            <div className="space-y-4">
              {quizQuestions.map((q, qIdx) => {
                const selectedOpt = answers[qIdx];
                return (
                  <div key={qIdx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
                    <p className="text-xs font-black text-gray-900 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <span>{q.question}</span>
                    </p>
                    <div className="grid grid-cols-1 gap-2 pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isChecked = selectedOpt === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                              isChecked
                                ? 'bg-[#5C67F2]/10 border-[#5C67F2] text-[#5C67F2] shadow-2xs'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span>{opt}</span>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isChecked ? 'bg-[#5C67F2] border-[#5C67F2] text-white font-black' : 'border-gray-300'
                            }`}>
                              {isChecked ? '✓' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={submitQuiz}
                disabled={!allAnswered}
                className="w-full py-3.5 bg-[#5C67F2] text-white text-xs font-black rounded-xl hover:bg-opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Submit Quiz for Grading</span>
                <span>➔</span>
              </button>
            </div>
          ) : (
            /* Auto-graded result + automatic mark-complete view */
            <div className="space-y-4 animate-pop-in">
              <div className={`p-5 rounded-2xl border text-center space-y-2 ${
                isPassed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="text-4xl">{isPassed ? '🎉' : '⚠️'}</div>
                <h4 className="text-base font-black">
                  {isPassed ? 'Passed! Marked Complete Automatically' : 'Quiz Not Passed'}
                </h4>
                <p className="text-2xl font-black">Score: {result.score}%</p>
                <p className="text-xs font-medium leading-relaxed">
                  {isPassed
                    ? `You answered ${result.correct} of ${result.total} questions correctly. This lesson has been auto-marked complete and the next lesson is unlocked.`
                    : `You answered ${result.correct} of ${result.total} questions correctly. A minimum of ${PASS_SCORE}% is required to unlock the next lesson.`
                  }
                </p>
              </div>

              {isPassed ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={goToNextLesson}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black rounded-xl hover:opacity-95 transition shadow-md flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    <span>{hasNext ? `🚀 Next Lesson: ${lessons[activeIndex + 1].title}` : '🏆 All Lessons Complete — Back to List'}</span>
                    <span>➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-2.5 border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 text-gray-700 cursor-pointer"
                  >
                    Close & View Lesson List
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAnswers({}); setResult(null); }}
                    className="flex-1 py-3 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition cursor-pointer"
                  >
                    🔄 Retry Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('video'); setAnswers({}); setResult(null); }}
                    className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl hover:bg-gray-200 transition cursor-pointer"
                  >
                    📺 Re-watch Video
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonPage;