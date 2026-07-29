import { supabase } from './supabase';

/**
 * Creates or updates the user profile record inside public.profiles
 */
export const createUserProfile = async (uid, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        name: profileData.fullName,
        email: profileData.email,
        language: profileData.nativeLanguage || profileData.language || 'english',
        educational_level: profileData.literacyLevel || profileData.educationalLevel || 'none',
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn("Notice updating public.profiles DB table:", error.message);
    }
    return data;
  } catch (err) {
    console.warn("DB profile sync skipped (local mode active):", err.message);
    return null;
  }
};

/**
 * Pulls profile information for the Dashboard
 */
export const fetchUserProfile = async (uid) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      console.warn("Notice fetching profile metadata:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("DB profile fetch skipped (local mode active):", err.message);
    return null;
  }
};

/**
 * Updates the profile in the public.profiles database table.
 */
export const updateUserProfileTable = async (uid, profileData) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: profileData.fullName,
        language: profileData.language,
        educational_level: profileData.educationalLevel,
        age: profileData.age !== undefined ? Number(profileData.age) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', uid);

    if (error) {
      console.warn("Notice updating profiles table:", error.message);
    }
    return data;
  } catch (err) {
    console.warn("DB profile update skipped (local mode active):", err.message);
    return null;
  }
};