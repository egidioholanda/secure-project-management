import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type AppRole = 'admin' | 'manager' | 'user' | 'sup_tecnico';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSupTecnico: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    isLoading: true,
    isAdmin: false,
    isManager: false,
    isSupTecnico: false,
  });


  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('*').eq('user_id', userId),
      ]);

      const profile = profileResult.data as Profile | null;
      const roles = (rolesResult.data || []) as UserRole[];
      const isAdmin = roles.some((r) => r.role === 'admin');
      const isManager = roles.some((r) => r.role === 'manager');
      const isSupTecnico = roles.some((r) => r.role === 'sup_tecnico');

      setAuthState((prev) => ({
        ...prev,
        profile,
        roles,
        isAdmin,
        isManager,
        isSupTecnico,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Token refresh happens silently in the background (e.g. when returning to the tab).
        // Only update the session object — never trigger isLoading, which would unmount the page
        // and discard any open forms.
        if (event === 'TOKEN_REFRESHED') {
          setAuthState((prev) => ({ ...prev, session }));
          return;
        }

        // For all other events, only set isLoading when the user wasn't already known.
        // This prevents the loading spinner from appearing on re-focus events.
        setAuthState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          isLoading: prev.user === null && !!session?.user,
        }));

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setAuthState((prev) => ({
            ...prev,
            profile: null,
            roles: [],
            isAdmin: false,
            isManager: false,
            isSupTecnico: false,
            isLoading: false,
          }));
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isLoading: session?.user ? true : false,
      }));

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.functions.invoke('self-register', {
      body: { email, password, fullName },
    });

    if (error) {
      try {
        const body = await (error as any).context?.json?.();
        if (body?.error) return { error: new Error(body.error) as any };
      } catch {}
      return { error };
    }
    if (data?.error) return { error: new Error(data.error) as any };
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const refreshUserData = async () => {
    if (authState.user) {
      await fetchUserData(authState.user.id);
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };
};
