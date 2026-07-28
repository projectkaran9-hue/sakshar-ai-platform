import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { createUserProfile } from '../services/db';

export default function Register({ onNavigateToLogin, onAuthSuccess }) {
  // Form State Parameters matching image_0ecb60.jpg layout perfectly
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('english');
  
  // Explicitly tracked state for the newly added literacy section
  const [literacyLevel, setLiteracyLevel] = useState('Beginner');
  
  // Status Controllers
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'english', label: 'English (English)' },
    { code: 'hindi', label: 'हिन्दी (Hindi)' },
    { code: 'bengali', label: 'বাংলা (Bengali)' },
    { code: 'telugu', label: 'తెలుగు (Telugu)' },
    { code: 'punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { code: 'marathi', label: 'मराठी (Marathi)' },
    { code: 'tamil', label: 'தமிழ் (Tamil)' },
    { code: 'gujarati', label: 'ગુજરાતી (Gujarati)' },
    { code: 'kannada', label: 'ਕನ್ನಡ (Kannada)' },
    { code: 'malayalam', label: 'മലയാളം (Malayalam)' },
    { code: 'odia', label: 'ଓଡ଼ିଆ (Odia)' },
    { code: 'urdu', label: 'اُردُو (Urdu)' }
  ];

  // Dynamic track configurations mapped precisely to standard UI arrays
  const literacyOptions = [
    { id: 'Beginner', display: 'Early Learner (Learning letters/characters)' },
    { id: 'Intermediate', display: 'Functional Beginner (Constructing simple words)' },
    { id: 'Advanced', display: 'Independent Reader (Parsing short sentences)' }
  ];

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !email || !password || !age) {
      setErrorMsg('Please fill in all registration parameters.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }
    if (Number(age) < 1 || Number(age) > 120) {
      setErrorMsg('Please enter a valid age.');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData?.user) {
        await createUserProfile(authData.user.id, {
          fullName,
          email,
          age,
          nativeLanguage,
          literacyLevel
        });

        if (onAuthSuccess) {
          onAuthSuccess(authData.user, fullName, nativeLanguage, age);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected structural system error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white text-[#1C2D1A]">
      
      {/* Left split pane layout panel matching image_0ecb60.jpg */}
      <div className="relative md:w-1/2 bg-gray-900 hidden md:flex flex-col justify-end p-12 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply bg-black" />
        
        {/* Visual asset background layer */}
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('/path-to-your-book-image.jpg')" }} />

        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            Your journey to literacy starts here.
          </h1>
          <p className="text-gray-300 text-sm font-medium leading-relaxed">
            Create a profile to unlock voice practice assessments, real-time feedback, and adaptive daily reading lessons.
          </p>
        </div>
      </div>

      {/* Right form submission panel matching image_0ecb60.jpg styling */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 sm:px-12 md:w-1/2 bg-white">
        <div className="w-full max-w-sm space-y-6">
          
          {/* Header Brand Block */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="SaksharAI Logo" className="h-14 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight pt-2">Create your account</h2>
            <p className="text-xs text-gray-500 font-medium">Join our community and expand your learning horizons.</p>
          </div>

          {errorMsg && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form Content Stack */}
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs text-purple-700">👤</span> Full Name
              </label>
              <input 
                type="text" 
                required
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1C2D1A] transition text-gray-800" 
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs text-purple-400">✉️</span> Email Address
              </label>
              <input 
                type="email" 
                required
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1C2D1A] transition text-gray-800" 
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs text-amber-500">🔒</span> Password
              </label>
              <input 
                type="password" 
                required
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1C2D1A] transition text-gray-800" 
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs text-emerald-500">🎂</span> Age
              </label>
              <input 
                type="number" 
                required
                min="1"
                max="120"
                value={age} 
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1C2D1A] transition text-gray-800" 
                placeholder="Your age"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs text-blue-400">🌐</span> Preferred Native Language
              </label>
              <select 
                value={nativeLanguage} 
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#1C2D1A] transition font-medium text-gray-800 cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Verification Track Segment Row */}
            <div className="space-y-1.5">
              <label className="flex items-center text-xs font-bold text-gray-700 tracking-wide">
                <span className="mr-1.5 text-xs">📖</span> Current Literacy Track
              </label>
              <select 
                value={literacyLevel} 
                onChange={(e) => setLiteracyLevel(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#1C2D1A] transition font-medium text-gray-800 cursor-pointer"
              >
                {literacyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.display}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full pt-3 pb-3 bg-[#1C2D1A] text-white text-xs font-bold rounded-xl hover:bg-opacity-90 transition shadow-sm disabled:opacity-50 !mt-6"
            >
              {loading ? 'Creating Account...' : 'Create Account →'}
            </button>
          </form>

          {/* Alternative navigation routes */}
          <div className="text-center pt-2">
            <p className="text-xs font-medium text-gray-500">
              Already have an account?{' '}
              <button 
                onClick={onNavigateToLogin}
                className="text-gray-900 font-bold hover:underline ml-0.5"
              >
                Sign In
              </button>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
