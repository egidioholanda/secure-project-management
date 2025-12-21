import { useState, useCallback } from 'react';
import { Task } from '@/types/schedule';
import { differenceInDays, addDays } from 'date-fns';

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
  dayWidth: number
) => {
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    type: null,
    startX: 0,
    originalTask: null,
  });

  const handleDragStart = useCallback(
    (e: React.MouseEvent, taskId: string, type: DragType) => {
      e.preventDefault();
      e.stopPropagation();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setDragState({
        taskId,
        type,
        startX: e.clientX,
        originalTask: { ...task },
      });
    },
    [tasks]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.taskId || !dragState.originalTask) return;

      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);

      if (daysDelta === 0) return;

      const task = dragState.originalTask;
      let newStartDate = task.startDate;
      let newEndDate = task.endDate;

      switch (dragState.type) {
        case 'move':
          newStartDate = addDays(task.startDate, daysDelta);
          newEndDate = addDays(task.endDate, daysDelta);
          break;
        case 'resize-start':
          newStartDate = addDays(task.startDate, daysDelta);
          if (newStartDate >= task.endDate) {
            newStartDate = addDays(task.endDate, -1);
          }
          break;
        case 'resize-end':
          newEndDate = addDays(task.endDate, daysDelta);
          if (newEndDate <= task.startDate) {
            newEndDate = addDays(task.startDate, 1);
          }
          break;
      }

      onUpdateTask({
        ...task,
        startDate: newStartDate,
        endDate: newEndDate,
      });
    },
    [dragState, dayWidth, onUpdateTask]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      taskId: null,
      type: null,
      startX: 0,
      originalTask: null,
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging: dragState.taskId !== null,
  };
};
