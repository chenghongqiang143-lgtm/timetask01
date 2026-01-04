
import React, { useMemo, useState } from 'react';
import { Task, DayData, HOURS } from '../types';
import { CalendarRange, Clock, TrendingUp, Target, CheckCircle2, X, Calendar as CalendarIcon, LayoutGrid, Award } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, startOfMonth, endOfMonth, isSameDay, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDate, cn } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  dateObj: Date;
  isOpen: boolean;
  isModal?: boolean;
  onClose: () => void;
}

type StatsRange = 'day' | 'week' | 'month';

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  allSchedules,
  recurringSchedule,
  allRecords,
  dateObj,
  isOpen,
  isModal = true,
  onClose
}) => {
  const [range, setRange] = useState<StatsRange>('day');

  const selectedPeriod = useMemo(() => {
    if (range === 'day') return [dateObj];
    if (range === 'week') return eachDayOfInterval({ start: startOfWeek(dateObj, { weekStartsOn: 1 }), end: endOfWeek(dateObj, { weekStartsOn: 1 }) });
    return eachDayOfInterval({ start: startOfMonth(dateObj), end: endOfMonth(dateObj) });
  }, [dateObj, range]);

  const statsData = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);

    selectedPeriod.forEach(day => {
      const dKey = formatDate(day);
      const dayRec = allRecords[dKey]?.hours || {};
      HOURS.forEach(h => {
        const actualRec = dayRec[h] || [];
        actualRec.forEach(tid => {
          if (stats[tid] !== undefined) stats[tid] += (1 / actualRec.length);
        });
      });
    });

    // 计算周期内的目标
    const periodDays = selectedPeriod.length;

    return tasks.map(t => {
      const actual = stats[t.id] || 0;
      const dailyGoal = t.targets ? (t.targets.value / t.targets.frequency) : 0;
      const periodGoal = dailyGoal * periodDays;
      const progress = periodGoal > 0 ? Math.min((actual / periodGoal) * 100, 100) : 0;

      return {
        ...t,
        actual,
        goal: periodGoal,
        progress
      };
    }).filter(t => t.actual > 0 || t.goal > 0).sort((a, b) => b.actual - a.actual);
  }, [selectedPeriod, allRecords, tasks]);

  const pieData = useMemo(() => {
    return statsData
      .filter(s => s.actual > 0)
      .map(s => ({ name: s.name, value: parseFloat(s.actual.toFixed(1)), color: s.color }));
  }, [statsData]);

  if (!isOpen) return null;

  const content = (
    <div className={cn(
        "bg-white flex flex-col overflow-hidden",
        isModal ? "rounded-xl w-full max-w-2xl h-[85vh] border border-stone-300 shadow-2xl animate-in zoom-in-95 duration-200" : "h-full w-full"
    )}>
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <TrendingUp size={18} />
                </div>
                <div>
                    <h3 className="font-black text-stone-800 text-sm">时间统计</h3>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                        {range === 'day' ? format(dateObj, 'yyyy-MM-dd', { locale: zhCN }) : 
                         range === 'week' ? `${format(selectedPeriod[0], 'MM/dd')} - ${format(selectedPeriod[6], 'MM/dd')}` :
                         format(dateObj, 'yyyy年 MM月', { locale: zhCN })}
                    </p>
                </div>
            </div>
            
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {(['day', 'week', 'month'] as StatsRange[]).map((r) => (
                    <button 
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                            "px-3 py-1 text-[10px] font-black rounded-md transition-all",
                            range === r ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                    >
                        {r === 'day' ? '日' : r === 'week' ? '周' : '月'}
                    </button>
                ))}
            </div>

            {isModal && (
                <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400 ml-2">
                    <X size={20} />
                </button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30 p-4 space-y-4">
            
            {/* 时长分布环形图 */}
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2 mb-6">
                    <LayoutGrid size={14} className="text-indigo-600" />
                    任务时长比例
                </h3>
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    <div className="h-48 w-48 shrink-0">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-200 border-2 border-dashed border-stone-100 rounded-full">
                                <span className="text-[10px] font-bold">无数据</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3">
                        {statsData.filter(s => s.actual > 0).map(stat => (
                            <div key={stat.id} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-stone-600 truncate">{stat.name}</span>
                                    <span className="text-[11px] font-black text-stone-900 tabular-nums">{stat.actual.toFixed(1)}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 目标完成情况 (代替周趋势图) */}
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Award size={14} className="text-indigo-600" />
                    目标完成情况
                </h3>
                <div className="space-y-4">
                    {statsData.filter(s => s.goal > 0).map(stat => (
                        <div key={stat.id} className="space-y-1.5">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[11px] font-bold text-stone-700">{stat.name}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[10px] font-black text-stone-900">{stat.actual.toFixed(1)} / {stat.goal.toFixed(1)}h</span>
                                    <span className="text-[9px] font-black text-indigo-500">{Math.round(stat.progress)}%</span>
                                </div>
                            </div>
                            <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ 
                                        width: `${stat.progress}%`, 
                                        backgroundColor: stat.color 
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    {statsData.filter(s => s.goal > 0).length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center text-stone-300 gap-1 bg-stone-50/50 rounded-xl">
                            <Target size={24} className="opacity-10" />
                            <span className="text-[9px] font-bold">本时段未设置量化目标</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 统计详情列表 */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={14} className="text-stone-400" />
                        详细记录
                    </h3>
                    <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest">
                        共 {statsData.filter(s => s.actual > 0).length} 项行为
                    </span>
                </div>
                <div className="divide-y divide-stone-50">
                    {statsData.filter(s => s.actual > 0).map(stat => (
                        <div key={stat.id} className="px-6 py-3 flex items-center justify-between group hover:bg-stone-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: stat.color }} />
                                <span className="text-xs font-bold text-stone-700">{stat.name}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-stone-900">{stat.actual.toFixed(1)}</span>
                                <span className="text-[9px] font-bold text-stone-300 uppercase">Hours</span>
                            </div>
                        </div>
                    ))}
                    {statsData.filter(s => s.actual > 0).length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-stone-300 gap-2">
                            <CalendarIcon size={24} className="opacity-10" />
                            <span className="text-[10px] font-bold">本时段暂无活跃记录</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );

  return isModal ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
        {content}
    </div>
  ) : content;
};
