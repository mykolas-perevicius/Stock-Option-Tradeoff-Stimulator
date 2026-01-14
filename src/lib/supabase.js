import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client only if credentials are configured
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!supabase;
};

// Auth helpers
export const signUp = async (email, password) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback) => {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
};

// API Keys helpers
export const getUserApiKeys = async (userId) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('provider, api_key')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
};

export const saveUserApiKey = async (userId, provider, apiKey) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('user_api_keys')
    .upsert(
      { user_id: userId, provider, api_key: apiKey, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' }
    );

  if (error) throw error;
};

export const deleteUserApiKey = async (userId, provider) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw error;
};

// User preferences helpers
export const getUserPreferences = async (userId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
};

export const saveUserPreferences = async (userId, preferences) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: userId, ...preferences, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
};
