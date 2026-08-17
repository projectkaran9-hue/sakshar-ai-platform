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

/* ════════════════ GLOBAL APP SETTINGS CLOUD SYNC ════════════════ */

export const saveSystemConfigDB = async (configKey, configValue) => {
  try {
    // 1. Save to LocalStorage for instant offline access
    try {
      localStorage.setItem(`sakshar_${configKey}`, JSON.stringify(configValue));
    } catch (e) {}
    
    // 2. Save to Supabase Cloud DB table 'app_settings' if configured
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('app_settings')
        .upsert({
          key: configKey,
          value: configValue,
          updated_at: new Date().toISOString()
        });
    }
  } catch (err) {
    console.warn('[DB] saveSystemConfigDB notice:', err);
  }
};

export const fetchSystemConfigDB = async (configKey, defaultFallback) => {
  try {
    // 1. Attempt to load from Supabase Cloud DB first using maybeSingle() (prevents PGRST116 PostgREST 406 errors)
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', configKey)
        .maybeSingle();
        
      if (!error && data?.value) {
        try { localStorage.setItem(`sakshar_${configKey}`, JSON.stringify(data.value)); } catch {}
        return data.value;
      }
    }
  } catch (e) {}

  // 2. Fallback to LocalStorage
  try {
    const saved = localStorage.getItem(`sakshar_${configKey}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return defaultFallback;
};


/**
 * Helper to register a new user account into local persistence registry
 */
export const registerAccountLocally = (email, fullName, language = 'english', educationalLevel = 'none', age = 12, uid = null) => {
  try {
    const existingStr = localStorage.getItem('sakshar_registered_accounts');
    let regList = existingStr ? JSON.parse(existingStr) : [];
    if (!Array.isArray(regList)) regList = [];
    
    const newRecord = {
      id: uid || `user-${Date.now()}`,
      email: email,
      name: fullName,
      fullName: fullName,
      language: language,
      educational_level: educationalLevel,
      educationalLevel: educationalLevel,
      age: age,
      created_at: new Date().toISOString()
    };

    const index = regList.findIndex(u => u.email && email && u.email.toLowerCase() === email.toLowerCase());
    if (index >= 0) {
      regList[index] = { ...regList[index], ...newRecord };
    } else {
      regList.push(newRecord);
    }

    localStorage.setItem('sakshar_registered_accounts', JSON.stringify(regList));
    return newRecord;
  } catch (e) {
    return null;
  }
};

/**
 * Checks if an account ALREADY EXISTS in Supabase profiles table or local account registry
 */
export const checkUserAccountExists = async (email, uid) => {
  // 1. Check Supabase profiles table
  if (isSupabaseConfigured) {
    try {
      if (uid) {
        const { data: pById } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (pById && pById.id) return pById;
      }
      if (email) {
        const { data: pByEmail } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
        if (pByEmail && pByEmail.id) return pByEmail;
      }
    } catch (e) {}
  }
  
  // 2. Check local registered accounts registry
  try {
    const regStr = localStorage.getItem('sakshar_registered_accounts');
    if (regStr) {
      const regList = JSON.parse(regStr);
      if (Array.isArray(regList)) {
        const found = regList.find(u => 
          (email && u.email && u.email.toLowerCase() === email.toLowerCase()) || 
          (uid && u.id === uid)
        );
        if (found) return found;
      }
    }
  } catch (e) {}

  // 3. Check demo user fallback
  try {
    const demo = localStorage.getItem('sakshar_demo_user');
    if (demo) {
      const parsed = JSON.parse(demo);
      if (parsed?.user?.email && email && parsed.user.email.toLowerCase() === email.toLowerCase()) {
        return {
          id: parsed.user.id,
          name: parsed.fullName,
          email: parsed.user.email,
          language: parsed.language,
          educational_level: parsed.educationalLevel
        };
      }
    }
  } catch (e) {}

  return null;
};
