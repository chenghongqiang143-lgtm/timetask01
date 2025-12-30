
import { AppState, Task, RatingItem, ShopItem } from '../types';

const STORAGE_KEY = 'chronos_flow_data_v1';

export const DEFAULT_TASKS: Task[] = [
  { id: 't1', name: '睡眠', color: '#94a3b8', category: '生活' },
  { id: 't2', name: '工作', color: '#3b82f6', category: '工作' },
  { id: 't3', name: '运动', color: '#10b981', category: '健康' },
  { id: 't4', name: '阅读', color: '#8b5cf6', category: '成长' },
  { id: 't5', name: '用餐', color: '#f59e0b', category: '生活' },
];

export const DEFAULT_RATING_ITEMS: RatingItem[] = [
  {
    id: 'r1',
    name: '身心状态',
    reasons: {
      [-2]: '极度疲惫',
      [-1]: '有些焦虑',
      [0]: '平平淡淡',
      [1]: '比较充实',
      [2]: '精力充沛'
    }
  },
  {
    id: 'r2',
    name: '专注程度',
    reasons: {
      [-2]: '完全摸鱼',
      [-1]: '经常分心',
      [0]: '正常处理',
      [1]: '深度投入',
      [2]: '进入心流'
    }
  }
];

export const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id: 's1', name: '一杯奶茶', cost: 10, icon: '🧋' },
  { id: 's2', name: '游戏 1小时', cost: 15, icon: '🎮' },
  { id: 's3', name: '作弊餐', cost: 30, icon: '🍔' },
  { id: 's4', name: '看电影', cost: 50, icon: '🎬' },
  { id: 's5', name: '懒惰一天', cost: 100, icon: '🛌' },
];

export const loadState = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {
        tasks: DEFAULT_TASKS,
        categoryOrder: ['生活', '工作', '健康', '成长'],
        ratingItems: DEFAULT_RATING_ITEMS,
        shopItems: DEFAULT_SHOP_ITEMS,
        redemptions: [],
        schedule: {},
        recurringSchedule: {},
        records: {},
        ratings: {},
      };
    }
    const parsed = JSON.parse(serialized);
    // Data migrations
    if (!parsed.recurringSchedule) parsed.recurringSchedule = {};
    if (!parsed.ratingItems) parsed.ratingItems = DEFAULT_RATING_ITEMS;
    if (!parsed.ratings) parsed.ratings = {};
    if (!parsed.shopItems) parsed.shopItems = DEFAULT_SHOP_ITEMS;
    if (!parsed.redemptions) parsed.redemptions = [];
    
    // categoryOrder migration
    if (!parsed.categoryOrder) {
      const cats = Array.from(new Set(parsed.tasks.map((t: Task) => t.category || '未分类'))) as string[];
      parsed.categoryOrder = cats;
    }

    // Ensure all ratings have the new structure
    Object.keys(parsed.ratings).forEach(date => {
        if (typeof parsed.ratings[date].score === 'number') {
            const oldScore = parsed.ratings[date].score;
            parsed.ratings[date] = {
                scores: { 'r1': oldScore - 3 }, // Map 1-5 to -2 to 2
                comment: parsed.ratings[date].comment || ''
            };
        }
        if (!parsed.ratings[date].scores) parsed.ratings[date].scores = {};
    });

    return parsed;
  } catch (e) {
    console.error("Failed to load state", e);
    return {
      tasks: DEFAULT_TASKS,
      categoryOrder: ['生活', '工作', '健康', '成长'],
      ratingItems: DEFAULT_RATING_ITEMS,
      shopItems: DEFAULT_SHOP_ITEMS,
      redemptions: [],
      schedule: {},
      recurringSchedule: {},
      records: {},
      ratings: {},
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
