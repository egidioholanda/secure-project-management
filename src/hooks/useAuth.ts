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
  role_definition_id: string | null;
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
  allowedPages: string[] | null;
  allowedClientGroupIds: string[] | null;
  allowedClientIds: string[] | null;
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
    allowedPages: null,
    allowedClientGroupIds: null,
    allowedClientIds: null,
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

      // Fetch page permissions from the user's role definition
      let allowedPages: string[] | null = null;
      const roleDefId = profile?.role_definition_id;
      if (roleDefId) {
        const { data: permsData } = await (supabase as any)
          .from('role_page_permissions')
          .select('page_slug')
          .eq('role_id', roleDefId);
        if (permsData) {
          allowedPages = permsData.map((p: { page_slug: string }) => p.page_slug);
        }
      }

      // Fetch client group permissions
      let allowedClientGroupIds: string[] | null = null;
      if (roleDefId) {
        const { data: groupPermsData } = await (supabase as any)
          .from('role_client_group_permissions')
          .select('client_group_id')
          .eq('role_id', roleDefId);
        if (groupPermsData) {
          allowedClientGroupIds = groupPermsData.map((p: { client_group_id: string }) => p.client_group_id);
        }
      }

      // Derive allowed client IDs from allowed client group IDs
      let allowedClientIds: string[] | null = null;
      if (allowedClientGroupIds !== null) {
        if (allowedClientGroupIds.length === 0) {
          allowedClientIds = [];
        } else {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id')
            .in('client_group_id', allowedClientGroupIds as any);
          allowedClientIds = (clientsData || []).map((c: { id: string }) => c.id);
        }
      }

      setAuthState((prev) => ({
        ...prev,
        profile,
        roles,
        isAdmin,
        isManager,
        isSupTecnico,
        allowedPages,
        allowedClientGroupIds,
        allowedClientIds,
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
            allowedPages: null,
            allowedClientGroupIds: null,
            allowedClientIds: null,
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
