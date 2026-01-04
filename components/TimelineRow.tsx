
import React from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';

interface TimelineRowProps {
  hour: number;
  assignedScheduleIds: string[];
  assignedRecordIds: string[];
  allTasks: Task[];
  onScheduleClick: (hour: number) => void;
  onRecordClick: (hour: number) => void;
  activeSlot?: { hour: number; type: 'schedule' | 'record' } | null;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  hour,
  assignedScheduleIds,
  assignedRecordIds,
  allTasks,
  onScheduleClick,
  onRecordClick,
  activeSlot
}) => {
  const getTasksFromIds = (ids: string[]) => 
    ids.map(id => allTasks.find(t => t.id === id)).filter((t): t is Task => !!t);

  const scheduleTasks = getTasksFromIds(assignedScheduleIds);
  const recordTasks = getTasksFromIds(assignedRecordIds);

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  const renderTasks = (tasks: Task[], type: 'plan' | 'actual') => {
    if (tasks.length === 0) return (
        <div className={cn(
            "w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
            type === 'plan' ? "bg-indigo-50/10" : "bg-emerald-50/10"
        )}>
            <div className="w-0.5 h-0.5 rounded-full bg-stone-200" />
        </div>
    );
    return (
      <div className="flex gap-0.5 w-full h-full overflow-hidden p-0.5">
        {tasks.map((task, idx) => (
          <div
            key={`${task.id}-${idx}`}
            className="flex-1 h-full rounded-[3px] flex items-center justify-center text-[10px] font-medium truncate px-1 leading-none transition-all border border-black/5"
            style={{ 
              backgroundColor: task.color, 
              color: getContrastColor(task.color)
            }}
          >
            {tasks.length <= 2 ? task.name : ''}
          </div>
        ))}
      </div>
    );
  };

  const isScheduleActive = activeSlot?.hour === hour && activeSlot?.type === 'schedule';
  const isRecordActive = activeSlot?.hour === hour && activeSlot?.type === 'record';

  return (
    <div className="flex h-9 border-b border-stone-50 group transition-colors">
      <div 
        className={cn(
          "flex-1 flex transition-all duration-300 relative overflow-hidden",
          isScheduleActive ? "bg-indigo-50" : "hover:bg-stone-50/50"
        )}
        onClick={() => onScheduleClick(hour)}
      >
        {renderTasks(scheduleTasks, 'plan')}
        {scheduleTasks.length > 0 && <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-indigo-200/30" />}
      </div>

      <div className={cn(
        "w-12 flex-shrink-0 flex items-center justify-center text-[9px] font-mono transition-all duration-300 select-none z-10 border-x border-stone-100 bg-white",
        (isScheduleActive || isRecordActive) 
            ? "text-stone-900 font-medium scale-105" 
            : "text-stone-300 group-hover:text-stone-400"
      )}>
        {formatHour(hour)}
      </div>

      <div 
        className={cn(
          "flex-1 flex transition-all duration-300 relative overflow-hidden",
          isRecordActive ? "bg-emerald-50" : "hover:bg-stone-50/50"
        )}
        onClick={() => onRecordClick(hour)}
      >
        {renderTasks(recordTasks, 'actual')}
        {recordTasks.length > 0 && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-200/30" />}
      </div>
    </div>
  );
};
