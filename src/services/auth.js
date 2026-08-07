import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Parses default database error returns to present clean, readable messages 
 * downstream to the interface's dynamic error state.
 */
const handleAuthError = (error) => {
  if (!error) return new Error('Authentication failed. Please try again.');
  if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || error.status === 0) {
    return new Error('Unable to reach Supabase Auth server. Try Demo Sign In or check your Vercel Environment Variables.');
  }
  if (error.message?.includes('Email not confirmed')) {
    return new Error('Email not verified. Please check your inbox and verify your email address before logging in.');
  }
  if (error.message?.includes('User already registered') || error.status === 422) {
    return new Error('This email address is already registered.');
  }
  if (error.message?.includes('Invalid login credentials')) {
    return new Error('Incorrect email or password. Please try again.');
  }
  return error;
};

/**
 * Helper to generate a local session object when Supabase URL is placeholder or unreachable.
 */
const createLocalSession = (email, fullName = '', language = 'english', educationalLevel = 'none') => {
  const localId = `local-${Date.now()}`;
  const sessionData = {
    user: { id: localId, email: email || 'learner@sakshar.ai' },
    fullName: fullName || (email ? email.split('@')[0] : 'Sakshar Learner'),
    language,
    educationalLevel,
    tutorVoiceUri: '',
    initialAssessmentCompleted: false,
    isDemoSession: true
  };
  try {
    localStorage.setItem('sakshar_demo_user', JSON.stringify(sessionData));
  } catch (e) {}
  return sessionData;
};

/**
 * Registers a new learner and passes their name/language options 
 * downstream to Supabase, with automatic local fallback.
 */
export const signUpUser = async (email, password, fullName, preferredLanguage, educationalLevel) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          language: preferredLanguage,
          educationalLevel: educationalLevel || 'none',
        },
      },
    });

    if (error) throw error;

    const metadata = data?.user?.user_metadata || {};
    const needsEmailVerification = !data?.session && data?.user && !data?.user?.email_confirmed_at;

    return {
      ...data,
      needsEmailVerification: !!needsEmailVerification,
      fullName: metadata.name || fullName,
      language: metadata.language || preferredLanguage,
      educationalLevel: metadata.educationalLevel || educationalLevel || 'none',
      tutorVoiceUri: '',
      initialAssessmentCompleted: false
    };
  } catch (error) {
    // If Supabase fetch fails (e.g. env vars missing on Vercel), auto-fallback to local session
    if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || error.status === 0) {
      console.warn('[Auth] Supabase Auth endpoint unreachable during signup. Creating local demo session.');
      return createLocalSession(email, fullName, preferredLanguage, educationalLevel);
    }
    throw handleAuthError(error);
  }
};

/**
 * Authenticates an existing user via email and password, with local demo fallback.
 */
export const signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const metadata = data?.user?.user_metadata || {};
    return {
      ...data,
      fullName: metadata.name || (email ? email.split('@')[0] : 'Learner'),
      language: metadata.language || 'english',
      educationalLevel: metadata.educationalLevel || 'none',
      tutorVoiceUri: metadata.tutorVoiceUri || '',
      initialAssessmentCompleted: !!metadata.initial_assessment_completed
    };
  } catch (error) {
    // If Supabase fetch fails (e.g. missing Vercel env variables or network error), fallback gracefully to demo session
    if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || error.status === 0) {
      console.warn('[Auth] Supabase Auth endpoint unreachable during login. Logging in via local session mode.');
      return createLocalSession(email);
    }
    throw handleAuthError(error);
  }
};

/**
 * Terminates the active session context.
 */
export const signOutUser = async () => {
  try {
    localStorage.removeItem('sakshar_demo_user');
    await supabase.auth.signOut().catch(() => {});
  } catch (error) {
    console.warn('[Auth] Signout notice:', error);
  }
};

/**
 * Initiates Google OAuth sign-in via Supabase.
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;

    if (data?.url) {
      window.location.href = data.url;
      return data;
    }
    return data;
  } catch (error) {
    console.warn('[Auth] Supabase Google OAuth notice:', error.message);
    return createLocalSession('google.user@sakshar.ai', 'Google Learner');
  }
};

/**
 * Pulls the metadata and session status of the currently authenticated active session.
 */
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured) {
    const savedDemo = localStorage.getItem('sakshar_demo_user');
    if (savedDemo) {
      try {
        const demo = JSON.parse(savedDemo);
        return {
          id: demo.user.id,
          email: demo.user.email,
          fullName: demo.fullName,
          language: demo.language,
          educationalLevel: demo.educationalLevel,
          initialAssessmentCompleted: demo.initialAssessmentCompleted
        };
      } catch (e) {}
    }
    return null;
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (user) {
      const metadata = user.user_metadata || {};
      return {
        ...user,
        fullName: metadata.name || '',
        language: metadata.language || 'english',
        educationalLevel: metadata.educationalLevel || 'none',
        tutorVoiceUri: metadata.tutorVoiceUri || '',
        initialAssessmentCompleted: !!metadata.initial_assessment_completed
      };
    }
  } catch (error) {
    // Fallback to local demo session if stored
    const savedDemo = localStorage.getItem('sakshar_demo_user');
    if (savedDemo) {
      try {
        const demo = JSON.parse(savedDemo);
        return {
          id: demo.user.id,
          email: demo.user.email,
          fullName: demo.fullName,
          language: demo.language,
          educationalLevel: demo.educationalLevel,
          initialAssessmentCompleted: demo.initialAssessmentCompleted
        };
      } catch (e) {}
    }
  }

  // Check saved demo user as primary fallback
  const savedDemo = localStorage.getItem('sakshar_demo_user');
  if (savedDemo) {
    try {
      const demo = JSON.parse(savedDemo);
      return {
        id: demo.user.id,
        email: demo.user.email,
        fullName: demo.fullName,
        language: demo.language,
        educationalLevel: demo.educationalLevel,
        initialAssessmentCompleted: demo.initialAssessmentCompleted
      };
    } catch (e) {}
  }
  return null;
};

/**
 * Updates the user's auth metadata.
 */
export const updateUserAuthProfile = async (fullName, language, educationalLevel, age, tutorVoiceUri) => {
  try {
    const updatePayload = {
      name: fullName,
      language: language,
      educationalLevel: educationalLevel,
    };
    if (age !== undefined && age !== '') {
      updatePayload.age = Number(age);
    }
    if (tutorVoiceUri !== undefined) {
      updatePayload.tutorVoiceUri = tutorVoiceUri;
    }
    const { data, error } = await supabase.auth.updateUser({
      data: updatePayload
    });
    if (error) throw error;

    // Also update local demo session if present
    const savedDemo = localStorage.getItem('sakshar_demo_user');
    if (savedDemo) {
      try {
        const demo = JSON.parse(savedDemo);
        demo.fullName = fullName;
        demo.language = language;
        demo.educationalLevel = educationalLevel;
        localStorage.setItem('sakshar_demo_user', JSON.stringify(demo));
      } catch (e) {}
    }
    return data;
  } catch (error) {
    // Safe return if in local session mode
    return { fullName, language, educationalLevel };
  }
};

/**
 * Verifies a user's signup via 6-digit OTP token or link callback.
 */
export const verifyUserEmailOTP = async (email, token) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Resends the email verification message to the user.
 */
export const resendVerificationEmail = async (email) => {
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    throw handleAuthError(error);
  }
};
