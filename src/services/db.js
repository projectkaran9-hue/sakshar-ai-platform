import { supabase, isSupabaseConfigured } from './supabase';

const isDemoOrUnconfigured = (uid) => {
  if (!isSupabaseConfigured) return true;
  if (!uid || typeof uid !== 'string') return true;
  if (uid.startsWith('demo') || uid.includes('demo') || uid.startsWith('local-') || uid === 'guest') return true;
  return false;
};

/**
 * Creates or updates the user profile record inside public.profiles
 */
export const createUserProfile = async (uid, profileData) => {
  if (isDemoOrUnconfigured(uid)) return null;
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

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Pulls profile information for the Dashboard
 */
export const fetchUserProfile = async (uid) => {
  if (isDemoOrUnconfigured(uid)) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Updates the profile in the public.profiles database table.
 */
export const updateUserProfileTable = async (uid, profileData) => {
  if (isDemoOrUnconfigured(uid)) return null;
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

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

/* ════════════════ ADMIN DATABASE CONNECTIONS ════════════════ */

// Fetch all registered students from public.profiles
export const fetchAdminStudentsDB = async () => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;
    return data.map(p => ({
      id: p.id,
      name: p.name || p.full_name || 'Learner',
      email: p.email || 'learner@sakshar.ai',
      lang: p.language || 'Hindi',
      level: p.educational_level || 'Foundational',
      progress: p.progress || 85,
      score: p.score || 90,
      status: p.status || 'Active',
      joined: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
    }));
  } catch (err) {
    return null;
  }
};

// Insert a new student into public.profiles
export const insertStudentDB = async (student) => {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: student.id,
        name: student.name,
        email: student.email,
        language: student.lang,
        educational_level: student.level,
        created_at: new Date().toISOString()
      });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Delete student from public.profiles
export const deleteStudentDB = async (id) => {
  if (isDemoOrUnconfigured(id)) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Fetch courses from public.courses table
export const fetchAdminCoursesDB = async () => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*');

    if (error || !data) return null;
    return data;
  } catch (err) {
    return null;
  }
};

// Insert a new course into public.courses
export const insertCourseDB = async (course) => {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert(course);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Delete course from public.courses
export const deleteCourseDB = async (id) => {
  if (!isSupabaseConfigured) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Save evaluation to public.evaluations
export const saveEvaluationDB = async (uid, evalData) => {
  if (isDemoOrUnconfigured(uid)) return { data: null, error: null };
  try {
    const { data, error } = await supabase
      .from('evaluations')
      .insert({
        user_id: uid,
        lang: evalData.lang || 'english',
        score: evalData.score || 0,
        level: evalData.level || 'none',
        reasoning_score: evalData.reasoning_score || 0,
        target_item: evalData.target_item || 'Initial Placement Onboarding',
        created_at: new Date().toISOString()
      });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};
