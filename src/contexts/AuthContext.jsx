import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  onAuthStateChange,
  getUserApiKeys,
  saveUserApiKey,
  deleteUserApiKey,
} from '../lib/supabase';
import {
  getStoredApiKeys,
  storeApiKey,
  removeApiKey,
} from '../api/providers/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState(() => getStoredApiKeys());

  // Check auth state on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserApiKeys(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserApiKeys(session.user.id);
      } else {
        // Fall back to localStorage when logged out
        setApiKeys(getStoredApiKeys());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load API keys from Supabase for logged-in user
  const loadUserApiKeys = async (userId) => {
    try {
      const keys = await getUserApiKeys(userId);
      const keyMap = {};
      keys.forEach(({ provider, api_key }) => {
        keyMap[provider] = api_key;
      });
      setApiKeys(keyMap);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      // Fall back to localStorage
      setApiKeys(getStoredApiKeys());
    }
  };

  // Sign in
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }
    const { user } = await supabaseSignIn(email, password);
    return user;
  };

  // Sign up
  const signUp = async (email, password) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }
    const { user } = await supabaseSignUp(email, password);
    return user;
  };

  // Sign out
  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication not configured');
    }
    await supabaseSignOut();
    setApiKeys(getStoredApiKeys());
  };

  // Save API key (to Supabase if logged in, otherwise localStorage)
  const saveApiKey = async (provider, apiKey) => {
    if (user && isSupabaseConfigured()) {
      await saveUserApiKey(user.id, provider, apiKey);
    } else {
      storeApiKey(provider, apiKey);
    }
    setApiKeys(prev => ({ ...prev, [provider]: apiKey }));
  };

  // Remove API key
  const removeKey = async (provider) => {
    if (user && isSupabaseConfigured()) {
      await deleteUserApiKey(user.id, provider);
    } else {
      removeApiKey(provider);
    }
    setApiKeys(prev => {
      const newKeys = { ...prev };
      delete newKeys[provider];
      return newKeys;
    });
  };

  const value = {
    user,
    loading,
    apiKeys,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured(),
    signIn,
    signUp,
    signOut,
    saveApiKey,
    removeApiKey: removeKey,
    setApiKeys,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
