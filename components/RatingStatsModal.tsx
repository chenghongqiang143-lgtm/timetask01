
import React, { useState, useMemo } from 'react';
import { DayRating, RatingItem } from '../types';
import { X, TrendingUp, Calendar, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  startOfMonth, 
  endOfMonth,
  isSameDay,
  isSameMonth
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn, formatDate } from '../utils';

interface RatingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: Record<string, DayRating>;
  ratingItems: RatingItem[];
  currentDate: Date;
}

export const RatingStatsModal: React.FC<RatingStatsModalProps> = ({
  isOpen,
  onClose,
  ratings,
  ratingItems,
  currentDate
}) => {
  const [range, setRange] = useState<'week' | 'month'>('week');

  const periodInterval = useMemo(() => {
    if (range === 'week') {
      return { 
        start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
        end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
      };
    } else {
      return { 
        start: startOfMonth(currentDate), 
        end: endOfMonth(currentDate) 
      };
    }
  }, [currentDate, range]);

  const days = useMemo(() => eachDayOfInterval(periodInterval), [periodInterval]);

  const statsSummary = useMemo(() => {
    let total = 0;
    let count = 0;
    days.forEach(day => {
      const key = formatDate(day);
      const rating = ratings[key];
      if (rating && rating.scores) {
        // Fix: Explicitly type reduce as returning a number and cast current value b to number to resolve 'unknown' type errors
        const daySum = Object.values(rating.scores).reduce<number>((a, b) => a + (b as number), 0);
        total += daySum;
        count++;
      }
    });
    return { total, count, avg: count > 0 ? (total / count).toFixed(1) : '0' };
  }, [days, ratings]);

  const getScoreColor = (score: number) => {
    if (score === 2) return 'bg-emerald-600 text-white';
    if (score === 1) return 'bg-emerald-400 text-white';
    if (score === 0) return 'bg-stone-200 text-stone-500';
    if (score === -1) return 'bg-rose-400 text-white';
    if (score === -2) return 'bg-rose-600 text-white';
    return 'bg-stone-50 border-stone-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] border border-stone-300 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        <header className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-black text-stone-800 text-sm">评估趋势统计</h3>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                {format(periodInterval.start, 'M月d日')} - {format(periodInterval.end, 'M月d日')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button 
                  onClick={() => setRange('week')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", range === 'week' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}
                >
                  本周
                </button>
                <button 
                  onClick={() => setRange('month')}
                  className={cn("px-3 py-1 text-[10px] font-black rounded-md transition-all", range === 'month' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}
                >
                  本月
                </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50/30 p-6 space-y-6">
          
          {/* 总分卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-1">
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">周期得分汇总</span>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-4xl font-black tabular-nums tracking-tighter", statsSummary.total >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {statsSummary.total > 0 ? `+${statsSummary.total}` : statsSummary.total}
                </span>
                <span className="text-[10px] font-bold text-stone-300">PTS</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-1">
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">日均评估表现</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums tracking-tighter text-stone-800">{statsSummary.avg}</span>
                <Star size={16} className="text-amber-400 fill-current" />
              </div>
            </div>
          </div>

          {/* 各维度详细矩阵 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar size={14} className="text-stone-300" />
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">维度热力 analysis</h4>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm overflow-x-auto no-scrollbar">
              <div className="min-w-[400px]">
                {/* 日期头部 */}
                <div className="flex mb-3">
                  <div className="w-24 shrink-0"></div>
                  <div className="flex-1 flex justify-around">
                    {days.map(d => (
                      <div key={d.toString()} className="w-6 flex flex-col items-center gap-0.5">
                        <span className="text-[8px] font-black text-stone-300 uppercase">{format(d, 'EE', { locale: zhCN }).replace('周', '')}</span>
                        <span className={cn(
                          "text-[9px] font-bold",
                          isSameDay(d, new Date()) ? "text-primary" : "text-stone-400"
                        )}>{format(d, 'd')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 维度行 */}
                <div className="space-y-2">
                  {ratingItems.map(item => (
                    <div key={item.id} className="flex items-center group">
                      <div className="w-24 shrink-0 pr-2">
                        <div className="text-[11px] font-black text-stone-600 truncate group-hover:text-stone-900 transition-colors">
                          {item.name}
                        </div>
                      </div>
                      <div className="flex-1 flex justify-around">
                        {days.map(day => {
                          const dateStr = formatDate(day);
                          const score = ratings[dateStr]?.scores?.[item.id];
                          const hasData = score !== undefined;
                          
                          return (
                            <div 
                              key={dateStr}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black transition-all border shadow-sm",
                                hasData ? getScoreColor(score) : "bg-stone-50 border-stone-100 opacity-20"
                              )}
                            >
                              {hasData ? (score > 0 ? `+${score}` : score) : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-600" />
              <span className="text-[9px] font-black text-stone-400">+2 极佳</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              <span className="text-[9px] font-black text-stone-400">+1 较好</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-stone-200" />
              <span className="text-[9px] font-black text-stone-400">0 一般</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-400" />
              <span className="text-[9px] font-black text-stone-400">-1 略差</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-600" />
              <span className="text-[9px] font-black text-stone-400">-2 极差</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
