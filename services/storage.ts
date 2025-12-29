import { AppState, Task } from '../types';

const STORAGE_KEY = 'chronos_flow_data_v1';

export const DEFAULT_TASKS: Task[] = [
  { id: 't1', name: '睡眠', color: '#94a3b8', category: '生活' },
  { id: 't2', name: '工作', color: '#3b82f6', category: '工作' },
  { id: 't3', name: '运动', color: '#10b981', category: '健康' },
  { id: 't4', name: '阅读', color: '#8b5cf6', category: '成长' },
  { id: 't5', name: '用餐', color: '#f59e0b', category: '生活' },
];

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {
        tasks: DEFAULT_TASKS,
        schedule: {},
        recurringSchedule: {},
        records: {},
        reviews: {}
      };
    }
    const parsed = JSON.parse(serialized);
    // Ensure recurringSchedule exists for older data migrations
    if (!parsed.recurringSchedule) {
        parsed.recurringSchedule = {};
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load state", e);
    return {
      tasks: DEFAULT_TASKS,
      schedule: {},
      recurringSchedule: {},
      records: {},
      reviews: {}
    };
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};