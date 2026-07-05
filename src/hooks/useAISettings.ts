import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'grok';

export interface AISettingRow {
  id: string;
  provider: AIProvider;
  model: string;
  label: string;
  maskedKey: string;
  active: boolean;
  createdAt: string;
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  anthropic: ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  google: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-001', 'gemini-1.5-pro'],
  grok: ['grok-2', 'grok-2-mini'],
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google Gemini',
  grok: 'xAI Grok',
};

const maskKey = (key: string): string => {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 8) + '••••••••••••••••••••' + key.slice(-4);
};

export const useAISettings = () => {
  const [settings, setSettings] = useState<AISettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('id, provider, model, label, api_key, active, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSettings(
        (data ?? []).map((row) => ({
          id: row.id,
          provider: row.provider as AIProvider,
          model: row.model,
          label: row.label,
          maskedKey: maskKey(row.api_key),
          active: row.active,
          createdAt: row.created_at,
        }))
      );
    } catch {
      toast.error('Erro ao carregar configurações de IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const addSetting = async (params: {
    provider: AIProvider;
    model: string;
    label: string;
    apiKey: string;
    setActive?: boolean;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('ai_settings').insert({
      user_id: user.id,
      provider: params.provider,
      model: params.model,
      label: params.label,
      api_key: params.apiKey,
      active: params.setActive ?? false,
    });

    if (error) {
      toast.error('Erro ao salvar chave de API');
      return;
    }

    toast.success('Chave adicionada com sucesso');
    await fetchSettings();
  };

  const activateSetting = async (id: string) => {
    // The DB trigger handles deactivating the others
    const { error } = await supabase
      .from('ai_settings')
      .update({ active: true })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao ativar chave');
      return;
    }

    toast.success('Chave ativada');
    await fetchSettings();
  };

  const deleteSetting = async (id: string) => {
    const { error } = await supabase.from('ai_settings').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao remover chave');
      return;
    }

    toast.success('Chave removida');
    await fetchSettings();
  };

  const testConnection = async (id: string): Promise<boolean> => {
    // Sends a minimal message to the edge function to verify the key works
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return false;

    try {
      // Temporarily activate this key for the test (restore after)
      const current = settings.find((s) => s.active);
      await supabase.from('ai_settings').update({ active: true }).eq('id', id);

      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: 'Responda apenas "ok" para confirmar que está funcionando.',
          history: [],
          context: { tasks: [], projects: [], teams: [] },
        },
      });

      // Restore previous active key if different
      if (current && current.id !== id) {
        await supabase.from('ai_settings').update({ active: true }).eq('id', current.id);
        await fetchSettings();
      } else {
        await fetchSettings();
      }

      if (error || data?.error) return false;
      return true;
    } catch {
      await fetchSettings();
      return false;
    }
  };

  return { settings, loading, addSetting, activateSetting, deleteSetting, testConnection, refetch: fetchSettings };
};
