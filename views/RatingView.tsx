
import React, { useState, useMemo } from 'react';
import { DayRating, RatingItem, ShopItem, Redemption } from '../types';
import { cn, formatDate, generateId } from '../utils';
import { MessageSquareQuote, Plus, Settings2, X, Trash2, Info, BarChart2, ShoppingBag, Coins, Edit2, Save, AlertCircle, TrendingUp } from 'lucide-react';
import { startOfWeek, addDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RatingViewProps {
  currentDate: Date;
  ratings: Record<string, DayRating>;
  ratingItems: RatingItem[];
  shopItems: ShopItem[];
  redemptions: Redemption[];
  onUpdateRating: (dateKey: string, rating: DayRating) => void;
  onUpdateRatingItems: (items: RatingItem[]) => void;
  onUpdateShopItems: (items: ShopItem[]) => void;
  onRedeem: (item: ShopItem) => void;
  isStatsOpen: boolean;
  onToggleStats: (open: boolean) => void;
}

const SCORES = [-2, -1, 0, 1, 2];

export const RatingView: React.FC<RatingViewProps> = ({ 
  currentDate, 
  ratings, 
  ratingItems, 
  shopItems,
  redemptions,
  onUpdateRating,
  onUpdateRatingItems,
  onUpdateShopItems,
  onRedeem,
  isStatsOpen,
  onToggleStats
}) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RatingItem | null>(null);
  const [editingShopItem, setEditingShopItem] = useState<ShopItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const dateKey = formatDate(currentDate);
  const currentRating = ratings[dateKey] || { scores: {}, comment: '' };

  // Calculate Points
  const { lifetimeScore, balance } = useMemo(() => {
    let totalScore = 0;
    Object.values(ratings).forEach((day: DayRating) => {
        if (day.scores) {
            const daySum = (Object.values(day.scores) as number[]).reduce((a, b) => a + b, 0);
            totalScore += daySum;
        }
    });
    
    const spentPoints = redemptions.reduce((acc, r) => acc + r.cost, 0);
    return { lifetimeScore: totalScore, balance: totalScore - spentPoints };
  }, [ratings, redemptions]);

  const todayScore = (Object.values(currentRating.scores) as number[]).reduce((a, b) => a + b, 0);

  const handleScoreSelect = (itemId: string, score: number) => {
    const newScores = { ...currentRating.scores };
    if (newScores[itemId] === score) {
        delete newScores[itemId];
    } else {
        newScores[itemId] = score;
    }
    onUpdateRating(dateKey, { ...currentRating, scores: newScores });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateRating(dateKey, { ...currentRating, comment: e.target.value });
  };

  const getScoreColor = (score: number) => {
    if (score > 0) return 'text-emerald-500';
    if (score < 0) return 'text-rose-500';
    return 'text-stone-400';
  };

  const getScoreBg = (score: number, active: boolean) => {
    if (!active) return 'bg-white border-stone-100 text-stone-400 hover:border-stone-200';
    if (score === 2) return 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105';
    if (score === 1) return 'bg-emerald-400 text-white border-emerald-400';
    if (score === 0) return 'bg-stone-500 text-white border-stone-500';
    if (score === -1) return 'bg-rose-400 text-white border-rose-400';
    if (score === -2) return 'bg-rose-600 text-white border-rose-600 shadow-md scale-105';
    return '';
  };

  const saveRatingItem = (item: RatingItem) => {
      const exists = ratingItems.find(i => i.id === item.id);
      if (exists) onUpdateRatingItems(ratingItems.map(i => i.id === item.id ? item : i));
      else onUpdateRatingItems([...ratingItems, item]);
      setEditingItem(null);
  };

  const deleteRatingItem = (id: string) => {
      onUpdateRatingItems(ratingItems.filter(i => i.id !== id));
  };

  const saveShopItem = (item: ShopItem) => {
    const exists = shopItems.find(i => i.id === item.id);
    if (exists) onUpdateShopItems(shopItems.map(i => i.id === item.id ? item : i));
    else onUpdateShopItems([...shopItems, item]);
    setEditingShopItem(null);
    setDeleteConfirmId(null);
  };

  const handleDeleteShopItem = (id: string) => {
    if (deleteConfirmId === id) {
        onUpdateShopItems(shopItems.filter(i => i.id !== id));
        setEditingShopItem(null);
        setDeleteConfirmId(null);
    } else {
        setDeleteConfirmId(id);
    }
  };

  // --- Modals ---

  const StatsModal = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    const getCellColor = (score?: number) => {
        if (score === undefined) return 'bg-stone-50 text-transparent';
        if (score === 2) return 'bg-emerald-500 text-white';
        if (score === 1) return 'bg-emerald-300 text-white';
        if (score === 0) return 'bg-stone-300 text-white';
        if (score === -1) return 'bg-rose-300 text-white';
        if (score === -2) return 'bg-rose-500 text-white';
        return 'bg-stone-50 text-transparent';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 p-2 sm:p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-lg flex flex-col border border-stone-300 shadow-2xl overflow-hidden max-h-[85vh]">
                <div className="px-4 py-4 sm:px-6 sm:py-5 bg-stone-50 border-b border-stone-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <TrendingUp size={18} className="text-primary" />
                        <div>
                            <h3 className="font-black text-stone-800 text-xs sm:text-sm">评估趋势</h3>
                            <p className="text-[8px] sm:text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                {format(weekStart, 'M月d日')} - {format(weekDates[6], 'M月d日')}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => onToggleStats(false)} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-4 sm:p-6 overflow-x-auto custom-scrollbar flex-1 bg-white">
                    <div className="min-w-full">
                        {/* Header: Weekdays */}
                        <div className="flex mb-4">
                            <div className="w-16 sm:w-24 shrink-0"></div>
                            {weekDates.map(d => {
                                const isToday = formatDate(d) === formatDate(new Date());
                                return (
                                    <div key={d.toString()} className="flex-1 flex flex-col items-center justify-center gap-1">
                                        <span className={cn(
                                            "text-[8px] sm:text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full",
                                            isToday ? "bg-stone-900 text-white" : "text-stone-300"
                                        )}>{format(d, 'd')}</span>
                                        <span className={cn(
                                            "text-[9px] sm:text-[10px] font-black",
                                            isToday ? "text-stone-900" : "text-stone-500"
                                        )}>{format(d, 'EE', { locale: zhCN }).replace('周', '')}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Body: Grid */}
                        <div className="space-y-2">
                            {ratingItems.map(item => (
                                <div key={item.id} className="flex items-center group">
                                    <div className="w-16 sm:w-24 shrink-0 pr-2">
                                        <div className="text-[10px] sm:text-[12px] font-bold text-stone-500 truncate leading-tight group-hover:text-stone-900 transition-colors" title={item.name}>
                                            {item.name}
                                        </div>
                                    </div>
                                    {weekDates.map(d => {
                                        const k = formatDate(d);
                                        const score = ratings[k]?.scores?.[item.id];
                                        return (
                                            <div key={k} className="flex-1 h-8 sm:h-10 flex items-center justify-center p-0.5">
                                                <div className={cn(
                                                    "w-full h-full rounded sm:rounded-lg shadow-sm transition-all flex items-center justify-center text-[9px] sm:text-[11px] font-black",
                                                    getCellColor(score)
                                                )}>
                                                    {score !== undefined && (score > 0 ? `+${score}` : score)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-4 text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-rose-500"></div> -2</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-rose-300"></div> -1</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-stone-300"></div> 0</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-300"></div> +1</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500"></div> +2</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  const ShopModal = () => {
      const canAfford = (cost: number) => balance >= cost;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-lg flex flex-col border border-stone-300 shadow-2xl overflow-hidden max-h-[85vh]">
                <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <ShoppingBag size={18} />
                        </div>
                        <div>
                            <h3 className="font-black text-stone-800 text-sm">积分商店</h3>
                            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 leading-none mt-0.5">
                                <Coins size={10} /> 结余: {balance}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsShopModalOpen(false)} className="p-1.5 hover:bg-emerald-200/50 rounded-full transition-colors text-emerald-600">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-3.5 overflow-y-auto custom-scrollbar flex-1 bg-stone-50/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {shopItems.map(item => (
                            <div key={item.id} className="bg-white rounded-xl p-2.5 border border-stone-100 shadow-sm flex flex-col gap-1 transition-all group relative">
                                <button 
                                    onClick={() => setEditingShopItem(item)}
                                    className="absolute top-1.5 right-1.5 p-1 text-stone-300 hover:text-stone-800 opacity-0 group-hover:opacity-100 transition-all bg-stone-50 rounded-md"
                                >
                                    <Edit2 size={9} />
                                </button>
                                
                                <div className="text-xl mt-0.5">{item.icon}</div>
                                
                                <div className="text-left px-0.5 flex-1 min-h-[32px]">
                                    <h4 className="font-bold text-stone-800 text-[11px] truncate leading-tight">{item.name}</h4>
                                    <div className="text-[9px] font-black text-amber-500 mt-0.5 flex items-center gap-1">
                                        <Coins size={8} /> {item.cost}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => onRedeem(item)}
                                    disabled={!canAfford(item.cost)}
                                    className={cn(
                                        "w-full py-1 rounded-lg text-[9px] font-black transition-all active:scale-95",
                                        canAfford(item.cost) 
                                            ? "bg-stone-900 text-white shadow-sm" 
                                            : "bg-stone-100 text-stone-300 cursor-not-allowed"
                                    )}
                                >
                                    {canAfford(item.cost) ? '兑换' : '不足'}
                                </button>
                            </div>
                        ))}
                         <button 
                            className="bg-white/40 rounded-xl p-2 border border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-primary hover:border-primary transition-all min-h-[90px]"
                            onClick={() => setEditingShopItem({ id: generateId(), name: '', cost: 10, icon: '🎁' })}
                         >
                             <Plus size={14} />
                             <span className="text-[9px] font-bold">新项目</span>
                         </button>
                    </div>
                </div>

                <div className="px-5 py-3 bg-white border-t border-stone-100 shrink-0">
                    <h4 className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1.5">近期消费</h4>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar min-h-[30px]">
                        {redemptions.slice(0, 5).map(r => (
                            <div key={r.id} className="px-2 py-1 bg-stone-50 rounded-md border border-stone-100 flex items-center gap-1 shrink-0">
                                <span className="text-xs">{shopItems.find(s => s.id === r.shopItemId)?.icon || '🎁'}</span>
                                <span className="text-[9px] font-bold text-stone-500 max-w-[50px] truncate">{r.itemName}</span>
                                <span className="text-[9px] font-black text-rose-400">-{r.cost}</span>
                            </div>
                        ))}
                        {redemptions.length === 0 && <span className="text-[9px] text-stone-200 italic">暂无...</span>}
                    </div>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="px-5 py-4 space-y-5 pb-32">
        
        {/* Dashboard Section */}
        <section className="bg-stone-900 rounded-[2rem] p-5 text-white flex flex-col items-center gap-3 relative overflow-hidden shadow-lg">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full -ml-12 -mb-12 blur-2xl" />
           
           <div className="flex items-center justify-between w-full relative z-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">当前总积分</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-4xl font-black tabular-nums tracking-tighter text-emerald-400">{balance}</span>
                        <Coins size={16} className="text-emerald-400" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsShopModalOpen(true)}
                        className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-900/20 transition-all active:scale-90"
                        title="前往商店"
                    >
                        <ShoppingBag size={18} />
                    </button>
                </div>
           </div>
           
           <div className="w-full h-px bg-white/10" />
           
           <div className="flex items-center justify-between w-full relative z-10 px-1">
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">今日积分</span>
                    <span className={cn("text-xs font-black", todayScore >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {todayScore > 0 ? `+${todayScore}` : todayScore}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">历史总计</span>
                    <span className="text-xs font-black text-white/70">{lifetimeScore}</span>
                </div>
           </div>
        </section>

        {/* Rating Content */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
             <div className="flex flex-col gap-0.5">
                <h3 className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] leading-none">自律评估</h3>
                <p className="text-sm font-black text-stone-800 tracking-tight">多维度打分</p>
             </div>
             <button onClick={() => setIsConfigModalOpen(true)} className="p-1.5 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-400 border border-stone-100 transition-all active:scale-95">
                <Settings2 size={14} />
             </button>
          </div>

          <div className="space-y-3">
             {ratingItems.map(item => {
                 const selectedScore = currentRating.scores[item.id];
                 return (
                    <div key={item.id} className="bg-stone-50/50 rounded-2xl p-3.5 border border-stone-100 space-y-3 transition-all hover:bg-stone-50">
                        <div className="flex justify-between items-center px-0.5">
                            <h3 className="text-[12px] font-black text-stone-700">{item.name}</h3>
                            {selectedScore !== undefined && (
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-stone-100 shadow-sm", getScoreColor(selectedScore))}>
                                    {item.reasons[selectedScore]}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            {SCORES.map(score => (
                                <button
                                    key={score}
                                    onClick={() => handleScoreSelect(item.id, score)}
                                    className={cn(
                                        "flex-1 h-8 rounded-lg border text-[10px] font-black transition-all flex items-center justify-center active:scale-90",
                                        getScoreBg(score, selectedScore === score)
                                    )}
                                >
                                    {score > 0 ? `+${score}` : score}
                                </button>
                            ))}
                        </div>
                    </div>
                 );
             })}
             {ratingItems.length === 0 && (
                 <div className="py-10 flex flex-col items-center justify-center text-stone-300 gap-2 border-2 border-dashed border-stone-100 rounded-2xl bg-stone-50/20">
                     <Info size={20} />
                     <p className="text-[10px] font-bold">点击右上角齿轮添加评分维度</p>
                 </div>
             )}
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
             <MessageSquareQuote size={14} className="text-stone-300" />
             <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">今日心路</h3>
          </div>
          <textarea
            value={currentRating.comment}
            onChange={handleCommentChange}
            placeholder="写下今天的感悟、挫败或成就..."
            className="w-full h-28 p-4 bg-stone-50 rounded-2xl border border-stone-100 focus:border-stone-400 focus:bg-white focus:outline-none transition-all text-xs font-medium text-stone-700 resize-none leading-relaxed shadow-inner"
          />
        </section>
      </div>

      {/* Item Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-stone-300 shadow-2xl">
                <div className="px-6 py-5 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                    <h3 className="font-black text-stone-800 text-sm">维度配置</h3>
                    <button onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                    {ratingItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-100 group">
                            <span className="font-bold text-stone-700 text-sm">{item.name}</span>
                            <div className="flex gap-1.5">
                                <button onClick={() => setEditingItem(item)} className="p-2 hover:bg-white hover:text-primary rounded-lg border border-transparent hover:border-stone-200 transition-all">
                                    <Settings2 size={14} />
                                </button>
                                <button onClick={() => deleteRatingItem(item.id)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-lg border border-transparent hover:border-rose-100 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => setEditingItem({ id: generateId(), name: '', reasons: { [-2]: '极差', [-1]: '较差', [0]: '一般', [1]: '较好', [2]: '极好' } })}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-2 font-bold text-xs"
                    >
                        <Plus size={16} /> 新增维度
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Shop Item Editor Modal */}
      {editingShopItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/80 p-4 backdrop-blur-md">
              <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col border border-stone-400 shadow-2xl">
                  <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                      <h3 className="font-black text-sm text-stone-800">奖励设置</h3>
                      <button onClick={() => { setEditingShopItem(null); setDeleteConfirmId(null); }} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
                        <X size={18} />
                      </button>
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      <div className="flex gap-4">
                          <div className="space-y-2 shrink-0">
                             <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Icon</label>
                             <input type="text" value={editingShopItem.icon} onChange={e => setEditingShopItem({...editingShopItem, icon: e.target.value})} className="w-16 h-16 text-3xl text-center bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 shadow-inner" />
                          </div>
                          <div className="space-y-2 flex-1">
                             <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">名称</label>
                             <input type="text" value={editingShopItem.name} onChange={e => setEditingShopItem({...editingShopItem, name: e.target.value})} className="w-full h-16 px-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 font-bold text-sm" placeholder="如：买件新衣服" />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">花费积分</label>
                          <div className="relative">
                              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                              <input type="number" value={editingShopItem.cost} onChange={e => setEditingShopItem({...editingShopItem, cost: parseInt(e.target.value) || 0})} className="w-full h-14 pl-12 pr-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 font-black text-lg" />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 bg-stone-50 border-t border-stone-200 flex gap-2">
                      <button 
                        onClick={() => handleDeleteShopItem(editingShopItem.id)} 
                        className={cn(
                            "px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-bold text-[11px]",
                            deleteConfirmId === editingShopItem.id 
                                ? "bg-rose-600 text-white flex-1" 
                                : "bg-white border border-rose-100 text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        {deleteConfirmId === editingShopItem.id ? (
                            <><AlertCircle size={16} /> 确认删除？</>
                        ) : (
                            <Trash2 size={18} />
                        )}
                      </button>
                      
                      {deleteConfirmId !== editingShopItem.id && (
                        <button onClick={() => setEditingShopItem(null)} className="flex-1 py-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-400">取消</button>
                      )}
                      
                      <button onClick={() => saveShopItem(editingShopItem)} disabled={!editingShopItem.name} className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                        <Save size={16} /> 保存
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Score Dimension Editor Modal */}
      {editingItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/80 p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col border border-stone-400 shadow-2xl">
                  <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                      <h3 className="font-black text-sm text-stone-800">编辑维度</h3>
                      <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-400"><X size={18} /></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">维度名称</label>
                          <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 font-bold" placeholder="如：精力水平" />
                      </div>
                      <div className="space-y-3">
                          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">理由定义</label>
                          {SCORES.map(s => (
                              <div key={s} className="flex items-center gap-3">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border", s > 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : (s < 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-stone-50 text-stone-400 border-stone-200"))}>
                                      {s > 0 ? `+${s}` : s}
                                  </div>
                                  <input type="text" value={editingItem.reasons[s]} onChange={e => setEditingItem({...editingItem, reasons: {...editingItem.reasons, [s]: e.target.value}})} className="flex-1 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg text-xs font-medium focus:outline-none focus:bg-white" />
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 bg-stone-50 border-t border-stone-200 flex gap-2">
                      <button onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-400">取消</button>
                      <button onClick={() => saveRatingItem(editingItem)} disabled={!editingItem.name.trim()} className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-xs font-bold disabled:opacity-50">保存</button>
                  </div>
              </div>
          </div>
      )}

      {isStatsOpen && <StatsModal />}
      {isShopModalOpen && <ShopModal />}
    </div>
  );
};
