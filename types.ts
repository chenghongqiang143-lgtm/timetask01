
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

export interface RatingItem {
  id: string;
  name: string;
  reasons: Record<number, string>; // Map of score (-2 to 2) to label
}

export interface DayRating {
  scores: Record<string, number>; // ratingItemId -> selected score
  comment: string;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
}

export interface Redemption {
  id: string;
  shopItemId: string;
  itemName: string;
  cost: number;
  date: string; // ISO string
}

export type Tab = 'tracker' | 'stats' | 'rating' | 'settings';

export interface AppState {
  tasks: Task[];
  categoryOrder: string[];
  ratingItems: RatingItem[];
  shopItems: ShopItem[];
  redemptions: Redemption[];
  schedule: Record<string, DayData>; // Key is YYYY-MM-DD
  recurringSchedule: Record<number, string[]>; // Key is hour (0-23), Value is task IDs that repeat daily
  records: Record<string, DayData>; // Key is YYYY-MM-DD
  ratings: Record<string, DayRating>; // Key is YYYY-MM-DD
}

export interface DragItem {
  taskId: string;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
