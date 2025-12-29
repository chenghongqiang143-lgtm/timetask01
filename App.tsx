import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, BarChart2, Settings, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData } from './types';
import { loadState, saveState, DEFAULT_TASKS } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { ScheduleView } from './views/ScheduleView';
import { RecordView } from './views/RecordView';
import { StatsView } from './views/StatsView';
import { SettingsTab } from './views/SettingsTab';
import { ReviewModal } from './components/ReviewModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // State
  const [state, setState] = useState<AppState>({
      tasks: [],
      schedule: {},
      recurringSchedule: {},
      records: {},
      reviews: {}
  });

  // Load initial data
  useEffect(() => {
    setState(loadState());

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Persist on change
  useEffect(() => {
     saveState(state);
  }, [state]);

  const dateKey = formatDate(currentDate);

  // Computed Property: Effective Schedule (Merge Recurring + Specific Day)
  const currentSchedule: DayData = useMemo(() => {
      const specificDayData = state.schedule[dateKey] || { hours: {} };
      const recurringData = state.recurringSchedule || {};
      
      const mergedHours: Record<number, string[]> = { ...specificDayData.hours };
      
      // Merge recurring tasks into specific day if not already present
      // Note: This simple merge logic implies "Addition". 
      // If a user wants to REMOVE a recurring task for a specific day, 
      // the current simple structure requires removing it from the recurring rule 
      // or we accept that recurring rules are "defaults" that appear unless overridden.
      // For this app version, we simply UNION them.
      Object.keys(recurringData).forEach(k => {
          const hour = parseInt(k);
          const recTasks = recurringData[hour] || [];
          const existing = mergedHours[hour] || [];
          // Deduplicate
          mergedHours[hour] = Array.from(new Set([...existing, ...recTasks]));
      });

      return { hours: mergedHours };
  }, [state.schedule, state.recurringSchedule, dateKey]);

  const currentRecord: DayData = state.records[dateKey] || { hours: {} };
  const currentReview: string = state.reviews[dateKey] || '';

  // --- Actions ---

  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    // When modifying a specific day, we are modifying the 'schedule' state.
    // NOTE: If a task comes from 'recurringSchedule', deleting it here visually requires 
    // it to not be in the recurring schedule OR we need a more complex 'exceptions' logic.
    // For now, to keep it consistent with "Add to every future day", we will just update the specific day.
    // If the user is in 'Repeat Mode' in UI, they will call 'updateRecurringSchedule' instead.
    setState(prev => ({
        ...prev,
        schedule: {
            ...prev.schedule,
            [dateKey]: {
                hours: { ...prev.schedule[dateKey]?.hours, [hour]: taskIds }
            }
        }
    }));
  };
  
  const updateRecurringSchedule = (hour: number, taskIds: string[]) => {
      setState(prev => ({
          ...prev,
          recurringSchedule: {
              ...prev.recurringSchedule,
              [hour]: taskIds
          }
      }));
  };

  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({
        ...prev,
        records: {
            ...prev.records,
            [dateKey]: {
                hours: { ...currentRecord.hours, [hour]: taskIds }
            }
        }
    }));
  };

  const updateReview = (text: string) => {
    setState(prev => ({
        ...prev,
        reviews: {
            ...prev.reviews,
            [dateKey]: text
        }
    }));
  };

  // Task Management
  const handleUpdateTask = (updatedTask: Task) => {
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      }));
  };

  const handleAddTask = (newTaskPart: Omit<Task, 'id'>) => {
      const newTask = { ...newTaskPart, id: generateId() };
      setState(prev => ({
          ...prev,
          tasks: [...prev.tasks, newTask]
      }));
  };

  const handleDeleteTask = (taskId: string) => {
      if (!taskId) return;

      setState(prev => {
          // Robust Deep Clone to ensure no reference artifacts remain
          const newState = JSON.parse(JSON.stringify(prev)) as AppState;

          // 1. Remove from tasks array
          newState.tasks = newState.tasks.filter(t => t.id !== taskId);

          // 2. Remove from ALL schedule entries
          Object.keys(newState.schedule).forEach(dayKey => {
              const dayData = newState.schedule[dayKey];
              if (dayData && dayData.hours) {
                  Object.keys(dayData.hours).forEach(hKey => {
                      const h = parseInt(hKey);
                      if (Array.isArray(dayData.hours[h])) {
                          dayData.hours[h] = dayData.hours[h].filter(id => id !== taskId);
                      }
                  });
              }
          });
          
          // 3. Remove from Recurring Schedule
          if (newState.recurringSchedule) {
              Object.keys(newState.recurringSchedule).forEach(hKey => {
                  const h = parseInt(hKey);
                  if (Array.isArray(newState.recurringSchedule[h])) {
                      newState.recurringSchedule[h] = newState.recurringSchedule[h].filter(id => id !== taskId);
                  }
              });
          }

          // 4. Remove from ALL record entries
          Object.keys(newState.records).forEach(dayKey => {
              const dayData = newState.records[dayKey];
              if (dayData && dayData.hours) {
                  Object.keys(dayData.hours).forEach(hKey => {
                      const h = parseInt(hKey);
                      if (Array.isArray(dayData.hours[h])) {
                          dayData.hours[h] = dayData.hours[h].filter(id => id !== taskId);
                      }
                  });
              }
          });

          return newState;
      });
  };

  // App & Data Actions
  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const handleClearData = () => {
    // Reset to initial state (Keep default tasks structure for UX, but clear all user data)
    setState({
        tasks: DEFAULT_TASKS,
        schedule: {},
        recurringSchedule: {},
        records: {},
        reviews: {}
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronos_backup_${format(new Date(), 'yyyyMMdd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const parsed = JSON.parse(content);
            // Simple validation
            if (Array.isArray(parsed.tasks) && parsed.schedule) {
                if (window.confirm('导入将覆盖当前所有数据，确定要继续吗？')) {
                    setState(parsed);
                    alert('数据导入成功！');
                }
            } else {
                alert('无效的数据文件格式');
            }
        } catch (err) {
            console.error(err);
            alert('导入失败：无法解析文件');
        }
    };
    reader.readAsText(file);
  };

  // Handle Date Picker Change
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        // Parse "yyyy-MM-dd" to Date object, ensuring local time
        const [year, month, day] = e.target.value.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, day));
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f2f2f5] sm:bg-gradient-to-br sm:from-slate-100 sm:to-indigo-50 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-6 md:p-10">
      <div className="w-full max-w-[440px] h-full sm:h-[850px] bg-white sm:rounded-[3rem] flex flex-col shadow-2xl shadow-indigo-200/40 relative overflow-hidden ring-4 ring-white/50">
        
        {/* Header */}
        <header className="pt-10 pb-4 px-5 bg-white/80 backdrop-blur-xl flex justify-between items-center z-20 select-none">
           {/* Review Button */}
           <button 
             onClick={() => setIsReviewModalOpen(true)}
             className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-soft hover:bg-white hover:shadow-md text-stone-600 transition-all active:scale-95 flex-shrink-0"
           >
             <ClipboardList size={20} />
           </button>
           
           {/* Date Navigation - Widened and Improved */}
           <div className="flex items-center gap-3 bg-stone-100/50 rounded-full p-1 pl-2 pr-2 border border-stone-50">
               <button 
                 onClick={() => setCurrentDate(subDays(currentDate, 1))} 
                 className="w-10 h-10 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-800 hover:bg-white shadow-sm transition-all active:scale-95"
               >
                 <ChevronLeft size={22} />
               </button>
               
               <div className="relative flex flex-col items-center justify-center group cursor-pointer px-4 min-w-[100px]">
                 {/* Hidden Date Input for Trigger */}
                 <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    value={format(currentDate, 'yyyy-MM-dd')}
                    onChange={handleDateSelect}
                 />
                 
                 <div className="flex items-center gap-2 transition-transform group-hover:scale-105 duration-200">
                    <span className="font-bold text-lg text-stone-800 tracking-tight leading-none">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
                 </div>
                 <span className="text-[10px] font-semibold text-stone-400 tracking-wider uppercase mt-0.5">
                   {format(currentDate, 'EEEE', { locale: zhCN })}
                 </span>
               </div>

               <button 
                 onClick={() => setCurrentDate(addDays(currentDate, 1))} 
                 className="w-10 h-10 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-800 hover:bg-white shadow-sm transition-all active:scale-95"
               >
                 <ChevronRight size={22} />
               </button>
           </div>

           {/* Settings Button */}
           <button 
             onClick={() => setActiveTab('settings')}
             className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 flex-shrink-0",
                activeTab === 'settings' 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-surface-soft hover:bg-white hover:shadow-md text-stone-600"
             )}
           >
             <Settings size={20} />
           </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-white/50">
          {activeTab === 'schedule' && (
            <ScheduleView 
                tasks={state.tasks} 
                dayData={currentSchedule}
                recurringData={state.recurringSchedule}
                onUpdateHour={updateScheduleHour}
                onUpdateRecurring={updateRecurringSchedule}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
            />
          )}
          {activeTab === 'record' && (
            <RecordView 
                tasks={state.tasks} 
                dayData={currentRecord} 
                onUpdateHour={updateRecordHour}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
            />
          )}
          {activeTab === 'stats' && (
            <StatsView 
                tasks={state.tasks}
                scheduleData={currentSchedule}
                recordData={currentRecord}
                allSchedules={state.schedule}
                recurringSchedule={state.recurringSchedule}
                allRecords={state.records}
                review={currentReview}
                onUpdateReview={updateReview}
                currentDate={dateKey}
                dateObj={currentDate}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
                tasks={state.tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                showInstallButton={!!installPrompt}
                onInstall={handleInstallApp}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onClearData={handleClearData}
                allSchedules={state.schedule}
                allRecords={state.records}
                currentDate={currentDate}
            />
          )}
        </main>

        {/* Floating Bottom Navigation */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <nav className="h-16 bg-white/90 backdrop-blur-md rounded-full px-6 flex items-center gap-10 shadow-2xl shadow-stone-200/50 border border-white/50 pointer-events-auto transform translate-y-0 transition-transform">
                <NavButton 
                    active={activeTab === 'schedule'} 
                    onClick={() => setActiveTab('schedule')} 
                    icon={<Calendar size={22} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} />} 
                />
                <NavButton 
                    active={activeTab === 'stats'} 
                    onClick={() => setActiveTab('stats')} 
                    icon={<BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />} 
                />
                <NavButton 
                    active={activeTab === 'record'} 
                    onClick={() => setActiveTab('record')} 
                    icon={<CheckCircle size={22} strokeWidth={activeTab === 'record' ? 2.5 : 2} />} 
                />
            </nav>
        </div>

        <ReviewModal 
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            date={currentDate}
            initialContent={currentReview}
            onSave={updateReview}
        />

      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
        active ? "text-primary bg-primary/10" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
    )}
  >
    <div className={cn("transition-all duration-300", active ? "scale-100" : "scale-90")}>{icon}</div>
    {active && <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full opacity-50"></div>}
  </button>
);