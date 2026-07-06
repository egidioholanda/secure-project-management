import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIContextRow {
  id: string;
  content: string;
}

export const useAIContext = () => {
  const [context, setContext] = useState<AIContextRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_context')
        .select('id, content')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setContext(data ?? null);
    } catch {
      toast.error('Erro ao carregar contexto da IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const saveContext = async (content: string) => {
    setSaving(true);
    try {
      if (context?.id) {
        const { error } = await supabase
          .from('ai_context')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', context.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ai_context')
          .insert({ content })
          .select('id, content')
          .single();
        if (error) throw error;
        setContext(data);
      }
      setContext((prev) => (prev ? { ...prev, content } : null));
      toast.success('Contexto salvo');
    } catch {
      toast.error('Erro ao salvar contexto');
    } finally {
      setSaving(false);
    }
  };

  return { context, loading, saving, saveContext };
};
