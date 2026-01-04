
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, ListTodo, LayoutGrid, ClipboardCheck, Settings, BarChart2, CalendarDays, StarHalf, TrendingUp } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData, Objective, Todo, DayRating } from './types';
import { loadState, saveState, DEFAULT_TASKS, DEFAULT_RATING_ITEMS, DEFAULT_SHOP_ITEMS, getInitialState } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { TrackerView } from './views/TrackerView';
import { TodoView } from './views/TodoView';
import { SettingsTab } from './views/SettingsTab';
import { StatsView } from './views/StatsView';
import { RatingView } from './views/RatingView';
import { TaskStatsModal } from './components/TaskStatsModal';
import { RatingStatsModal } from './components/RatingStatsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('todo');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isRatingStatsOpen, setIsRatingStatsOpen] = useState(false);
  
  const [requestPoolOpen, setRequestPoolOpen] = useState(0); 
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<AppState>(getInitialState());

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
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

  const updateRecurringHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({ ...prev, recurringSchedule: { ...prev.recurringSchedule, [hour]: taskIds } }));
  };
  
  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({ ...prev, records: { ...prev.records, [dateKey]: { hours: { ...currentRecord.hours, [hour]: taskIds } } } }));
  };

  const handleUpdateTask = (updatedTask: Task) => {
      setState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) }));
  };

  const handleAddTask = (newTaskPart: Omit<Task, 'id'>) => {
      const newTask = { ...newTaskPart, id: generateId() };
      setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
  };

  const handleDeleteTask = (taskId: string) => {
      setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }));
  };

  const handleUpdateCategoryOrder = (newOrder: string[]) => {
    setState(prev => ({ ...prev, categoryOrder: newOrder }));
  };

  const handleAddTodo = (todo: Todo) => { setState(prev => ({ ...prev, todos: [todo, ...prev.todos] })); };
  const handleUpdateTodo = (todo: Todo) => { setState(prev => ({ ...prev, todos: prev.todos.map(t => t.id === todo.id ? todo : t) })); };
  const handleDeleteTodo = (id: string) => { setState(prev => ({ ...prev, todos: prev.todos.filter(t => t.id !== id) })); };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `chronos_flow_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target?.result as string);
        if (importedState && typeof importedState === 'object') {
          setState(importedState);
          alert('数据恢复成功！');
        }
      } catch (err) {
        alert('导入失败，请确保文件格式正确。');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    const defaultState = getInitialState();
    setState(defaultState);
    localStorage.removeItem('chronos_flow_data_v1');
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="h-screen w-screen bg-stone-50 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4">
      <div className="w-full h-full sm:max-w-6xl sm:h-[96vh] bg-white sm:rounded-xl flex flex-col relative border border-stone-200 shadow-2xl overflow-hidden">
        
        <header className="pt-10 pb-2 px-4 bg-white/80 backdrop-blur-md flex items-center justify-between z-40 shrink-0 border-b border-stone-100">
           <div className="w-24 flex justify-start items-center">
                {activeTab === 'todo' && (
                  <button onClick={() => setRequestPoolOpen(prev => prev + 1)} className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-primary transition-all group">
                    <LayoutGrid size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-medium uppercase tracking-tighter">模板</span>
                  </button>
                )}
           </div>
           
           <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4">
                <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 text-stone-300 hover:text-stone-800 transition-all"><ChevronLeft size={20} /></button>
                <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()} className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all">
                    <span className="font-medium text-lg sm:text-xl text-stone-800">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
                    <span className="text-[9px] font-medium text-stone-400 uppercase tracking-widest mt-0.5">{format(currentDate, 'EEEE', { locale: zhCN })}</span>
                    <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={format(currentDate, 'yyyy-MM-dd')} onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))} />
                </button>
                <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 text-stone-300 hover:text-stone-800 transition-all"><ChevronRight size={20} /></button>
           </div>
           
           <div className="w-24 flex justify-end items-center">
                {activeTab === 'todo' && (
                  <button onClick={() => setIsTaskStatsOpen(true)} className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-primary transition-all group">
                    <CalendarDays size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-medium uppercase tracking-tighter">任务统计</span>
                  </button>
                )}
                {activeTab === 'record' && (
                  <button onClick={() => setIsStatsOpen(true)} className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-primary transition-all group">
                    <BarChart2 size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-medium uppercase tracking-tighter">时间统计</span>
                  </button>
                )}
                {activeTab === 'stats' && (
                  <button onClick={() => setIsRatingStatsOpen(true)} className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-primary transition-all group">
                    <TrendingUp size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-medium uppercase tracking-tighter">打分统计</span>
                  </button>
                )}
           </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-white">
          {activeTab === 'todo' && (
            <TodoView 
              todos={state.todos} objectives={state.objectives} tasks={state.tasks}
              onAddTodo={handleAddTodo} onUpdateTodo={handleUpdateTodo} onDeleteTodo={handleDeleteTodo}
              onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
              requestPoolOpenTrigger={requestPoolOpen} categoryOrder={state.categoryOrder}
              onAddObjective={(obj) => setState(prev => ({...prev, objectives: [...prev.objectives, obj], categoryOrder: [...prev.categoryOrder, obj.id]}))}
              onDeleteObjective={(id) => setState(prev => ({
                ...prev, objectives: prev.objectives.filter(o => o.id !== id), 
                categoryOrder: prev.categoryOrder.filter(c => c !== id),
                tasks: prev.tasks.map(t => t.category === id ? { ...t, category: 'uncategorized' } : t),
                todos: prev.todos.map(t => t.objectiveId === id ? { ...t, objectiveId: 'none' } : t)
              }))}
            />
          )}

          {activeTab === 'record' && (
            <TrackerView 
                tasks={state.tasks} objectives={state.objectives} categoryOrder={state.categoryOrder} 
                scheduleData={currentSchedule} recordData={currentRecord} 
                recurringSchedule={state.recurringSchedule}
                allRecords={state.records} 
                onUpdateRecord={updateRecordHour} 
                onUpdateSchedule={updateScheduleHour}
                onUpdateRecurring={updateRecurringHour}
                onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                onAddTodo={handleAddTodo} currentDate={currentDate}
            />
          )}

          {activeTab === 'stats' && (
            <RatingView 
              currentDate={currentDate} ratings={state.ratings} ratingItems={state.ratingItems}
              shopItems={state.shopItems} redemptions={state.redemptions}
              onUpdateRating={(dateKey, rating) => setState(prev => ({ ...prev, ratings: { ...prev.ratings, [dateKey]: rating } }))}
              onUpdateRatingItems={(items) => setState(prev => ({ ...prev, ratingItems: items }))}
              onUpdateShopItems={(items) => setState(prev => ({ ...prev, shopItems: items }))}
              onRedeem={(item) => {
                const totalScore = Object.values(state.ratings).reduce<number>((acc, r: DayRating) => 
                  acc + Object.values(r.scores || {}).reduce<number>((a, b) => a + (b as number), 0), 0);
                const spent = state.redemptions.reduce((acc, r) => acc + r.cost, 0);
                if (totalScore - spent >= item.cost) {
                    const newRedemption = { id: generateId(), shopItemId: item.id, itemName: item.name, cost: item.cost, date: new Date().toISOString() };
                    setState(prev => ({ ...prev, redemptions: [newRedemption, ...prev.redemptions] }));
                }
              }}
              isStatsOpen={false} onToggleStats={() => {}}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab 
                tasks={state.tasks} categoryOrder={state.categoryOrder} objectives={state.objectives}
                onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} 
                onUpdateCategoryOrder={handleUpdateCategoryOrder}
                onAddObjective={(obj) => setState(prev => ({...prev, objectives: [...prev.objectives, obj], categoryOrder: [...prev.categoryOrder, obj.id]}))}
                onUpdateObjective={(obj) => setState(prev => ({...prev, objectives: prev.objectives.map(o => o.id === obj.id ? obj : o)}))}
                onDeleteObjective={(id) => setState(prev => ({
                    ...prev, objectives: prev.objectives.filter(o => o.id !== id), 
                    categoryOrder: prev.categoryOrder.filter(c => c !== id),
                    tasks: prev.tasks.map(t => t.category === id ? { ...t, category: 'uncategorized' } : t),
                    todos: prev.todos.map(t => t.objectiveId === id ? { ...t, objectiveId: 'none' } : t)
                }))}
                showInstallButton={false} onInstall={() => {}} 
                onExportData={handleExportData} 
                onImportData={handleImportData} 
                onClearData={handleClearData} 
                allSchedules={state.schedule} allRecords={state.records} currentDate={currentDate} 
            />
          )}
        </main>

        <div className="h-24 bg-white border-t border-stone-100 flex items-start justify-center px-4 z-40 shrink-0">
            <nav className="w-full max-w-md mt-3 bg-stone-100 rounded-xl px-2 py-2 flex items-center justify-between border border-stone-200">
                <NavButton label="安排" active={activeTab === 'todo'} onClick={() => setActiveTab('todo')} icon={<ListTodo size={18} />} />
                <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<ClipboardCheck size={18} />} />
                <NavButton label="打分" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<StarHalf size={18} />} />
                <NavButton label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} />
            </nav>
        </div>

        {isStatsOpen && (
             <StatsView 
                tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord}
                allSchedules={state.schedule} recurringSchedule={state.recurringSchedule} allRecords={state.records}
                dateObj={currentDate} isOpen={true} isModal={true} onClose={() => setIsStatsOpen(false)}
             />
        )}

        {isTaskStatsOpen && (
          <TaskStatsModal 
            isOpen={true} onClose={() => setIsTaskStatsOpen(false)}
            todos={state.todos} objectives={state.objectives} currentDate={currentDate}
          />
        )}

        {isRatingStatsOpen && (
          <RatingStatsModal
            isOpen={true} onClose={() => setIsRatingStatsOpen(false)}
            ratings={state.ratings} ratingItems={state.ratingItems} currentDate={currentDate}
          />
        )}
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={cn("flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-lg transition-all duration-300 gap-1", active ? "text-primary bg-white border border-stone-200 shadow-sm" : "text-stone-400 hover:text-stone-600")}>
    <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
    <span className={cn("text-[8px] font-medium tracking-tight uppercase", active ? "opacity-100" : "opacity-60")}>{label}</span>
  </button>
);
