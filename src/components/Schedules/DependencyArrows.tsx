import { differenceInDays } from 'date-fns';
import type { Task } from '@/types/schedule';

const ROW_HEIGHT = 48;
const MARKER_ID = 'dep-arrowhead';

interface DependencyArrowsProps {
  tasks: Task[];        // regular (non-milestone) tasks only, in render order
  startDate: Date;
  dayWidth: number;
  totalWidth: number;
  totalHeight: number;
}

const getBarGeometry = (task: Task, startDate: Date, dayWidth: number) => {
  const offsetDays = differenceInDays(task.startDate, startDate);
  const durationDays = Math.max(1, differenceInDays(task.endDate, task.startDate) + 1);
  return {
    left: offsetDays * dayWidth,
    right: (offsetDays + durationDays) * dayWidth,
  };
};

/**
 * Build an L-shaped (orthogonal) path from source right edge to target left edge.
 * If the target is to the left of the source, routes around below both bars.
 */
const buildArrowPath = (
  sx: number, sy: number,
  tx: number, ty: number
): string => {
  const BEND_OFFSET = 12;

  if (tx > sx + BEND_OFFSET) {
    // Normal case: target is to the right → simple elbow
    const midX = sx + (tx - sx) / 2;
    return `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`;
  }

  // Reverse case: route below/above both bars
  const loopX = Math.max(sx + BEND_OFFSET, tx - BEND_OFFSET);
  const loopY = Math.max(sy, ty) + ROW_HEIGHT * 0.5;
  return `M ${sx} ${sy} H ${loopX} V ${loopY} H ${tx - BEND_OFFSET} V ${ty} H ${tx}`;
};

export const DependencyArrows = ({
  tasks,
  startDate,
  dayWidth,
  totalWidth,
  totalHeight,
}: DependencyArrowsProps) => {
  const arrows: { id: string; path: string }[] = [];

  tasks.forEach((task, taskIdx) => {
    if (!task.dependencies?.length) return;

    const target = getBarGeometry(task, startDate, dayWidth);
    const ty = (taskIdx + 0.5) * ROW_HEIGHT;

    task.dependencies.forEach((depId) => {
      const srcIdx = tasks.findIndex((t) => t.id === depId);
      if (srcIdx < 0) return;

      const src = getBarGeometry(tasks[srcIdx], startDate, dayWidth);
      const sy = (srcIdx + 0.5) * ROW_HEIGHT;

      arrows.push({
        id: `${depId}→${task.id}`,
        path: buildArrowPath(src.right, sy, target.left, ty),
      });
    });
  });

  if (arrows.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none overflow-visible"
      style={{ width: totalWidth, height: totalHeight, zIndex: 5 }}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={MARKER_ID}
          markerWidth="7"
          markerHeight="7"
          refX="7"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 7 3.5, 0 7"
            fill="rgba(249, 115, 22, 0.85)"
          />
        </marker>
      </defs>

      {arrows.map(({ id, path }) => (
        <path
          key={id}
          d={path}
          stroke="rgba(249, 115, 22, 0.65)"
          strokeWidth={1.5}
          fill="none"
          markerEnd={`url(#${MARKER_ID})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};
