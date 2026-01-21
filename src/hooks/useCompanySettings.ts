import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanySettings {
  id: string;
  company_name: string | null;
  responsible_name: string | null;
  contact: string | null;
  email: string | null;
  cnpj: string | null;
  header_logo_url: string | null;
  footer_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettings(data as CompanySettings | null);
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    try {
      if (settings?.id) {
        const { data, error } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        setSettings(data as CompanySettings);
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert(updates)
          .select()
          .single();

        if (error) throw error;
        setSettings(data as CompanySettings);
      }

      toast({
        title: 'Configurações salvas',
        description: 'As configurações da empresa foram atualizadas com sucesso.',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const uploadLogo = async (file: File, type: 'header' | 'footer'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
};
