import { useState, useCallback } from 'react';
import type { Task } from '@/types/schedule';
import { addDays } from 'date-fns';

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
  dayWidth: number
) => {
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    type: null,
    startX: 0,
    originalTask: null,
  });

  // Preview task: the dragged task with updated dates (not yet persisted)
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

  // On release: persist final position + cascade successors if it was a move
  const handleDragEnd = useCallback(() => {
    if (!dragState.originalTask || !previewTask) {
      setDragState({ taskId: null, type: null, startX: 0, originalTask: null });
      setPreviewTask(null);
      return;
    }

    if (dragState.type === 'move') {
      const originalEndMs = dragState.originalTask.endDate.getTime();

      // Successors: tasks in the same project that start on or after the moved task's original end date
      const successors = tasks.filter(
        (t) =>
          t.projectId === dragState.originalTask!.projectId &&
          t.id !== dragState.originalTask!.id &&
          t.startDate.getTime() >= originalEndMs
      );

      if (successors.length > 0) {
        const daysDelta = Math.round(
          (previewTask.startDate.getTime() - dragState.originalTask.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        const cascaded = successors.map((t) => ({
          ...t,
          startDate: addDays(t.startDate, daysDelta),
          endDate: addDays(t.endDate, daysDelta),
        }));
        onUpdateMultiple([previewTask, ...cascaded]);
      } else {
        onUpdateTask(previewTask);
      }
    } else {
      onUpdateTask(previewTask);
    }

    setDragState({ taskId: null, type: null, startX: 0, originalTask: null });
    setPreviewTask(null);
  }, [dragState, previewTask, tasks, onUpdateTask, onUpdateMultiple]);

  return {
    dragState,
    previewTask,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging: dragState.taskId !== null,
  };
};
