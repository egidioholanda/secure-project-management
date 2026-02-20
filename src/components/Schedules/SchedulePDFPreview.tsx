import React, { forwardRef } from 'react';
import { Task } from '@/types/schedule';
import { CompanySettings } from '@/hooks/useCompanySettings';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SchedulePDFPreviewProps {
  tasks: Task[];
  startDate: Date;
  endDate: Date;
  companySettings: CompanySettings | null;
  filterLabel?: string;
}

export const SchedulePDFPreview = forwardRef<HTMLDivElement, SchedulePDFPreviewProps>(
  ({ tasks, startDate, endDate, companySettings, filterLabel }, ref) => {
    // Group tasks by project
    const groupedTasks = tasks.reduce((acc, task) => {
      if (!acc[task.projectId]) {
        acc[task.projectId] = {
          projectName: task.projectName,
          projectColor: task.color,
          tasks: [],
        };
      }
      acc[task.projectId].tasks.push(task);
      return acc;
    }, {} as Record<string, { projectName: string; projectColor: string; tasks: Task[] }>);

    const totalDays = differenceInDays(endDate, startDate) + 1;
    const today = new Date();

    const getTaskLeftPercent = (task: Task) => {
      const daysFromStart = differenceInDays(task.startDate, startDate);
      return Math.max(0, (daysFromStart / totalDays) * 100);
    };

    const getTaskWidthPercent = (task: Task) => {
      const duration = differenceInDays(task.endDate, task.startDate) + 1;
      return Math.max(1, (duration / totalDays) * 100);
    };

    const getTodayPercent = () => {
      const daysFromStart = differenceInDays(today, startDate);
      if (daysFromStart < 0 || daysFromStart > totalDays) return null;
      return (daysFromStart / totalDays) * 100;
    };

    const todayPercent = getTodayPercent();

    // Generate month markers for the header
    const getMonthMarkers = () => {
      const markers: { label: string; leftPercent: number }[] = [];
      const cursor = new Date(startDate);
      cursor.setDate(1);
      while (cursor <= endDate) {
        const daysFromStart = differenceInDays(cursor, startDate);
        const leftPercent = Math.max(0, (daysFromStart / totalDays) * 100);
        markers.push({
          label: format(cursor, 'MMM yyyy', { locale: ptBR }),
          leftPercent,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return markers;
    };

    const monthMarkers = getMonthMarkers();

    const statusColors: Record<string, string> = {
      '#3B82F6': '#3B82F6',
      '#10B981': '#10B981',
      '#F59E0B': '#F59E0B',
      '#EF4444': '#EF4444',
      '#8B5CF6': '#8B5CF6',
      '#EC4899': '#EC4899',
    };

    return (
      <div
        ref={ref}
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#1a1a1a',
          padding: '12mm 12mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Header with logos and company info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6mm', paddingBottom: '4mm', borderBottom: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {companySettings?.header_logo_url && (
              <img
                src={companySettings.header_logo_url}
                alt="Logo"
                crossOrigin="anonymous"
                style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
              />
            )}
            <div>
              {companySettings?.company_name && (
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>
                  {companySettings.company_name}
                </div>
              )}
              {companySettings?.cnpj && (
                <div style={{ fontSize: '10px', color: '#64748b' }}>CNPJ: {companySettings.cnpj}</div>
              )}
              {companySettings?.contact && (
                <div style={{ fontSize: '10px', color: '#64748b' }}>{companySettings.contact}</div>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e40af' }}>CRONOGRAMA</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              {format(startDate, 'dd/MM/yyyy', { locale: ptBR })} – {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {filterLabel && filterLabel !== 'Todos os projetos' && (
              <div style={{ fontSize: '10px', color: '#1e40af', marginTop: '2px' }}>
                Projeto: {filterLabel}
              </div>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '5mm' }}>
          {[
            { label: 'Total de Tarefas', value: tasks.length },
            { label: 'Projetos', value: Object.keys(groupedTasks).length },
            { label: 'Concluídas', value: tasks.filter(t => t.progress === 100).length },
            { label: 'Em Andamento', value: tasks.filter(t => t.progress > 0 && t.progress < 100).length },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '6px 8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e40af' }}>{stat.value}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Gantt Chart Area */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
          {/* Month header */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            {/* Sidebar label */}
            <div style={{ width: '140px', flexShrink: 0, padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', color: '#475569', borderRight: '1px solid #e2e8f0' }}>
              Tarefa
            </div>
            {/* Timeline with month markers */}
            <div style={{ flex: 1, position: 'relative', height: '24px', overflow: 'hidden' }}>
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${m.leftPercent}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: '1px solid #cbd5e1',
                    paddingLeft: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '9px',
                    color: '#475569',
                    fontWeight: 'bold',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks grouped by project */}
          {Object.entries(groupedTasks).map(([projectId, group]) => (
            <div key={projectId}>
              {/* Project header */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '140px',
                    flexShrink: 0,
                    padding: '4px 8px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#1e40af',
                    borderRight: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: group.projectColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.projectName}
                  </span>
                </div>
                <div style={{ flex: 1, height: '20px', position: 'relative' }}>
                  {todayPercent !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${todayPercent}%`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: '#ef4444',
                        opacity: 0.5,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Task rows */}
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #f1f5f9',
                    minHeight: '22px',
                  }}
                >
                  {/* Task name */}
                  <div
                    style={{
                      width: '140px',
                      flexShrink: 0,
                      padding: '3px 8px 3px 16px',
                      fontSize: '9px',
                      color: '#334155',
                      borderRight: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.name}
                    </span>
                  </div>

                  {/* Gantt bar */}
                  <div style={{ flex: 1, position: 'relative', height: '22px' }}>
                    {/* Today line */}
                    {todayPercent !== null && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${todayPercent}%`,
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          backgroundColor: '#ef4444',
                          opacity: 0.4,
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* Task bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${getTaskLeftPercent(task)}%`,
                        width: `${Math.max(getTaskWidthPercent(task), 1)}%`,
                        top: '4px',
                        height: '14px',
                        backgroundColor: task.color || '#3B82F6',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        zIndex: 2,
                      }}
                    >
                      {/* Progress fill */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${task.progress}%`,
                          backgroundColor: 'rgba(0,0,0,0.2)',
                        }}
                      />
                      {/* Progress text */}
                      {getTaskWidthPercent(task) > 5 && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '7px',
                            color: '#ffffff',
                            fontWeight: 'bold',
                          }}
                        >
                          {task.progress}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {tasks.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
              Nenhuma tarefa encontrada.
            </div>
          )}
        </div>

        {/* Task detail table */}
        <div style={{ marginTop: '6mm' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '3mm', color: '#1e40af' }}>
            Detalhamento das Tarefas
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                {['Tarefa', 'Projeto', 'Responsável', 'Início', 'Fim', 'Progresso'].map((h) => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr key={task.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</td>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>{task.projectName}</td>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>{task.assignee || '—'}</td>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>{format(task.startDate, 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>{format(task.endDate, 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td style={{ padding: '3px 6px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${task.progress}%`, height: '100%', backgroundColor: task.color || '#3B82F6', borderRadius: '2px' }} />
                      </div>
                      <span>{task.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {companySettings?.footer_logo_url && (
          <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
            <img
              src={companySettings.footer_logo_url}
              alt="Logo rodapé"
              crossOrigin="anonymous"
              style={{ height: '30px', width: 'auto', objectFit: 'contain', opacity: 0.7 }}
            />
          </div>
        )}

        <div style={{ marginTop: '4mm', paddingTop: '3mm', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#94a3b8' }}>
          <span>{companySettings?.company_name || ''}</span>
          <span>Exportado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
    );
  }
);

SchedulePDFPreview.displayName = 'SchedulePDFPreview';
