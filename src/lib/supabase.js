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

// Simulation helpers
const LAST_STATE_NAME = '__last_state__';

/**
 * Get all user simulations (excluding auto-saved last state)
 */
export const getUserSimulations = async (userId) => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_simulations')
    .select('*')
    .eq('user_id', userId)
    .neq('name', LAST_STATE_NAME)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Get a specific simulation by name
 */
export const getSimulation = async (userId, name) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_simulations')
    .select('*')
    .eq('user_id', userId)
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Get the auto-saved last state
 */
export const getLastState = async (userId) => {
  return getSimulation(userId, LAST_STATE_NAME);
};

/**
 * Save a simulation (creates or updates)
 */
export const saveSimulation = async (userId, name, state) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('user_simulations')
    .upsert({
      user_id: userId,
      name,
      symbol: state.symbol || null,
      current_price: state.currentPrice,
      strike_price: state.strikePrice,
      days_to_expiry: state.daysToExpiry,
      market_iv: state.marketIV,
      risk_free_rate: state.riskFreeRate,
      investment_amount: state.investmentAmount,
      is_call: state.isCall,
      user_expected_move: state.userExpectedMove,
      axis_settings: state.axisSettings || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,name'
    });

  if (error) throw error;
};

/**
 * Auto-save the current state (debounced in component)
 */
export const saveLastState = async (userId, state) => {
  return saveSimulation(userId, LAST_STATE_NAME, state);
};

/**
 * Delete a simulation
 */
export const deleteSimulation = async (userId, name) => {
  if (!supabase) throw new Error('Supabase not configured');
  if (name === LAST_STATE_NAME) return; // Don't allow deleting auto-save

  const { error } = await supabase
    .from('user_simulations')
    .delete()
    .eq('user_id', userId)
    .eq('name', name);

  if (error) throw error;
};

/**
 * Convert database row to app state.
 *
 * `parseFloat(x) || default` was treating a legitimate `0` as falsy and
 * snapping it to the default — so a saved riskFreeRate of 0% reloaded as
 * 5%. Use Number.isFinite for the gate so zeros survive.
 *
 * Likewise `is_call !== false` quietly turned a NULL or undefined column
 * into `true`. If a future migration drops or renames the column, every
 * saved put would silently become a call. Treat null as null and let the
 * caller decide rather than guessing.
 */
const finite = (raw, fallback) => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
};
const finiteInt = (raw, fallback) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const simulationToState = (sim) => {
  if (!sim) return null;
  return {
    symbol: sim.symbol || '',
    currentPrice: finite(sim.current_price, 175),
    strikePrice: finite(sim.strike_price, 180),
    daysToExpiry: finiteInt(sim.days_to_expiry, 30),
    marketIV: finite(sim.market_iv, 28),
    riskFreeRate: finite(sim.risk_free_rate, 5),
    investmentAmount: finite(sim.investment_amount, 10000),
    isCall: typeof sim.is_call === 'boolean' ? sim.is_call : true,
    userExpectedMove: sim.user_expected_move != null
      ? finite(sim.user_expected_move, null)
      : null,
    axisSettings: sim.axis_settings || null,
  };
};
