import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Send, Loader2, Trash2 } from 'lucide-react';
import { useAIAgent } from '@/hooks/useAIAgent';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  context: {
    tasks: unknown[];
    projects: unknown[];
    teams: unknown[];
  };
  onMutation?: () => void;
}

export const AIAssistant = ({ context, onMutation }: AIAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, send, clear } = useAIAgent({ context, onMutation });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-13 h-13 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'hover:scale-105 active:scale-95 transition-transform',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'hidden'
        )}
        style={{ width: 52, height: 52 }}
        title="Abrir Assistente IA"
        aria-label="Abrir Assistente IA"
      >
        <BrainCircuit className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[380px] sm:w-[400px] p-0 flex flex-col"
          style={{ maxWidth: '90vw' }}
        >
          {/* Header */}
          <SheetHeader className="flex-row items-center gap-3 px-4 py-3 border-b shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <BrainCircuit className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <SheetTitle className="text-sm leading-tight">Assistente IA</SheetTitle>
              <p className="text-xs text-muted-foreground">Cronogramas &amp; Recursos</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={clear}
                  title="Limpar conversa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BrainCircuit className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Como posso ajudar?</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                    Posso analisar seu cronograma, criar tarefas, detectar conflitos e sugerir melhorias.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[260px] mt-2">
                  {[
                    'Tem algum conflito no cronograma?',
                    'Crie uma tarefa para a próxima semana',
                    'Qual equipe está mais sobrecarregada?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => send(suggestion)}
                      className="text-xs text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col gap-1 max-w-[88%]',
                  msg.role === 'user' ? 'ml-auto items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Analisando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-4 pt-2 border-t shrink-0">
            <div className="flex items-end gap-2 bg-muted/50 border rounded-xl px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem... (Enter para enviar)"
                rows={1}
                disabled={loading}
                className={cn(
                  'flex-1 bg-transparent text-sm resize-none outline-none',
                  'placeholder:text-muted-foreground min-h-[24px] max-h-[120px]',
                  'leading-relaxed py-0.5',
                  'disabled:opacity-50'
                )}
                style={{ scrollbarWidth: 'none' }}
              />
              <Button
                size="icon"
                className="h-7 w-7 shrink-0 rounded-lg"
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Shift+Enter para nova linha
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
