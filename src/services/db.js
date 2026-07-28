import { supabase } from './supabase'; // Imports initialized client from your file structure

/**
 * Creates or updates the user profile record inside public.profiles
 */
export const createUserProfile = async (uid, profileData) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: uid,
      name: profileData.fullName,             // Aligned to SQL 'name'
      email: profileData.email,               // Aligned to SQL 'email'
      language: profileData.nativeLanguage,   // Aligned to SQL 'language'
      educational_level: profileData.literacyLevel, // Aligned to SQL 'educational_level'
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error("Error creating user profile schema database record:", error.message);
    throw error;
  }
  return data;
};

/**
 * Pulls profile information (Streak details, Name, Native Dialect) for the Dashboard
 */
export const fetchUserProfile = async (uid) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error) {
    console.error("Error fetching user profile data metadata block:", error.message);
    return null;
  }
  return data;
};

/**
 * Updates the profile in the public.profiles database table.
 */
export const updateUserProfileTable = async (uid, profileData) => {
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
    console.error("Error updating user profile database record:", error.message);
    throw error;
  }
  return data;
};