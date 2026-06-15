import { useState, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { Task } from '@/types/schedule';

const ROW_HEIGHT = 48;
const MARKER_ID = 'dep-arrowhead';

interface Arrow {
  id: string;
  path: string;
  taskId: string;
  depId: string;
  midX: number;
  midY: number;
}

interface DependencyArrowsProps {
  tasks: Task[];
  startDate: Date;
  dayWidth: number;
  totalWidth: number;
  totalHeight: number;
  onRemoveDependency: (taskId: string, depId: string) => void;
}

const getBarGeometry = (task: Task, startDate: Date, dayWidth: number) => {
  const offsetDays = differenceInDays(task.startDate, startDate);
  const durationDays = Math.max(1, differenceInDays(task.endDate, task.startDate) + 1);
  return {
    left: offsetDays * dayWidth,
    right: (offsetDays + durationDays) * dayWidth,
  };
};

const buildArrowPath = (sx: number, sy: number, tx: number, ty: number): string => {
  const BEND = 12;
  if (tx > sx + BEND) {
    const midX = sx + (tx - sx) / 2;
    return `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`;
  }
  const loopX = Math.max(sx + BEND, tx - BEND);
  const loopY = Math.max(sy, ty) + ROW_HEIGHT * 0.5;
  return `M ${sx} ${sy} H ${loopX} V ${loopY} H ${tx - BEND} V ${ty} H ${tx}`;
};

export const DependencyArrows = ({
  tasks,
  startDate,
  dayWidth,
  totalWidth,
  totalHeight,
  onRemoveDependency,
}: DependencyArrowsProps) => {
  const [hoveredArrow, setHoveredArrow] = useState<string | null>(null);

  const arrows = useMemo<Arrow[]>(() => {
    const result: Arrow[] = [];
    tasks.forEach((task, taskIdx) => {
      if (!task.dependencies?.length) return;
      const target = getBarGeometry(task, startDate, dayWidth);
      const ty = (taskIdx + 0.5) * ROW_HEIGHT;

      task.dependencies.forEach((depId) => {
        const srcIdx = tasks.findIndex((t) => t.id === depId);
        if (srcIdx < 0) return;
        const src = getBarGeometry(tasks[srcIdx], startDate, dayWidth);
        const sy = (srcIdx + 0.5) * ROW_HEIGHT;
        const id = `${depId}→${task.id}`;
        result.push({
          id,
          path: buildArrowPath(src.right, sy, target.left, ty),
          taskId: task.id,
          depId,
          midX: (src.right + target.left) / 2,
          midY: (sy + ty) / 2,
        });
      });
    });
    return result;
  }, [tasks, startDate, dayWidth]);

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 overflow-visible"
      style={{ width: totalWidth, height: totalHeight, zIndex: 5, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <marker id={MARKER_ID} markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="rgba(249, 115, 22, 0.85)" />
        </marker>
      </defs>

      {arrows.map(({ id, path, taskId, depId, midX, midY }) => {
        const isHovered = hoveredArrow === id;
        return (
          <g
            key={id}
            style={{ pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredArrow(id)}
            onMouseLeave={() => setHoveredArrow(null)}
          >
            {/* Wide invisible hitbox for easy hover */}
            <path d={path} stroke="transparent" strokeWidth={10} fill="none" />

            {/* Visible arrow */}
            <path
              d={path}
              stroke={isHovered ? 'rgba(249, 115, 22, 0.95)' : 'rgba(249, 115, 22, 0.65)'}
              strokeWidth={isHovered ? 2 : 1.5}
              fill="none"
              markerEnd={`url(#${MARKER_ID})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'stroke 0.1s, stroke-width 0.1s' }}
            />

            {/* Delete button — visible on hover */}
            {isHovered && (
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setHoveredArrow(null);
                  onRemoveDependency(taskId, depId);
                }}
              >
                {/* White backdrop */}
                <circle cx={midX} cy={midY} r={9} fill="white" />
                {/* Orange border ring */}
                <circle
                  cx={midX}
                  cy={midY}
                  r={9}
                  fill="rgba(254, 242, 232, 0.95)"
                  stroke="rgba(249, 115, 22, 0.8)"
                  strokeWidth={1.5}
                />
                {/* × icon */}
                <line
                  x1={midX - 3.5} y1={midY - 3.5}
                  x2={midX + 3.5} y2={midY + 3.5}
                  stroke="rgb(239, 68, 68)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
                <line
                  x1={midX + 3.5} y1={midY - 3.5}
                  x2={midX - 3.5} y2={midY + 3.5}
                  stroke="rgb(239, 68, 68)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
