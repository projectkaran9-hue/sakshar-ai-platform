import { supabase } from './supabase';

/**
 * Parses default database error returns to present clean, readable messages 
 * downstream to the interface's dynamic error state.
 */
const handleAuthError = (error) => {
  // Catch standard edge-cases for user-friendly interfaces
  if (error.message?.includes('User already registered') || error.status === 422) {
    return new Error('This email address is already registered.');
  }
  if (error.message?.includes('Invalid login credentials')) {
    return new Error('Incorrect email or password. Please try again.');
  }
  return error;
};

/**
 * Registers a new learner and passes their name/language options 
 * downstream to the Supabase Postgres trigger.
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
    return data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Authenticates an existing user via email and password.
 * Maps nested user_metadata to a flat, readable object for easy state consumption.
 */
export const signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;

    // Flatten and normalize the metadata keys for the frontend
    const metadata = data?.user?.user_metadata || {};
    return {
      ...data,
      fullName: metadata.name || '',
      language: metadata.language || 'english',
      educationalLevel: metadata.educationalLevel || 'none',
      tutorVoiceUri: metadata.tutorVoiceUri || '',
      initialAssessmentCompleted: !!metadata.initial_assessment_completed
    };
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Terminates the active session context.
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    throw error;
  }
};

/**
 * Initiates Google OAuth sign-in via Supabase.
 * Redirects the user to Google consent screen, then back to the app.
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
    return data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Pulls the metadata and session status of the currently authenticated active session.
 */
export const getCurrentUser = async () => {
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
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Updates the user's auth metadata (name, language, educationalLevel, tutorVoiceUri).
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
    return data;
  } catch (error) {
    throw error;
  }
};