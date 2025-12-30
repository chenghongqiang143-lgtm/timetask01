
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart2, Settings, ChevronLeft, ChevronRight, CalendarDays, Activity, Star } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, DayRating, RatingItem, Redemption, ShopItem } from './types';
import { loadState, saveState, DEFAULT_TASKS, DEFAULT_RATING_ITEMS } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { TrackerView } from './views/TrackerView';
import { StatsView } from './views/StatsView';
import { SettingsTab } from './views/SettingsTab';
import { RatingView } from './views/RatingView';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tracker');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<AppState>({
      tasks: [],
      ratingItems: [],
      shopItems: [],
      redemptions: [],
      schedule: {},
      recurringSchedule: {},
      records: {},
      ratings: {},
  });

  useEffect(() => {
    setState(loadState());
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => { saveState(state); }, [state]);

  const dateKey = formatDate(currentDate);

  const currentSchedule: DayData = useMemo(() => {
      const specificDayData = state.schedule[dateKey] || { hours: {} };
      const recurringData = state.recurringSchedule || {};
      const mergedHours: Record<number, string[]> = { ...specificDayData.hours };
      Object.keys(recurringData).forEach(k => {
          const hour = parseInt(k);
          const recTasks = recurringData[hour] || [];
          const existing = mergedHours[hour] || [];
          mergedHours[hour] = Array.from(new Set([...existing, ...recTasks]));
      });
      return { hours: mergedHours };
  }, [state.schedule, state.recurringSchedule, dateKey]);

  const currentRecord: DayData = state.records[dateKey] || { hours: {} };

  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({ ...prev, schedule: { ...prev.schedule, [dateKey]: { hours: { ...prev.schedule[dateKey]?.hours, [hour]: taskIds } } } }));
  };
  
  const updateRecurringSchedule = (hour: number, taskIds: string[]) => {
      setState(prev => ({ ...prev, recurringSchedule: { ...prev.recurringSchedule, [hour]: taskIds } }));
  };

  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({ ...prev, records: { ...prev.records, [dateKey]: { hours: { ...currentRecord.hours, [hour]: taskIds } } } }));
  };

  const handleUpdateRating = (key: string, rating: DayRating) => {
    setState(prev => ({ ...prev, ratings: { ...prev.ratings, [key]: rating } }));
  };

  const handleUpdateRatingItems = (items: RatingItem[]) => {
    setState(prev => ({ ...prev, ratingItems: items }));
  };
  
  const handleUpdateShopItems = (items: ShopItem[]) => {
    setState(prev => ({ ...prev, shopItems: items }));
  };

  const handleRedeem = (item: ShopItem) => {
    const redemption: Redemption = {
        id: generateId(),
        shopItemId: item.id,
        itemName: item.name,
        cost: item.cost,
        date: new Date().toISOString()
    };
    setState(prev => ({ ...prev, redemptions: [redemption, ...prev.redemptions] }));
  };

  const handleUpdateTask = (updatedTask: Task) => {
      setState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) }));
  };

  const handleAddTask = (newTaskPart: Omit<Task, 'id'>) => {
      const newTask = { ...newTaskPart, id: generateId() };
      setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const handleDeleteTask = (taskId: string) => {
      if (!taskId) return;
      setState(prev => {
          const newState = JSON.parse(JSON.stringify(prev)) as AppState;
          newState.tasks = newState.tasks.filter(t => t.id !== taskId);
          const cleanup = (obj: Record<string, DayData>) => {
              Object.keys(obj).forEach(dayKey => {
                  const dayData = obj[dayKey];
                  if (dayData && dayData.hours) Object.keys(dayData.hours).forEach(hKey => {
                      const h = parseInt(hKey);
                      if (Array.isArray(dayData.hours[h])) dayData.hours[h] = dayData.hours[h].filter(id => id !== taskId);
                  });
              });
          };
          cleanup(newState.schedule);
          cleanup(newState.records);
          if (newState.recurringSchedule) Object.keys(newState.recurringSchedule).forEach(hKey => {
              const h = parseInt(hKey);
              if (Array.isArray(newState.recurringSchedule[h])) newState.recurringSchedule[h] = newState.recurringSchedule[h].filter(id => id !== taskId);
          });
          return newState;
      });
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setInstallPrompt(null);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronos_flow_data_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json && json.tasks && Array.isArray(json.tasks)) {
           setState(json);
           alert("数据导入成功");
        } else alert("无效的数据文件");
      } catch (err) {
        alert("解析文件失败");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setState({
      tasks: DEFAULT_TASKS,
      ratingItems: DEFAULT_RATING_ITEMS,
      shopItems: [],
      redemptions: [],
      schedule: {},
      recurringSchedule: {},
      records: {},
      ratings: {},
    });
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, day));
    }
  };

  const triggerDatePicker = () => {
    if (dateInputRef.current) {
        try {
            if ('showPicker' in HTMLInputElement.prototype) (dateInputRef.current as any).showPicker();
            else dateInputRef.current.click();
        } catch (e) {
            dateInputRef.current.click();
        }
    }
  };

  return (
    <div className="h-screen w-screen bg-stone-100 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-4xl sm:h-[94vh] sm:max-h-[1000px] bg-white sm:rounded-[2rem] flex flex-col relative border border-stone-200 shadow-2xl overflow-hidden">
        
        <header className="pt-8 sm:pt-10 pb-4 px-6 bg-white flex items-center justify-between z-40 select-none shrink-0 border-b border-stone-100">
           <div className="w-12 sm:w-24 flex justify-start">
               <div className="relative w-10 h-10 flex items-center justify-center">
                   <button 
                        onClick={triggerDatePicker}
                        className="w-full h-full flex items-center justify-center rounded-full bg-stone-50 text-stone-600 hover:bg-stone-100 transition-all active:scale-95 border border-stone-200"
                   >
                       <CalendarDays size={20} />
                   </button>
                   <input 
                        ref={dateInputRef} 
                        type="date" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        value={format(currentDate, 'yyyy-MM-dd')} 
                        onChange={handleDateSelect} 
                   />
               </div>
           </div>
           
           <div className="flex-1 flex items-center justify-center gap-3 sm:gap-6">
                <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-50 rounded-full transition-all active:scale-75">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="font-bold text-lg sm:text-2xl text-stone-800 tracking-tight leading-none">
                        {format(currentDate, 'M月d日', { locale: zhCN })}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">
                        {format(currentDate, 'EEEE', { locale: zhCN })}
                    </span>
                </div>
                <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-50 rounded-full transition-all active:scale-75">
                    <ChevronRight size={24} />
                </button>
           </div>
           
           <div className="w-12 sm:w-24 flex justify-end">
             {activeTab === 'tracker' && (
               <button 
                onClick={() => setActiveTab('stats')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-600 hover:bg-stone-100 transition-all active:scale-95 border border-stone-200"
               >
                 <BarChart2 size={20} />
               </button>
             )}
             {activeTab === 'stats' && (
               <button 
                onClick={() => setActiveTab('tracker')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-900 text-white shadow-lg transition-all active:scale-95"
               >
                 <Activity size={20} />
               </button>
             )}
             {activeTab === 'rating' && (
               <button 
                onClick={() => setIsRatingStatsOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-50 text-stone-600 hover:bg-stone-100 transition-all active:scale-95 border border-stone-200"
               >
                 <BarChart2 size={20} />
               </button>
             )}
           </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-white z-10">
          {activeTab === 'tracker' && (
            <TrackerView 
                tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord} 
                recurringData={state.recurringSchedule} allRecords={state.records}
                onUpdateSchedule={updateScheduleHour} onUpdateRecord={updateRecordHour}
                onUpdateRecurring={updateRecurringSchedule} onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask} currentDate={currentDate}
            />
          )}
          {activeTab === 'stats' && (
            <StatsView tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord} allSchedules={state.schedule} recurringSchedule={state.recurringSchedule} allRecords={state.records} dateObj={currentDate} />
          )}
          {activeTab === 'rating' && (
            <RatingView 
                currentDate={currentDate} ratings={state.ratings} ratingItems={state.ratingItems}
                shopItems={state.shopItems} redemptions={state.redemptions}
                onUpdateRating={handleUpdateRating} onUpdateRatingItems={handleUpdateRatingItems}
                onUpdateShopItems={handleUpdateShopItems} onRedeem={handleRedeem}
                isStatsOpen={isRatingStatsOpen} onToggleStats={setIsRatingStatsOpen}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab tasks={state.tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} showInstallButton={!!installPrompt} onInstall={handleInstallApp} onExportData={handleExportData} onImportData={handleImportData} onClearData={handleClearData} allSchedules={state.schedule} allRecords={state.records} currentDate={currentDate} />
          )}
        </main>

        <div className="h-24 bg-white border-t border-stone-100 flex items-start justify-center px-6 z-40 shrink-0">
            <nav className="w-full max-w-sm mt-3 bg-stone-100 rounded-2xl px-2 py-1.5 flex items-center justify-between border border-stone-200">
                <NavButton label="追踪" active={activeTab === 'tracker' || activeTab === 'stats'} onClick={() => setActiveTab('tracker')} icon={<Activity size={20} />} />
                <NavButton label="打分" active={activeTab === 'rating'} onClick={() => setActiveTab('rating')} icon={<Star size={20} />} />
                <NavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} />
            </nav>
        </div>
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-300 gap-1", active ? "text-primary bg-white border border-stone-200 shadow-sm" : "text-stone-400 hover:text-stone-600")}>
    <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
    <span className={cn("text-[9px] font-bold tracking-tight uppercase", active ? "opacity-100" : "opacity-60")}>{label}</span>
  </button>
);
