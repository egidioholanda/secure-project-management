import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Plus, Trash2, CheckCircle2, Loader2, Eye, EyeOff, Zap } from 'lucide-react';
import {
  useAISettings,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  type AIProvider,
} from '@/hooks/useAISettings';
import { toast } from 'sonner';

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'grok', label: 'xAI (Grok)' },
];

const defaultForm = {
  provider: 'anthropic' as AIProvider,
  model: 'claude-opus-4-8',
  label: '',
  apiKey: '',
  setActive: true,
};

export const AISettingsTab = () => {
  const { settings, loading, addSetting, activateSetting, deleteSetting, testConnection } = useAISettings();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleProviderChange = (provider: AIProvider) => {
    setForm((prev) => ({ ...prev, provider, model: PROVIDER_MODELS[provider][0] }));
  };

  const handleSave = async () => {
    if (!form.apiKey.trim()) {
      toast.error('Informe a chave de API');
      return;
    }
    if (!form.label.trim()) {
      toast.error('Informe um nome para identificar esta chave');
      return;
    }
    setSaving(true);
    await addSetting({
      provider: form.provider,
      model: form.model,
      label: form.label.trim(),
      apiKey: form.apiKey.trim(),
      setActive: form.setActive,
    });
    setSaving(false);
    setForm(defaultForm);
    setShowForm(false);
    setShowKey(false);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    const ok = await testConnection(id);
    setTestingId(null);
    if (ok) {
      toast.success('Conexão bem-sucedida!');
    } else {
      toast.error('Falha na conexão — verifique a chave e o modelo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            IA &amp; Modelos
          </CardTitle>
          <CardDescription>
            Configure as chaves de API dos provedores de IA. A chave ativa é usada pelo assistente
            nos cronogramas. As chaves ficam protegidas no banco — nunca são expostas no navegador.
          </CardDescription>
        </CardHeader>

        {/* Keys list */}
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : settings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BrainCircuit className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma chave cadastrada ainda.</p>
              <p className="text-sm">Adicione uma chave para habilitar o assistente de IA.</p>
            </div>
          ) : (
            settings.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  s.active
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/20'
                }`}
              >
                {/* Provider badge */}
                <Badge variant={s.active ? 'default' : 'secondary'} className="shrink-0 text-xs">
                  {PROVIDER_LABELS[s.provider]}
                </Badge>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.label || s.model}
                    {s.active && (
                      <span className="ml-2 text-xs text-primary font-normal">● ativa</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {s.model} &nbsp;·&nbsp; {s.maskedKey}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!s.active && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => activateSetting(s.id)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Ativar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                    disabled={testingId === s.id}
                    onClick={() => handleTest(s.id)}
                  >
                    {testingId === s.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    Testar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => deleteSetting(s.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Add button / form toggle */}
          {!showForm && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" />
              Adicionar chave
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova chave de API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Provider */}
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select
                  value={form.provider}
                  onValueChange={(v) => handleProviderChange(v as AIProvider)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={form.model}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, model: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_MODELS[form.provider].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="ai-label">Nome / identificação</Label>
              <Input
                id="ai-label"
                placeholder="ex: Produção, Testes, Conta pessoal"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="ai-key">Chave de API</Label>
              <div className="relative">
                <Input
                  id="ai-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-ant-api03-... ou sk-... ou AIzaSy..."
                  value={form.apiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave é armazenada de forma segura no servidor — nunca exposta no navegador.
              </p>
            </div>

            <Separator />

            {/* Set as active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="set-active"
                checked={form.setActive}
                onChange={(e) => setForm((prev) => ({ ...prev, setActive: e.target.checked }))}
                className="rounded border-border"
              />
              <Label htmlFor="set-active" className="font-normal cursor-pointer">
                Ativar esta chave imediatamente
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar chave
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(defaultForm);
                  setShowKey(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
