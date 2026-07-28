import React, { useState } from 'react';
import { supabase } from '../services/supabase';

// Mock layout data matching your Phase 2 project requirements
const ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    type: 'mcq',
    question: 'Choose the correct word for the image of an "Apple":',
    options: ['Aple', 'Apple', 'Appl', 'Apeel'],
    correct: 'Apple',
    weight: 30
  },
  {
    id: 2,
    type: 'rearrange',
    question: 'Arrange these letters to form a valid word: P, A, L, P, E',
    letters: ['P', 'A', 'L', 'P', 'E'],
    correct: 'APPLE',
    weight: 30
  },
  {
    id: 3,
    type: 'comprehension',
    question: 'Read this sentence: "The sun rises in the east." What does it mean?',
    options: [
      'It is getting dark outside.',
      'Morning is beginning.',
      'It is raining heavily.',
      'The moon is shining.'
    ],
    correct: 'Morning is beginning.',
    weight: 40
  }
];

export default function Assessment({ userId, onAssessmentComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [scrambledOrder, setScrambledOrder] = useState([]);
  const [runningScore, setRunningScore] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentQuestion = ASSESSMENT_QUESTIONS[currentStep];

  // Handles text selections
  const handleOptionSelect = (option) => {
    setSelectedAnswer(option);
  };

  // Handles adding pieces for the scrambled structural module
  const handleLetterClick = (letter) => {
    if (!scrambledOrder.includes(letter)) {
      setScrambledOrder([...scrambledOrder, letter]);
    }
  };

  const handleClearScramble = () => setScrambledOrder([]);

  const handleNextStep = async () => {
    let isCorrect = false;

    // Evaluate answer parameters based on current question block type
    if (currentQuestion.type === 'mcq' || currentQuestion.type === 'comprehension') {
      if (selectedAnswer === currentQuestion.correct) isCorrect = true;
    } else if (currentQuestion.type === 'rearrange') {
      if (scrambledOrder.join('') === currentQuestion.correct) isCorrect = true;
    }

    const pointsEarned = isCorrect ? currentQuestion.weight : 0;
    const directUpdatedScore = runningScore + pointsEarned;
    setRunningScore(directUpdatedScore);

    // Reset temporary layout selections
    setSelectedAnswer('');
    setScrambledOrder([]);

    if (currentStep < ASSESSMENT_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final processing: Save results to Supabase (Phases 2 & 3)
      await finalizeAssessmentResults(directUpdatedScore);
    }
  };

  const finalizeAssessmentResults = async (finalScore) => {
    setLoading(true);
    try {
      // Phase 3 Skill Evaluation thresholds
      let assignedLevel = 'Beginner';
      if (finalScore >= 30 && finalScore <= 60) assignedLevel = 'Intermediate';
      if (finalScore > 60) assignedLevel = 'Advanced';

      // 1. Insert snapshot metrics inside assessment_results
      const { error: resultError } = await supabase
        .from('assessment_results')
        .insert([
          {
            user_id: userId,
            score: finalScore,
            evaluated_level: assignedLevel
          }
        ]);

      if (resultError) throw resultError;

      // 2. Update core user profile table level criteria
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ level: assignedLevel })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Run dashboard redirect callback thread
      if (onAssessmentComplete) {
        onAssessmentComplete(assignedLevel, finalScore);
      }
    } catch (err) {
      console.error('Error saving baseline metrics summary:', err.message);
      alert('Failed to lock in your score parameters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1C2D1A] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-sm max-w-xl w-full">
        
        {/* Progress tracker metadata layout element */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Initial Assessment Baseline</span>
          <span className="text-xs font-extrabold bg-[#1C2D1A]/5 px-2.5 py-1 rounded-md text-[#1C2D1A]">
            Step {currentStep + 1} of {ASSESSMENT_QUESTIONS.length}
          </span>
        </div>

        <div className="w-full bg-gray-100 h-1.5 rounded-full mb-8 overflow-hidden">
          <div 
            className="bg-emerald-600 h-1.5 transition-all duration-300" 
            style={{ width: `${((currentStep + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }}
          />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-6">{currentQuestion.question}</h3>

        {/* Dynamic step rendering layout block */}
        {currentQuestion.type === 'mcq' || currentQuestion.type === 'comprehension' ? (
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                className={`w-full p-4 rounded-xl border text-left text-sm font-semibold transition ${
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
            <div className="p-4 bg-[#FBFBFA] border border-dashed border-gray-200 rounded-xl min-h-[60px] flex items-center justify-center gap-2">
              {scrambledOrder.map((letter, idx) => (
                <span key={idx} className="bg-[#1C2D1A] text-white px-3 py-1.5 rounded-lg font-extrabold text-sm shadow-sm">
                  {letter}
                </span>
              ))}
              {scrambledOrder.length === 0 && <span className="text-gray-400 text-xs font-medium">Click letters below to construct your answer word...</span>}
            </div>

            <div className="flex justify-center gap-3">
              {currentQuestion.letters.map((letter, index) => (
                <button
                  key={index}
                  disabled={scrambledOrder.includes(letter)}
                  onClick={() => handleLetterClick(letter)}
                  className="bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-30 p-3 rounded-xl font-bold shadow-sm text-sm w-12 text-center"
                >
                  {letter}
                </button>
              ))}
            </div>

            {scrambledOrder.length > 0 && (
              <button onClick={handleClearScramble} className="text-xs text-red-500 font-bold underline block mx-auto">
                Clear Layout Selection
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleNextStep}
          disabled={loading || (currentQuestion.type !== 'rearrange' && !selectedAnswer) || (currentQuestion.type === 'rearrange' && scrambledOrder.length === 0)}
          className="w-full mt-8 py-3 px-4 bg-[#1C2D1A] text-white font-bold text-sm rounded-xl hover:bg-opacity-95 disabled:opacity-40 transition shadow-sm"
        >
          {loading ? 'Processing Score Profile...' : currentStep === ASSESSMENT_QUESTIONS.length - 1 ? 'Submit Assessment' : 'Continue to Next Question'}
        </button>

      </div>
    </div>
  );
}