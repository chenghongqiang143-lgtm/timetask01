
export type TargetMode = 'duration' | 'count';

export interface TaskTarget {
  mode: TargetMode;
  value: number; // Represents hours (if mode is duration) or count (if mode is count)
  frequency: number; // every X days (1 = daily, 7 = weekly, etc.)
}

export interface Task {
  id: string;
  name: string;
  color: string;
  category: string; // e.g., "Work", "Life", "Study"
  targets?: TaskTarget;
}

export interface DayData {
  // Key is hour (0-23), Value is array of task IDs
  hours: Record<number, string[]>;
}

export type Tab = 'schedule' | 'record' | 'stats' | 'settings';

export interface AppState {
  tasks: Task[];
  schedule: Record<string, DayData>; // Key is YYYY-MM-DD
  recurringSchedule: Record<number, string[]>; // Key is hour (0-23), Value is task IDs that repeat daily
  records: Record<string, DayData>; // Key is YYYY-MM-DD
  reviews: Record<string, string>; // Key is YYYY-MM-DD, Value is text
}

export interface DragItem {
  taskId: string;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);