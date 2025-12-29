import React, { useState } from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';

interface TimelineRowProps {
  hour: number;
  assignedTaskIds: string[];
  allTasks: Task[];
  onClick: (hour: number) => void;
  onTaskDrop?: (hour: number, taskId: string) => void;
  maxTasks?: number;
  showDuration?: boolean;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  hour,
  assignedTaskIds,
  allTasks,
  onClick,
  onTaskDrop,
  showDuration = false,
}) => {
  const [isOver, setIsOver] = useState(false);

  const assignedTasks = assignedTaskIds
    .map(id => allTasks.find(t => t.id === id))
    .filter((t): t is Task => !!t);

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  const durationPerTask = assignedTasks.length > 0 ? Math.floor(60 / assignedTasks.length) : 0;
  const durationText = durationPerTask > 0 ? `${durationPerTask}m` : '';

  // Drag Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isOver && onTaskDrop) setIsOver(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (onTaskDrop) {
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
        onTaskDrop(hour, taskId);
      }
    }
  };

  return (
    <div 
      className={cn(
        "flex h-9 transition-all duration-200 group px-2 relative border-b border-transparent hover:border-stone-100",
        isOver ? "bg-indigo-50/50" : "hover:bg-stone-50/50"
      )}
      onClick={() => onClick(hour)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
        {/* Horizontal Guide Line */}
        <div className="absolute top-0 left-10 right-2 h-px bg-stone-50 group-hover:bg-stone-100 transition-colors" />

      {/* Time Label */}
      <div className={cn(
        "w-10 flex-shrink-0 flex items-center justify-start text-[10px] font-medium transition-colors font-mono tracking-tight select-none",
        isOver ? "text-primary" : "text-stone-300 group-hover:text-stone-400"
      )}>
        {formatHour(hour)}
      </div>

      {/* Task Area */}
      <div className="flex-1 flex gap-1 py-0.5 overflow-hidden relative cursor-pointer z-10">
        {assignedTasks.length === 0 ? (
          <div className={cn(
            "w-full h-full rounded-md border border-dashed flex items-center justify-center transition-all duration-300",
             isOver ? "border-primary/30 bg-primary/5 text-primary scale-100 opacity-100" : "border-stone-100 text-stone-300 scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100"
          )}>
             <span className="text-xs font-light">+</span>
          </div>
        ) : (
          assignedTasks.map((task, idx) => (
            <div
              key={`${task.id}-${idx}`}
              className="flex-1 h-full rounded-md flex flex-row items-center justify-center text-[10px] font-semibold truncate px-1 leading-none transition-all animate-in fade-in zoom-in-75 duration-300 ease-out gap-1"
              style={{ 
                backgroundColor: task.color, 
                color: getContrastColor(task.color) 
              }}
            >
              <span className={cn("truncate relative z-10")}>{task.name}</span>
              {showDuration && assignedTasks.length > 1 && <span className="text-[8px] opacity-80 font-normal font-mono relative z-10 hidden sm:inline">{durationText}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};