
import React, { useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { CalendarRange, Clock } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { formatDate } from '../utils';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  review: string;
  onUpdateReview: (text: string) => void;
  currentDate: string;
  dateObj: Date;
}

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  allSchedules,
  recurringSchedule,
  allRecords,
  dateObj
}) => {
  const calculateStatsForRange = (start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });
    const taskAccumulator: Record<string, { planned: number, actual: number, actualCount: number }> = {};
    tasks.forEach(t => taskAccumulator[t.id] = { planned: 0, actual: 0, actualCount: 0 });

    days.forEach(day => {
        const dKey = formatDate(day);
        const recHours = allRecords[dKey]?.hours || {};
        const schedHours = allSchedules[dKey]?.hours || {};

        HOURS.forEach(h => {
            const specificPlan = schedHours[h] || [];
            const recurringPlan = recurringSchedule[h] || [];
            const uniquePlan = Array.from(new Set([...specificPlan, ...recurringPlan]));
            const actualRec = recHours[h] || [];

            uniquePlan.forEach(tid => { if (taskAccumulator[tid]) taskAccumulator[tid].planned += 1; });
            actualRec.forEach(tid => {
                 if (taskAccumulator[tid]) {
                    taskAccumulator[tid].actual += (1 / (actualRec.length || 1));
                    taskAccumulator[tid].actualCount += 1;
                 }
            });
        });
    });

    return tasks.map(t => {
        const stats = taskAccumulator[t.id];
        const planned = stats.planned;
        const actual = stats.actual;
        const hasData = planned > 0 || actual > 0;
        const execRatio = planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0);
        
        return { ...t, plannedTotal: planned, actualTotal: actual, execRatio, hasData };
    })
    .filter(t => t.hasData) // Allow tasks without targets to be shown if they have data
    .sort((a, b) => b.actualTotal - a.actualTotal); // Sort by actual duration as requested
  };

  const todaySummaryStats = useMemo(() => calculateStatsForRange(dateObj, dateObj), [dateObj, allRecords, allSchedules, recurringSchedule, tasks]);
  const weeklySummaryStats = useMemo(() => {
      const start = startOfWeek(dateObj, { weekStartsOn: 1 });
      const end = endOfWeek(dateObj, { weekStartsOn: 1 });
      return calculateStatsForRange(start, end);
  }, [dateObj, allRecords, allSchedules, recurringSchedule, tasks]);

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto custom-scrollbar pb-32">
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Today's Summary */}
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-secondary" />
                            今日统计
                        </h3>
                        <div className="text-[10px] font-bold text-stone-400">实录 / 计划</div>
                    </div>
                    <div className="space-y-4 flex-1">
                        {todaySummaryStats.map(stat => (
                            <div key={stat.id} className="flex flex-col gap-2">
                                <div className="flex justify-between items-end px-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                        <span className="text-[11px] font-bold text-stone-700 truncate">{stat.name}</span>
                                    </div>
                                    <div className="text-[10px] font-bold font-mono text-stone-500">
                                        {stat.actualTotal.toFixed(1)} <span className="text-stone-300 mx-0.5">/</span> {stat.plannedTotal.toFixed(1)}h
                                    </div>
                                </div>
                                <div className="h-2.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100 shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(stat.execRatio, 100)}%`, backgroundColor: stat.color }} />
                                </div>
                            </div>
                        ))}
                        {todaySummaryStats.length === 0 && <p className="text-center text-xs text-stone-300 py-10 italic">今日暂无记录</p>}
                    </div>
                </div>

                {/* Weekly Summary */}
                <div className="bg-white rounded-[2rem] border border-stone-200 p-6 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                            <CalendarRange size={14} className="text-primary" />
                            本周汇总
                        </h3>
                        <div className="text-[10px] font-bold text-stone-400">实录 / 计划</div>
                    </div>
                    <div className="space-y-4 flex-1">
                        {weeklySummaryStats.map(stat => (
                            <div key={stat.id} className="flex flex-col gap-2">
                                <div className="flex justify-between items-end px-0.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                        <span className="text-[11px] font-bold text-stone-700 truncate">{stat.name}</span>
                                    </div>
                                    <div className="text-[10px] font-bold font-mono text-stone-500">
                                        {stat.actualTotal.toFixed(1)} <span className="text-stone-300 mx-0.5">/</span> {stat.plannedTotal.toFixed(1)}h
                                    </div>
                                </div>
                                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-100 shadow-inner">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(stat.execRatio, 100)}%`, backgroundColor: stat.color }} />
                                </div>
                            </div>
                        ))}
                        {weeklySummaryStats.length === 0 && <p className="text-center text-xs text-stone-300 py-10 italic">本周暂无记录</p>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
