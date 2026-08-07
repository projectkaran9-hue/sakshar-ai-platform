import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ============================================================================
   GAME CATALOG
   ============================================================================ */
const STUDY_GAMES = [
  {
    id: 'letter-trace',
    emoji: '✍️',
    name: 'Letter Tracing Race',
    desc: 'Trace alphabet characters against the clock and build muscle memory for handwriting.',
    type: 'Writing',
    color: '#5C67F2'
  },
  {
    id: 'word-scramble',
    emoji: '🔤',
    name: 'Word Scramble',
    desc: 'Rearrange jumbled letters to form valid words before time runs out.',
    type: 'Vocabulary',
    color: '#f7bd49'
  },
  {
    id: 'picture-match',
    emoji: '🖼️',
    name: 'Picture Word Match',
    desc: 'Match everyday images to their correct written word to sharpen recognition.',
    type: 'Reading',
    color: '#FF85A2'
  },
  {
    id: 'sentence-builder',
    emoji: '🧩',
    name: 'Sentence Builder',
    desc: 'Drag word pieces into place to construct grammatically correct sentences.',
    type: 'Writing',
    color: '#5C67F2'
  },
  {
    id: 'sound-hunt',
    emoji: '🔊',
    name: 'Sound Hunt',
    desc: 'Listen to a spoken word and pick the letter or syllable that matches the sound.',
    type: 'Speaking',
    color: '#F4B942'
  },
  {
    id: 'reading-sprint',
    emoji: '📖',
    name: 'Reading Sprint',
    desc: 'Read short local-language passages quickly and answer comprehension questions.',
    type: 'Reading',
    color: '#FF85A2'
  }
];

/* ============================================================================
   GAME CONTENT BANKS (self-contained — no external assets required)
   ============================================================================ */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const WORD_BANK = ['APPLE', 'HOUSE', 'TABLE', 'WATER', 'HAPPY', 'LIGHT', 'PLANT', 'CHAIR', 'PAPER', 'MONEY'];

const PICTURE_ITEMS = [
  { emoji: '🍎', word: 'APPLE' },
  { emoji: '🐘', word: 'ELEPHANT' },
  { emoji: '🚗', word: 'CAR' },
  { emoji: '☀️', word: 'SUN' },
  { emoji: '📕', word: 'BOOK' },
  { emoji: '🐶', word: 'DOG' },
  { emoji: '🏠', word: 'HOUSE' },
  { emoji: '🌳', word: 'TREE' },
  { emoji: '⭐', word: 'STAR' },
  { emoji: '🐟', word: 'FISH' }
];

const SENTENCE_BANK = [
  'THE SUN IS BRIGHT',
  'SHE READS A BOOK',
  'WE WALK TO SCHOOL',
  'THE DOG RUNS FAST',
  'I DRINK CLEAN WATER',
  'HE WRITES HIS NAME'
];

const READING_PASSAGE = {
  title: 'The Field of Gold',
  paragraphs: [
    'A small seed rests quietly inside the deep earth. When the soft rains fall, it slowly wakes up and pushes through the dark soil.',
    'With a little sunshine every day, the tiny green stem grows tall and strong. Soon, it becomes a beautiful field of golden wheat.'
  ],
  questions: [
    {
      q: 'What wakes the seed up?',
      options: ['Loud noise', 'Soft rain', 'Strong wind', 'Cold snow'],
      correct: 'Soft rain'
    },
    {
      q: 'What does the stem need to grow tall and strong?',
      options: ['Darkness', 'Sunshine every day', 'Deep snow', 'Salt water'],
      correct: 'Sunshine every day'
    },
    {
      q: 'What does the field become in the end?',
      options: ['A pile of rocks', 'A golden wheat field', 'A dry desert', 'A pond'],
      correct: 'A golden wheat field'
    }
  ]
};

const LANG_SPEECH_CODES = {
  english: 'en-US',
  hindi: 'hi-IN',
  bengali: 'bn-IN',
  punjabi: 'pa-IN'
};

/* ============================================================================
   HELPERS
   ============================================================================ */
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word) {
  let letters = word.split('');
  let attempt = shuffleArray(letters);
  // Avoid accidentally "scrambling" into the original word when possible
  let guard = 0;
  while (attempt.join('') === word && guard < 6) {
    attempt = shuffleArray(letters);
    guard++;
  }
  return attempt;
}

function pickDistractors(pool, correct, count) {
  const others = pool.filter((w) => w !== correct);
  return shuffleArray(others).slice(0, count);
}

/* ============================================================================
   SHARED UI PIECES
   ============================================================================ */
function GameShell({ title, emoji, color, round, totalRounds, score, timeLeft, onExit, children }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#1C2D1A] transition cursor-pointer"
        >
          ← Exit Game
        </button>
        <div className="flex items-center gap-3">
          {typeof timeLeft === 'number' && (
            <span
              className={`text-xs font-black px-3 py-1.5 rounded-full ${
                timeLeft <= 5 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600'
              }`}
            >
              ⏱ {timeLeft}s
            </span>
          )}
          <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#1C2D1A]/5 text-[#1C2D1A]">
            ⭐ {score}
          </span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: `${color}1A` }}
          >
            {emoji}
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">{title}</h2>
            {totalRounds && (
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Round {round} of {totalRounds}
              </p>
            )}
          </div>
        </div>

        {totalRounds && (
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 mb-8 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(round / totalRounds) * 100}%`, backgroundColor: color }}
            />
          </div>
        )}
        {!totalRounds && <div className="mb-6" />}

        {children}
      </div>
    </div>
  );
}

function ResultsScreen({ game, score, maxScore, onPlayAgain, onBackToGames }) {
  const pct = Math.round((score / maxScore) * 100);
  const message = pct >= 80 ? "Outstanding work! 🎉" : pct >= 50 ? "Nice progress — keep going!" : "Good try — practice makes perfect!";

  return (
    <div className="w-full max-w-2xl mx-auto text-center">
      <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
          style={{ backgroundColor: `${game.color}1A` }}
        >
          {game.emoji}
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">{message}</h2>
        <p className="text-sm text-gray-500 font-medium mb-8">{game.name} — session complete</p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-[#FBFBFA] border border-gray-100 rounded-2xl px-6 py-4">
            <p className="text-2xl font-black text-gray-900">{score}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Points</p>
          </div>
          <div className="bg-[#FBFBFA] border border-gray-100 rounded-2xl px-6 py-4">
            <p className="text-2xl font-black" style={{ color: game.color }}>{pct}%</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Accuracy</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-[#1C2D1A] text-white font-bold text-sm rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer"
          >
            Play Again
          </button>
          <button
            onClick={onBackToGames}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:border-gray-300 transition cursor-pointer"
          >
            Back to Games
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   GAME 1 — LETTER TRACING RACE (canvas drawing)
   ============================================================================ */
function LetterTraceGame({ game, onExit }) {
  const TOTAL_ROUNDS = 6;
  const ROUND_SECONDS = 12;

  const [sequence] = useState(() => shuffleArray(ALPHABET).slice(0, TOTAL_ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [finished, setFinished] = useState(false);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const currentLetter = sequence[round];

  const drawGuide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 220px sans-serif';
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLetter, canvas.width / 2, canvas.height / 2 + 10);
  }, [currentLetter]);

  useEffect(() => {
    drawGuide();
    setHasDrawn(false);
    setTimeLeft(ROUND_SECONDS);
  }, [round, drawGuide]);

  useEffect(() => {
    if (finished) return;
    if (timeLeft <= 0) {
      advanceRound(hasDrawn);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished]);

  const advanceRound = (earnedPoint) => {
    setScore((s) => s + (earnedPoint ? 20 : 0));
    if (round + 1 >= TOTAL_ROUNDS) {
      setFinished(true);
    } else {
      setRound((r) => r + 1);
    }
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((clientY - rect.top) / rect.height) * canvasRef.current.height
    };
  };

  const startDraw = (e) => {
    isDrawingRef.current = true;
    lastPointRef.current = getPos(e);
  };
  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.strokeStyle = '#1C2D1A';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    if (!hasDrawn) setHasDrawn(true);
  };
  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => drawGuide();
  const handleDone = () => advanceRound(hasDrawn);

  if (finished) {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={TOTAL_ROUNDS * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
      score={score}
      timeLeft={timeLeft}
      onExit={onExit}
    >
      <p className="text-sm text-gray-500 font-medium mb-4 text-center">
        Trace the letter <span className="font-black text-gray-900">{currentLetter}</span> inside the box below
      </p>
      <div className="flex justify-center mb-6">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="rounded-2xl border border-gray-200 touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={handleClear}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:border-gray-300 transition cursor-pointer"
        >
          Clear
        </button>
        <button
          onClick={handleDone}
          className="px-6 py-2.5 bg-[#1C2D1A] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer"
        >
          Done Tracing →
        </button>
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME 2 — WORD SCRAMBLE
   ============================================================================ */
function WordScrambleGame({ game, onExit }) {
  const TOTAL_ROUNDS = 5;
  const ROUND_SECONDS = 25;

  const [words] = useState(() => shuffleArray(WORD_BANK).slice(0, TOTAL_ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [built, setBuilt] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [letters, setLetters] = useState(() => scrambleWord(words[0]));

  const currentWord = words[round];

  useEffect(() => {
    setLetters(scrambleWord(words[round]));
    setBuilt([]);
    setFeedback(null);
    setTimeLeft(ROUND_SECONDS);
  }, [round, words]);

  useEffect(() => {
    if (finished || feedback) return;
    if (timeLeft <= 0) {
      handleReveal(false);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, feedback]);

  const handleLetterClick = (idx) => {
    if (feedback) return;
    setBuilt((b) => [...b, letters[idx]]);
    setLetters((l) => l.filter((_, i) => i !== idx));
  };

  const handleUndo = () => {
    if (feedback || built.length === 0) return;
    const last = built[built.length - 1];
    setBuilt((b) => b.slice(0, -1));
    setLetters((l) => [...l, last]);
  };

  const handleReveal = (auto) => {
    const isCorrect = built.join('') === currentWord;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore((s) => s + 20);
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 1000);
  };

  const handleSubmit = () => {
    if (built.length !== currentWord.length) return;
    handleReveal(false);
  };

  if (finished) {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={TOTAL_ROUNDS * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
      score={score}
      timeLeft={timeLeft}
      onExit={onExit}
    >
      <div className="p-4 bg-[#FBFBFA] border border-dashed border-gray-200 rounded-xl min-h-[64px] flex items-center justify-center gap-2 mb-6 flex-wrap">
        {built.map((letter, idx) => (
          <span key={idx} className="bg-[#1C2D1A] text-white w-10 h-10 flex items-center justify-center rounded-lg font-extrabold text-sm shadow-sm">
            {letter}
          </span>
        ))}
        {built.length === 0 && <span className="text-gray-400 text-xs font-medium">Tap letters below to build the word...</span>}
      </div>

      {feedback && (
        <p className={`text-center text-sm font-bold mb-4 ${feedback === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
          {feedback === 'correct' ? `Correct! It was ${currentWord} 🎉` : `Not quite — it was ${currentWord}`}
        </p>
      )}

      <div className="flex justify-center gap-2 flex-wrap mb-6">
        {letters.map((letter, idx) => (
          <button
            key={idx}
            onClick={() => handleLetterClick(idx)}
            disabled={!!feedback}
            className="bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-30 w-11 h-11 rounded-xl font-bold shadow-sm text-sm cursor-pointer"
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleUndo}
          disabled={!!feedback || built.length === 0}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:border-gray-300 disabled:opacity-30 transition cursor-pointer"
        >
          Undo
        </button>
        <button
          onClick={handleSubmit}
          disabled={!!feedback || built.length !== currentWord.length}
          className="px-6 py-2.5 bg-[#1C2D1A] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition shadow-sm cursor-pointer"
        >
          Submit
        </button>
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME 3 — PICTURE WORD MATCH
   ============================================================================ */
function PictureMatchGame({ game, onExit }) {
  const TOTAL_ROUNDS = Math.min(6, PICTURE_ITEMS.length);
  const ROUND_SECONDS = 12;

  const [items] = useState(() => shuffleArray(PICTURE_ITEMS).slice(0, TOTAL_ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);

  const current = items[round];

  useEffect(() => {
    const distractors = pickDistractors(PICTURE_ITEMS.map((p) => p.word), current.word, 3);
    setOptions(shuffleArray([current.word, ...distractors]));
    setSelected(null);
    setTimeLeft(ROUND_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (finished || selected) return;
    if (timeLeft <= 0) {
      handleSelect(null);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, selected]);

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option || '__timeout__');
    if (option === current.word) setScore((s) => s + 20);
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 900);
  };

  if (finished) {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={TOTAL_ROUNDS * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
      score={score}
      timeLeft={timeLeft}
      onExit={onExit}
    >
      <div className="text-8xl text-center mb-8">{current.emoji}</div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrectAnswer = option === current.word;
          const showState = selected && (option === selected || isCorrectAnswer);
          let stateClasses = 'border-gray-200 bg-[#FBFBFA] hover:border-gray-300';
          if (showState) {
            stateClasses = isCorrectAnswer
              ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700'
              : 'border-red-400 bg-red-50/60 text-red-600';
          }
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={!!selected}
              className={`p-4 rounded-xl border text-sm font-bold transition ${stateClasses}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME 4 — SENTENCE BUILDER
   ============================================================================ */
function SentenceBuilderGame({ game, onExit }) {
  const TOTAL_ROUNDS = Math.min(5, SENTENCE_BANK.length);
  const ROUND_SECONDS = 25;

  const [sentences] = useState(() => shuffleArray(SENTENCE_BANK).slice(0, TOTAL_ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [built, setBuilt] = useState([]);
  const [pool, setPool] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const currentSentence = sentences[round];
  const targetWords = currentSentence.split(' ');

  useEffect(() => {
    setPool(shuffleArray(targetWords));
    setBuilt([]);
    setFeedback(null);
    setTimeLeft(ROUND_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (finished || feedback) return;
    if (timeLeft <= 0) {
      handleCheck(true);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, feedback]);

  const handlePick = (idx) => {
    if (feedback) return;
    setBuilt((b) => [...b, pool[idx]]);
    setPool((p) => p.filter((_, i) => i !== idx));
  };

  const handleUndo = () => {
    if (feedback || built.length === 0) return;
    const last = built[built.length - 1];
    setBuilt((b) => b.slice(0, -1));
    setPool((p) => [...p, last]);
  };

  const handleCheck = () => {
    const isCorrect = built.join(' ') === currentSentence;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore((s) => s + 20);
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 1100);
  };

  if (finished) {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={TOTAL_ROUNDS * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
      score={score}
      timeLeft={timeLeft}
      onExit={onExit}
    >
      <p className="text-sm text-gray-500 font-medium mb-4 text-center">Tap the words in the right order to build the sentence</p>

      <div className="p-4 bg-[#FBFBFA] border border-dashed border-gray-200 rounded-xl min-h-[64px] flex items-center justify-center gap-2 mb-4 flex-wrap">
        {built.map((word, idx) => (
          <span key={idx} className="bg-[#1C2D1A] text-white px-3 py-1.5 rounded-lg font-extrabold text-sm shadow-sm">
            {word}
          </span>
        ))}
        {built.length === 0 && <span className="text-gray-400 text-xs font-medium">Your sentence will appear here...</span>}
      </div>

      {feedback && (
        <p className={`text-center text-sm font-bold mb-4 ${feedback === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
          {feedback === 'correct' ? 'Correct! 🎉' : `Correct order: ${currentSentence}`}
        </p>
      )}

      <div className="flex justify-center gap-2 flex-wrap mb-6">
        {pool.map((word, idx) => (
          <button
            key={idx}
            onClick={() => handlePick(idx)}
            disabled={!!feedback}
            className="bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-30 px-4 py-2.5 rounded-xl font-bold shadow-sm text-sm cursor-pointer"
          >
            {word}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleUndo}
          disabled={!!feedback || built.length === 0}
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:border-gray-300 disabled:opacity-30 transition cursor-pointer"
        >
          Undo
        </button>
        <button
          onClick={() => handleCheck()}
          disabled={!!feedback || built.length !== targetWords.length}
          className="px-6 py-2.5 bg-[#1C2D1A] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 disabled:opacity-40 transition shadow-sm cursor-pointer"
        >
          Check Sentence
        </button>
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME 5 — SOUND HUNT (Web Speech API text-to-speech)
   ============================================================================ */
function SoundHuntGame({ game, onExit, lang }) {
  const TOTAL_ROUNDS = 6;
  const ROUND_SECONDS = 15;
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [words] = useState(() => shuffleArray(WORD_BANK).slice(0, TOTAL_ROUNDS));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);

  const currentWord = words[round];

  useEffect(() => {
    const distractors = pickDistractors(WORD_BANK, currentWord, 3);
    setOptions(shuffleArray([currentWord, ...distractors]));
    setSelected(null);
    setTimeLeft(ROUND_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (finished || selected) return;
    if (timeLeft <= 0) {
      handleSelect(null);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, finished, selected]);

  const playSound = () => {
    if (!speechSupported) return;
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = LANG_SPEECH_CODES[lang] || 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option || '__timeout__');
    if (option === currentWord) setScore((s) => s + 20);
    setTimeout(() => {
      if (round + 1 >= TOTAL_ROUNDS) {
        setFinished(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 900);
  };

  if (finished) {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={TOTAL_ROUNDS * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={round + 1}
      totalRounds={TOTAL_ROUNDS}
      score={score}
      timeLeft={timeLeft}
      onExit={onExit}
    >
      <div className="flex flex-col items-center mb-8">
        <button
          onClick={playSound}
          disabled={!speechSupported}
          className="w-20 h-20 rounded-full bg-[#1C2D1A] text-white text-3xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-40 cursor-pointer"
        >
          🔊
        </button>
        <p className="text-xs text-gray-400 font-medium mt-3">
          {speechSupported ? 'Tap to hear the word' : 'Audio not supported in this browser'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isCorrectAnswer = option === currentWord;
          const showState = selected && (option === selected || isCorrectAnswer);
          let stateClasses = 'border-gray-200 bg-[#FBFBFA] hover:border-gray-300';
          if (showState) {
            stateClasses = isCorrectAnswer
              ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700'
              : 'border-red-400 bg-red-50/60 text-red-600';
          }
          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={!!selected}
              className={`p-4 rounded-xl border text-sm font-bold transition ${stateClasses}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME 6 — READING SPRINT
   ============================================================================ */
function ReadingSprintGame({ game, onExit }) {
  const READING_SECONDS = 40;
  const [phase, setPhase] = useState('reading'); // reading -> quiz -> done
  const [timeLeft, setTimeLeft] = useState(READING_SECONDS);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);

  const questions = READING_PASSAGE.questions;

  useEffect(() => {
    if (phase !== 'reading') return;
    if (timeLeft <= 0) {
      setPhase('quiz');
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, phase]);

  const handleAnswer = (option) => {
    if (selected) return;
    setSelected(option);
    if (option === questions[qIndex].correct) setScore((s) => s + 20);
    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        setPhase('done');
      } else {
        setQIndex((q) => q + 1);
        setSelected(null);
      }
    }, 900);
  };

  if (phase === 'done') {
    return (
      <ResultsScreen
        game={game}
        score={score}
        maxScore={questions.length * 20}
        onPlayAgain={() => window.location.reload()}
        onBackToGames={onExit}
      />
    );
  }

  if (phase === 'reading') {
    return (
      <GameShell
        title={game.name}
        emoji={game.emoji}
        color={game.color}
        score={score}
        timeLeft={timeLeft}
        onExit={onExit}
      >
        <h3 className="text-lg font-black text-gray-900 mb-4 text-center">{READING_PASSAGE.title}</h3>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed font-medium mb-8">
          {READING_PASSAGE.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <button
          onClick={() => setPhase('quiz')}
          className="w-full py-3 px-4 bg-[#1C2D1A] text-white font-bold text-sm rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer"
        >
          I'm Done Reading → Start Quiz
        </button>
      </GameShell>
    );
  }

  const current = questions[qIndex];
  return (
    <GameShell
      title={game.name}
      emoji={game.emoji}
      color={game.color}
      round={qIndex + 1}
      totalRounds={questions.length}
      score={score}
      onExit={onExit}
    >
      <h3 className="text-base font-bold text-gray-900 mb-6 text-center">{current.q}</h3>
      <div className="space-y-3">
        {current.options.map((option) => {
          const isCorrectAnswer = option === current.correct;
          const showState = selected && (option === selected || isCorrectAnswer);
          let stateClasses = 'border-gray-200 bg-[#FBFBFA] hover:border-gray-300';
          if (showState) {
            stateClasses = isCorrectAnswer
              ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700'
              : 'border-red-400 bg-red-50/60 text-red-600';
          }
          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!selected}
              className={`w-full p-4 rounded-xl border text-left text-sm font-semibold transition ${stateClasses}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}

/* ============================================================================
   GAME HUB (main export)
   ============================================================================ */
export default function Premium({ fullName, onBack, onSelectGame, lang = 'english' }) {
  const [activeGameId, setActiveGameId] = useState(null);

  const activeGame = STUDY_GAMES.find((g) => g.id === activeGameId);

  const handlePlay = (gameId) => {
    setActiveGameId(gameId);
    if (onSelectGame) onSelectGame(gameId);
  };

  const handleExitGame = () => setActiveGameId(null);

  const renderActiveGame = () => {
    switch (activeGame.id) {
      case 'letter-trace':
        return <LetterTraceGame game={activeGame} onExit={handleExitGame} />;
      case 'word-scramble':
        return <WordScrambleGame game={activeGame} onExit={handleExitGame} />;
      case 'picture-match':
        return <PictureMatchGame game={activeGame} onExit={handleExitGame} />;
      case 'sentence-builder':
        return <SentenceBuilderGame game={activeGame} onExit={handleExitGame} />;
      case 'sound-hunt':
        return <SoundHuntGame game={activeGame} onExit={handleExitGame} lang={lang} />;
      case 'reading-sprint':
        return <ReadingSprintGame game={activeGame} onExit={handleExitGame} />;
      default:
        return null;
    }
  };

  if (activeGame) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-[#1C2D1A] p-6 flex flex-col items-center">
        <div className="w-full max-w-5xl">{renderActiveGame()}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1C2D1A] p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">

        {/* Back navigation */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#1C2D1A] transition mb-8 cursor-pointer"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center space-y-3 mb-12">
          <span className="inline-flex items-center gap-2 bg-[#5C67F2]/10 border border-[#5C67F2]/20 text-[#5C67F2] px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            🎮 Game for you
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
            {fullName ? `Pick a game, ${fullName.split(' ')[0]}` : 'Pick a study game'}
          </h1>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            Practice reading, writing, and speaking through short, playful games designed around your lessons.
          </p>
        </div>

        {/* Game cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STUDY_GAMES.map((game) => (
            <div
              key={game.id}
              className="group bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${game.color}1A` }}
              >
                {game.emoji}
              </div>

              <span
                className="inline-block text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 self-start"
                style={{ backgroundColor: `${game.color}1A`, color: game.color }}
              >
                {game.type}
              </span>

              <h3 className="text-base font-black text-gray-900 mb-1.5">{game.name}</h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed flex-1">{game.desc}</p>

              <button
                onClick={() => handlePlay(game.id)}
                className="w-full mt-6 py-2.5 px-4 bg-[#1C2D1A] text-white font-bold text-xs rounded-xl hover:bg-opacity-90 transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                Play Now
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}