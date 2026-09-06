/**
 * Authentication Context for Jewels 'n' Joys
 * Supabase Auth + Profiles integration with modal support
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state for guest flows (e.g. clicking wishlist as guest)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [pendingAction, setPendingAction] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        fetchProfile(initSession.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      // Upsert profile directly just in case trigger needs extra fields
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('Profile upsert note:', profileErr);
      }
    }

    return data;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async ({ fullName, phone }) => {
    if (!user) throw new Error('User not logged in');

    const updates = {
      id: user.id,
      full_name: fullName,
      phone: phone,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) throw error;

    // Also update Supabase user metadata
    await supabase.auth.updateUser({
      data: { full_name: fullName, phone: phone },
    });

    setProfile((prev) => ({ ...prev, ...updates }));
  }, [user]);

  const openAuthModal = useCallback((view = 'login', onComplete = null) => {
    setAuthModalView(view);
    setPendingAction(() => onComplete);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setPendingAction(null);
  }, []);

  const executePendingAction = useCallback(() => {
    if (typeof pendingAction === 'function') {
      try {
        pendingAction();
      } catch (err) {
        console.error('Error executing pending action after auth:', err);
      }
    }
    setPendingAction(null);
  }, [pendingAction]);

  const value = {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAuthModalOpen,
    authModalView,
    setAuthModalView,
    openAuthModal,
    closeAuthModal,
    executePendingAction,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
