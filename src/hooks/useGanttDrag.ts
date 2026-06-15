import { useState, useCallback } from 'react';
import type { Task } from '@/types/schedule';
import { addDays, differenceInDays } from 'date-fns';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import {
  DEFAULT_CALENDAR_CONFIG,
  snapToNextWorkingDay,
  snapToPrevWorkingDay,
} from '@/utils/workingDaysEngine';

type DragType = 'move' | 'resize-start' | 'resize-end' | null;

interface DragState {
  taskId: string | null;
  type: DragType;
  startX: number;
  originalTask: Task | null;
}

export const useGanttDrag = (
  tasks: Task[],
  onUpdateTask: (task: Task) => void,
  onUpdateMultiple: (tasks: Task[]) => void,
  dayWidth: number,
  calendarConfig: CalendarConfig = DEFAULT_CALENDAR_CONFIG
) => {
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    type: null,
    startX: 0,
    originalTask: null,
  });

  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const handleDragStart = useCallback(
    (e: React.MouseEvent, taskId: string, type: DragType) => {
      e.preventDefault();
      e.stopPropagation();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      setDragState({ taskId, type, startX: e.clientX, originalTask: { ...task } });
      setPreviewTask({ ...task });
    },
    [tasks]
  );

  const computeNewDates = (original: Task, type: DragType, daysDelta: number) => {
    let newStart = original.startDate;
    let newEnd = original.endDate;

    switch (type) {
      case 'move':
        newStart = addDays(original.startDate, daysDelta);
        newEnd = addDays(original.endDate, daysDelta);
        break;
      case 'resize-start':
        newStart = addDays(original.startDate, daysDelta);
        if (newStart >= original.endDate) newStart = addDays(original.endDate, -1);
        break;
      case 'resize-end':
        newEnd = addDays(original.endDate, daysDelta);
        if (newEnd <= original.startDate) newEnd = addDays(original.startDate, 1);
        break;
    }

    return { newStart, newEnd };
  };

  // Snap dates to working days based on drag type
  const snapToWorkingDays = (task: Task, type: DragType): Task => {
    switch (type) {
      case 'move': {
        const snappedStart = snapToNextWorkingDay(task.startDate, calendarConfig);
        const duration = differenceInDays(task.endDate, task.startDate);
        return { ...task, startDate: snappedStart, endDate: addDays(snappedStart, duration) };
      }
      case 'resize-start':
        return { ...task, startDate: snapToNextWorkingDay(task.startDate, calendarConfig) };
      case 'resize-end':
        return { ...task, endDate: snapToPrevWorkingDay(task.endDate, calendarConfig) };
      default:
        return task;
    }
  };

  // During drag: only update local preview, no Supabase calls
  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.taskId || !dragState.originalTask) return;

      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);
      const { newStart, newEnd } = computeNewDates(
        dragState.originalTask,
        dragState.type,
        daysDelta
      );

      setPreviewTask({ ...dragState.originalTask, startDate: newStart, endDate: newEnd });
    },
    [dragState, dayWidth]
  );

  // On release: snap to working day, persist, cascade successors for moves
  const handleDragEnd = useCallback(() => {
    if (!dragState.originalTask || !previewTask) {
      setDragState({ taskId: null, type: null, startX: 0, originalTask: null });
      setPreviewTask(null);
      return;
    }

    const snapped = snapToWorkingDays(previewTask, dragState.type);

    if (dragState.type === 'move') {
      const originalEndMs = dragState.originalTask.endDate.getTime();

      const successors = tasks.filter(
        (t) =>
          t.projectId === dragState.originalTask!.projectId &&
          t.id !== dragState.originalTask!.id &&
          t.startDate.getTime() >= originalEndMs
      );

      if (successors.length > 0) {
        const daysDelta = differenceInDays(snapped.startDate, dragState.originalTask.startDate);
        const cascaded = successors.map((t) => ({
          ...t,
          startDate: addDays(t.startDate, daysDelta),
          endDate: addDays(t.endDate, daysDelta),
        }));
        onUpdateMultiple([snapped, ...cascaded]);
      } else {
        onUpdateTask(snapped);
      }
    } else {
      onUpdateTask(snapped);
    }

    setDragState({ taskId: null, type: null, startX: 0, originalTask: null });
    setPreviewTask(null);
  }, [dragState, previewTask, tasks, onUpdateTask, onUpdateMultiple, calendarConfig]);

  return {
    dragState,
    previewTask,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging: dragState.taskId !== null,
  };
};
