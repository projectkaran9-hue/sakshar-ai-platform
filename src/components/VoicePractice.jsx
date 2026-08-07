import React, { useState, useEffect } from 'react';

export default function VoicePractice({ targetPhrase = "Apple", expectedLanguage = "en-US" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check browser compatibility for Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = expectedLanguage; // Handles regional tracks e.g., 'hi-IN', 'bn-IN'

      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      
      rec.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        setTranscript(spokenText);
        evaluatePronunciation(spokenText, targetPhrase);
      };

      setRecognition(rec);
    }
  }, [targetPhrase, expectedLanguage]);

  const toggleSpeechRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not fully supported on this browser browser version. Please try using Google Chrome!");
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      setTranscript('');
      setScore(null);
      setFeedback('');
      recognition.start();
    }
  };

  const evaluatePronunciation = (spoken, target) => {
    const cleanSpoken = spoken.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
    const cleanTarget = target.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();

    if (cleanSpoken === cleanTarget) {
      setScore(100);
      setFeedback("Flawless clarity! Excellent articulation.");
    } else {
      // Calculate basic string distance match overlap percentage
      const targetWords = cleanTarget.split(' ');
      const spokenWords = cleanSpoken.split(' ');
      const matches = targetWords.filter(word => spokenWords.includes(word)).length;
      const accuracyScore = Math.round((matches / targetWords.length) * 100);

      setScore(accuracyScore);
      if (accuracyScore >= 50) {
        setFeedback("Good attempt! A few sounds could be clearer. Try checking your syllable accent placement.");
      } else {
        setFeedback("Pronunciation pattern discrepancy. Click the microphone button to try pronouncing it again slowly.");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 tracking-tight text-sm">Voice Assessment Tracker</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-mono">
              AI Engine: {localStorage.getItem('sakshar_active_ai_engine') || 'Gemini 1.5 Flash'}
            </span>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              ● Failover Ready
            </span>
          </div>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{expectedLanguage}</span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-50">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Please Read This Phrase Out Loud:</p>
        <p className="text-2xl font-black text-[#1C2D1A] tracking-tight mt-1">{targetPhrase}</p>
      </div>

      <div className="flex flex-col items-center justify-center py-4">
        <button
          onClick={toggleSpeechRecording}
          className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl shadow-md transition transform active:scale-95 ${
            isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-[#1C2D1A] text-white hover:bg-opacity-90'
          }`}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>
        <p className="text-xs text-gray-500 font-medium mt-2">
          {isRecording ? 'Listening intently... Speak now.' : 'Click to begin microphone audio recording'}
        </p>
      </div>

      {transcript && (
        <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
          <p className="font-medium text-gray-500">What the AI Heard:</p>
          <p className="bg-gray-50 p-2.5 rounded-xl font-bold text-gray-800 italic">"{transcript}"</p>
        </div>
      )}

      {score !== null && (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-700">Pronunciation Accuracy:</span>
            <span className={`font-black text-sm ${score >= 75 ? 'text-green-600' : 'text-amber-600'}`}>{score}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${score >= 75 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${score}%` }}></div>
          </div>
          <p className="text-xs font-semibold text-gray-600 pt-1 leading-relaxed">💡 {feedback}</p>
        </div>
      )}
    </div>
  );
}