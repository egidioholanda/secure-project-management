import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIAgentOptions {
  context: {
    tasks: unknown[];
    projects: unknown[];
    teams: unknown[];
  };
  onMutation?: () => void;
}

export const useAIAgent = ({ context, onMutation }: UseAIAgentOptions) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim() || loading) return;

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: 'user', content: userMessage },
      ];
      setMessages(newMessages);
      setLoading(true);
      setError(null);

      try {
        // Only pass the last 10 exchanges to keep the payload small
        const historyForApi = newMessages.slice(-10).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));

        const { data, error: fnError } = await supabase.functions.invoke('ai-agent', {
          body: {
            message: userMessage,
            history: historyForApi.slice(0, -1), // exclude current message (sent as `message`)
            context,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply ?? '(sem resposta)' },
        ]);

        if (data.mutations && onMutation) {
          onMutation();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao contatar o assistente';
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠ ${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, context, onMutation]
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, clear };
};
