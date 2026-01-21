import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Upload, Loader2, Trash2, Building2 } from 'lucide-react';

export const CompanySettingsTab = () => {
  const { settings, isLoading, updateSettings, uploadLogo } = useCompanySettings();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    responsible_name: '',
    contact: '',
    email: '',
    cnpj: '',
  });
  const [headerLogo, setHeaderLogo] = useState<string | null>(null);
  const [footerLogo, setFooterLogo] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        responsible_name: settings.responsible_name || '',
        contact: settings.contact || '',
        email: settings.email || '',
        cnpj: settings.cnpj || '',
      });
      setHeaderLogo(settings.header_logo_url);
      setFooterLogo(settings.footer_logo_url);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'footer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadLogo(file, type);
    if (url) {
      if (type === 'header') {
        setHeaderLogo(url);
      } else {
        setFooterLogo(url);
      }
    }
  };

  const handleRemoveLogo = (type: 'header' | 'footer') => {
    if (type === 'header') {
      setHeaderLogo(null);
    } else {
      setFooterLogo(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings({
      ...formData,
      header_logo_url: headerLogo,
      footer_logo_url: footerLogo,
    });
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Logos da Empresa
          </CardTitle>
          <CardDescription>
            Configure as logos que aparecerão no cabeçalho e rodapé das propostas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Header Logo */}
            <div className="space-y-3">
              <Label>Logo do Cabeçalho</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {headerLogo ? (
                  <div className="space-y-3">
                    <img
                      src={headerLogo}
                      alt="Logo do cabeçalho"
                      className="max-h-24 mx-auto object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveLogo('header')}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Clique para enviar a logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, 'header')}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Footer Logo */}
            <div className="space-y-3">
              <Label>Logo do Rodapé</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                {footerLogo ? (
                  <div className="space-y-3">
                    <img
                      src={footerLogo}
                      alt="Logo do rodapé"
                      className="max-h-24 mx-auto object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveLogo('footer')}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Clique para enviar a logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, 'footer')}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            Dados gerais da empresa que aparecerão nas propostas e relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Nome da sua empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible_name">Nome do Responsável</Label>
              <Input
                id="responsible_name"
                value={formData.responsible_name}
                onChange={(e) => handleInputChange('responsible_name', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contato</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => handleInputChange('contact', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="empresa@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  );
};
