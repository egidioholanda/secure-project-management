import { Settings, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import { BRAZIL_HOLIDAYS } from '@/utils/workingDaysEngine';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarConfigPopoverProps {
  config: CalendarConfig;
  onChange: (patch: Partial<CalendarConfig>) => void;
}

export const CalendarConfigPopover = ({ config, onChange }: CalendarConfigPopoverProps) => {
  const upcomingHolidays = BRAZIL_HOLIDAYS.filter(
    (h) => new Date(h) >= new Date()
  ).slice(0, 6);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarDays className="w-4 h-4" />
          Calendário
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Configuração do Calendário</h4>
          </div>

          <p className="text-xs text-muted-foreground">
            Defina quais dias são considerados úteis. Ao redimensionar tarefas, datas finais serão
            ajustadas para o próximo dia útil.
          </p>

          <Separator />

          {/* Weekday toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="saturday" className="text-sm font-medium">Sábado é dia útil</Label>
                <p className="text-xs text-muted-foreground">Inclui sábados no calendário de trabalho</p>
              </div>
              <Switch
                id="saturday"
                checked={config.workOnSaturday}
                onCheckedChange={(v) => onChange({ workOnSaturday: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sunday" className="text-sm font-medium">Domingo é dia útil</Label>
                <p className="text-xs text-muted-foreground">Inclui domingos no calendário de trabalho</p>
              </div>
              <Switch
                id="sunday"
                checked={config.workOnSunday}
                onCheckedChange={(v) => onChange({ workOnSunday: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="holidays" className="text-sm font-medium">Respeitar feriados</Label>
                <p className="text-xs text-muted-foreground">Pula feriados nacionais brasileiros</p>
              </div>
              <Switch
                id="holidays"
                checked={config.considerHolidays}
                onCheckedChange={(v) => onChange({ considerHolidays: v })}
              />
            </div>
          </div>

          {/* Holiday list (shown when enabled) */}
          {config.considerHolidays && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Próximos Feriados
                </p>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {upcomingHolidays.map((dateStr) => (
                    <div key={dateStr} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {format(new Date(dateStr + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                        {format(new Date(dateStr + 'T12:00:00'), 'yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />
          <p className="text-xs text-muted-foreground">
            Configurações salvas automaticamente no navegador.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
