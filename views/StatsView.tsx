
import React, { useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { CalendarRange, Clock, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDate, cn } from '../utils';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  dateObj: Date;
}

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  allSchedules,
  recurringSchedule,
  allRecords,
  dateObj
}) => {
  const weekRange = useMemo(() => {
    const start = startOfWeek(dateObj, { weekStartsOn: 1 });
    const end = endOfWeek(dateObj, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [dateObj]);

  const calculateTodayStats = useMemo(() => {
    const dKey = formatDate(dateObj);
    const recHours = allRecords[dKey]?.hours || {};
    const schedHours = allSchedules[dKey]?.hours || {};
    
    return tasks.map(t => {
      let planned = 0;
      let actual = 0;
      
      HOURS.forEach(h => {
        const specificPlan = schedHours[h] || [];
        const recurringPlan = recurringSchedule[h] || [];
        const uniquePlan = Array.from(new Set([...specificPlan, ...recurringPlan]));
        const actualRec = recHours[h] || [];

        if (uniquePlan.includes(t.id)) planned += 1;
        actualRec.forEach(tid => {
          if (tid === t.id) actual += (1 / (actualRec.length || 1));
        });
      });
      
      return { ...t, planned, actual, execRatio: planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0) };
    }).filter(t => t.actual > 0 || t.planned > 0).sort((a, b) => b.actual - a.actual);
  }, [dateObj, allRecords, allSchedules, recurringSchedule, tasks]);

  const dailyGoalStats = useMemo(() => {
    const dKey = formatDate(dateObj);
    const recHours = allRecords[dKey]?.hours || {};
    
    return tasks.filter(t => t.targets && t.targets.value > 0).map(t => {
      let actual = 0;
      const target = t.targets!;
      const mode = target.mode || 'duration';

      HOURS.forEach(h => {
        const actualRec = recHours[h] || [];
        if (actualRec.includes(t.id)) {
            actual += (mode === 'count' ? 1 : (1 / (actualRec.length || 1)));
        }
      });

      // For daily targets (frequency = 1), we show progress for today.
      // For multi-day targets, we still show how today's effort contributes or just today's portion.
      // Usually, users want to see "Today's portion of the goal".
      const dailyTargetValue = target.frequency > 0 ? (target.value / target.frequency) : target.value;
      const progressPercent = Math.min((actual / dailyTargetValue) * 100, 100);
      
      return { 
        ...t, 
        actual, 
        targetValue: dailyTargetValue, 
        progressPercent, 
        mode,
        isCompleted: progressPercent >= 100,
        frequency: target.frequency
      };
    }).sort((a, b) => (a.isCompleted === b.isCompleted ? b.progressPercent - a.progressPercent : a.isCompleted ? 1 : -1));
  }, [dateObj, allRecords, tasks]);

  const weeklyMatrixStats = useMemo(() => {
    return tasks.map(t => {
      const dailyData = weekRange.map(day => {
        const dKey = formatDate(day);
        const recHours = allRecords[dKey]?.hours || {};
        let dayActual = 0;
        
        HOURS.forEach(h => {
          const actualRec = recHours[h] || [];
          actualRec.forEach(tid => {
            if (tid === t.id) dayActual += (1 / (actualRec.length || 1));
          });
        });
        return { date: dKey, hours: dayActual };
      });

      const totalWeekHours = dailyData.reduce((acc, curr) => acc + curr.hours, 0);
      return { ...t, dailyData, totalWeekHours };
    }).filter(t => t.totalWeekHours > 0).sort((a, b) => b.totalWeekHours - a.totalWeekHours);
  }, [weekRange, allRecords, tasks]);

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-y-auto custom-scrollbar pb-32">
        <div className="p-4 space-y-4">
            
            {/* 每日目标达成情况 (New Section) */}
            <div className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                        <Target size={14} className="text-primary" />
                        每日目标达成
                    </h3>
                    <div className="text-[10px] font-bold text-stone-400">今日进度</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dailyGoalStats.map(stat => (
                        <div key={stat.id} className="bg-stone-50/50 border border-stone-100 p-3 rounded-2xl flex flex-col gap-2 relative overflow-hidden group">
                            {stat.isCompleted && (
                                <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <CheckCircle2 size={48} className="text-emerald-500" />
                                </div>
                            )}
                            <div className="flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                    <span className="text-[11px] font-bold text-stone-700">{stat.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {stat.isCompleted && <CheckCircle2 size={10} className="text-emerald-500" />}
                                    <span className={cn(
                                        "text-[10px] font-mono font-black",
                                        stat.isCompleted ? "text-emerald-500" : "text-stone-400"
                                    )}>
                                        {stat.actual.toFixed(stat.mode === 'count' ? 0 : 1)}
                                        <span className="mx-0.5 text-stone-300">/</span>
                                        {stat.targetValue.toFixed(stat.mode === 'count' ? 0 : 1)}
                                        {stat.mode === 'duration' ? 'h' : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden relative z-10">
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                        stat.isCompleted ? "bg-emerald-500" : ""
                                    )} 
                                    style={{ 
                                        width: `${stat.progressPercent}%`, 
                                        backgroundColor: stat.isCompleted ? undefined : stat.color 
                                    }} 
                                />
                            </div>
                        </div>
                    ))}
                    {dailyGoalStats.length === 0 && (
                        <div className="col-span-full text-center py-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                            <p className="text-[10px] font-bold text-stone-300 italic">在配置页为任务设定“目标”即可在此追踪</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 今日时长分布 */}
            <div className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={14} className="text-secondary" />
                        今日时长分布
                    </h3>
                    <div className="text-[10px] font-bold text-stone-400">实录时长</div>
                </div>
                <div className="space-y-4">
                    {calculateTodayStats.map(stat => (
                        <div key={stat.id} className="group">
                            <div className="flex justify-between items-end mb-1.5 px-0.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                                    <span className="text-[11px] font-bold text-stone-700">{stat.name}</span>
                                </div>
                                <div className="text-[10px] font-bold font-mono text-stone-500">
                                    {stat.actual.toFixed(1)}h
                                </div>
                            </div>
                            <div className="h-2.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${Math.min((stat.actual / 12) * 100, 100)}%`, backgroundColor: stat.color }} 
                                />
                            </div>
                        </div>
                    ))}
                    {calculateTodayStats.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-xs text-stone-300 italic">今日尚未记录任何活动</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Daily Breakdown */}
            <div className="bg-white rounded-[2rem] border border-stone-200 p-6 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={14} className="text-primary" />
                        本周每日趋势
                    </h3>
                    <div className="text-[10px] font-bold text-stone-400">时长数值 (h)</div>
                </div>

                <div className="space-y-6 min-w-[300px]">
                    <div className="flex pl-20 pr-2 mb-2">
                        {weekRange.map((day, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black text-stone-300 uppercase">
                                    {format(day, 'EE', { locale: zhCN }).replace('周', '')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {weeklyMatrixStats.map(task => (
                        <div key={task.id} className="flex items-center group">
                            <div className="w-20 shrink-0 flex flex-col pr-3">
                                <span className="text-[10px] font-black text-stone-700 truncate group-hover:text-primary transition-colors">
                                    {task.name}
                                </span>
                                <span className="text-[8px] font-mono font-bold text-stone-400">
                                    ∑{task.totalWeekHours.toFixed(1)}
                                </span>
                            </div>

                            <div className="flex-1 flex gap-1 items-center">
                                {task.dailyData.map((day, idx) => {
                                    const hasData = day.hours > 0;
                                    return (
                                        <div 
                                            key={idx}
                                            className={cn(
                                                "flex-1 h-8 rounded-lg flex items-center justify-center transition-all",
                                                hasData ? "border border-stone-100" : "opacity-20"
                                            )}
                                            style={{ 
                                                backgroundColor: hasData ? `${task.color}15` : 'transparent',
                                            }}
                                        >
                                            <span 
                                                className={cn(
                                                    "text-[9px] font-mono font-black",
                                                    hasData ? "" : "text-stone-300"
                                                )}
                                                style={{ color: hasData ? task.color : undefined }}
                                            >
                                                {hasData ? day.hours.toFixed(1) : '0'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {weeklyMatrixStats.length === 0 && (
                        <div className="text-center py-16">
                            <CalendarRange size={32} className="mx-auto text-stone-100 mb-3" />
                            <p className="text-xs text-stone-300 italic">本周暂无投入记录</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
