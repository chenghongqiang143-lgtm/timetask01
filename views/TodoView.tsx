
import React, { useState, useMemo, useEffect } from 'react';
import { Todo, Objective, Task } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, CheckCircle2, Circle, Star, Calendar, X, Edit2, LayoutGrid, Trash2, Clock } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth, differenceInDays } from 'date-fns';

interface TodoViewProps {
  todos: Todo[];
  objectives: Objective[];
  tasks: Task[];
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo) => void;
  onDeleteTodo: (id: string) => void;
  onAddTask?: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  requestPoolOpenTrigger?: number;
  categoryOrder?: string[];
  onAddObjective?: (obj: Objective) => void;
  onUpdateObjective?: (obj: Objective) => void;
  onDeleteObjective?: (id: string) => void;
  currentDate?: Date;
}

type FilterRange = 'unfinished' | 'today' | 'week' | 'month' | 'all';

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  objectives,
  tasks,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  requestPoolOpenTrigger,
  categoryOrder,
  onAddObjective,
  onUpdateObjective,
  onDeleteObjective,
  currentDate = new Date()
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskPoolOpen, setIsTaskPoolOpen] = useState(false);
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [activePoolCategory, setActivePoolCategory] = useState<string>('all');
  
  const [confirmDeleteTodoId, setConfirmDeleteTodoId] = useState<string | null>(null);
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterRange>('today');

  useEffect(() => {
    if (requestPoolOpenTrigger && requestPoolOpenTrigger > 0) setIsTaskPoolOpen(true);
  }, [requestPoolOpenTrigger]);

  useEffect(() => {
    setConfirmDeleteTodoId(null);
  }, [activeFilter]);

  useEffect(() => {
    setConfirmDeleteTaskId(null);
  }, [activePoolCategory]);

  const filterLabels: Record<FilterRange, string> = {
    unfinished: '未完成',
    today: '今日',
    week: '本周',
    month: '本月',
    all: '全部'
  };

  const filteredTodos = useMemo(() => {
    const todayStr = formatDate(new Date());
    return todos.filter(t => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unfinished') return !t.startDate && !t.isCompleted;
      if (t.startDate) {
        const date = parseISO(t.startDate);
        switch (activeFilter) {
          case 'today': return t.startDate === todayStr;
          case 'week': return isThisWeek(date, { weekStartsOn: 1 });
          case 'month': return isThisMonth(date);
          default: return false;
        }
      }
      return false;
    });
  }, [todos, activeFilter]);

  // Calculate last execution for each template
  const taskLastExecutionMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    const today = new Date();
    
    tasks.forEach(task => {
      const relatedTodos = todos.filter(t => t.isCompleted && t.completedAt && (t.templateId === task.id || t.title === task.name));
      if (relatedTodos.length === 0) {
        map[task.id] = null;
      } else {
        const lastTodo = relatedTodos.reduce((latest, current) => {
          if (!latest.completedAt) return current;
          if (!current.completedAt) return latest;
          return current.completedAt > latest.completedAt ? current : latest;
        });
        if (lastTodo.completedAt) {
          map[task.id] = differenceInDays(today, parseISO(lastTodo.completedAt));
        } else {
          map[task.id] = null;
        }
      }
    });
    return map;
  }, [tasks, todos]);

  const frogs = filteredTodos.filter(t => t.isFrog && !t.isCompleted);
  const tadpoles = filteredTodos.filter(t => !t.isFrog && !t.isCompleted);
  const completed = filteredTodos.filter(t => t.isCompleted);

  const { groupedTadpoles, uncategorizedTadpoles } = useMemo(() => {
    const grouped: Record<string, Todo[]> = {};
    const uncategorized: Todo[] = [];
    
    tadpoles.forEach(t => {
        if (t.objectiveId && t.objectiveId !== 'none' && objectives.some(o => o.id === t.objectiveId)) {
            if (!grouped[t.objectiveId]) grouped[t.objectiveId] = [];
            grouped[t.objectiveId].push(t);
        } else {
            uncategorized.push(t);
        }
    });
    
    return { groupedTadpoles: grouped, uncategorizedTadpoles: uncategorized };
  }, [tadpoles, objectives]);

  const displayObjectives = useMemo(() => {
    if (!categoryOrder) return objectives;
    return [...objectives].sort((a, b) => {
        const idxA = categoryOrder.indexOf(a.id);
        const idxB = categoryOrder.indexOf(b.id);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [objectives, categoryOrder]);

  const poolCategories = useMemo(() => {
    const rawCats = new Set(tasks.map(t => t.category || 'uncategorized'));
    const validCats = Array.from(rawCats).filter(cat => 
      cat === 'uncategorized' || objectives.some(o => o.id === cat)
    );
    const sortedCats = validCats.sort((a, b) => {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      const idxA = categoryOrder?.indexOf(a) ?? 0;
      const idxB = categoryOrder?.indexOf(b) ?? 0;
      return idxA - idxB;
    });
    return ['all', ...sortedCats];
  }, [tasks, objectives, categoryOrder]);

  const filteredPoolTasks = useMemo(() => {
    if (activePoolCategory === 'all') return tasks.filter(t => t.category === 'uncategorized' || objectives.some(o => o.id === t.category));
    return tasks.filter(t => (t.category || 'uncategorized') === activePoolCategory);
  }, [tasks, activePoolCategory, objectives]);

  const getCategoryName = (catId: string) => {
    if (catId === 'all') return '全部';
    if (catId === 'uncategorized') return '默认';
    const obj = objectives.find(o => o.id === catId);
    return obj ? obj.title : '默认';
  };

  const TodoItem: React.FC<{ todo: Todo }> = ({ todo }) => {
    const objective = objectives.find(o => o.id === todo.objectiveId);
    const isConfirming = confirmDeleteTodoId === todo.id;

    return (
      <div className={cn("bg-white rounded-lg border transition-all mb-3 overflow-hidden shadow-sm group relative", todo.isFrog ? "border-amber-100" : "border-stone-100", todo.isCompleted && "opacity-60")}>
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => onUpdateTodo({ ...todo, isCompleted: !todo.isCompleted, completedAt: !todo.isCompleted ? formatDate(new Date()) : undefined })} className={cn("transition-colors", todo.isCompleted ? "text-emerald-500" : "text-stone-300")}>
            {todo.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>
          <div className="flex-1 min-w-0" onClick={() => { setEditingTodo(todo); setIsModalOpen(true); }}>
            <span className={cn("text-xs font-medium truncate block", todo.isCompleted ? "text-stone-400 line-through" : "text-stone-800")}>{todo.title}</span>
            <div className="flex gap-2 mt-1">
               {objective && <span className="text-[8px] font-medium uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${objective.color}15`, color: objective.color }}>{objective.title}</span>}
               {todo.startDate && <span className="text-[9px] font-medium text-stone-400 flex items-center gap-1"><Calendar size={10} /> {todo.startDate}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isConfirming) {
                      onDeleteTodo(todo.id);
                      setConfirmDeleteTodoId(null);
                    } else {
                      setConfirmDeleteTodoId(todo.id);
                    }
                }} 
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isConfirming ? "bg-red-500 text-white" : "text-stone-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                )}
            >
                {isConfirming ? <span className="text-[9px] font-medium px-1">确认?</span> : <Trash2 size={16} />}
            </button>
            {!isConfirming && (
              <button onClick={(e) => { e.stopPropagation(); onUpdateTodo({ ...todo, isFrog: !todo.isFrog }); }} className={cn("p-2 rounded-lg transition-all", todo.isFrog ? "bg-amber-100 text-amber-500" : "bg-stone-50 text-stone-200")}>
                  <Star size={18} fill={todo.isFrog ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handlePickTaskFromPool = (task: Task) => {
    if (confirmDeleteTaskId) {
      setConfirmDeleteTaskId(null);
      return;
    }
    // 使用当前选中的日期 (currentDate) 作为新待办的开始日期
    onAddTodo({
        id: generateId(),
        title: task.name,
        objectiveId: task.category || 'none',
        templateId: task.id,
        isFrog: false,
        isCompleted: false,
        subTasks: [],
        createdAt: new Date().toISOString(),
        startDate: formatDate(currentDate)
    });
    if (isTaskPoolOpen) setIsTaskPoolOpen(false);
  };

  const renderTaskPool = () => {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-300 space-y-4">
                    <LayoutGrid size={48} className="opacity-10" />
                    <div className="text-center space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-widest text-stone-600">模板库空空如也</p>
                        <p className="text-[9px] font-medium opacity-60">定义常用待办，一键同步到今日清单</p>
                    </div>
                    <button 
                        onClick={() => { 
                            setEditingTask({ id: '', name: '', color: '#3b82f6', category: activePoolCategory === 'all' ? '' : activePoolCategory }); 
                            setIsTaskEditorOpen(true); 
                        }}
                        className="mt-4 px-6 py-2.5 bg-stone-900 text-white rounded-xl text-[10px] font-medium uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        创建第一个模板
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white" onClick={() => { setConfirmDeleteTaskId(null); setConfirmDeleteTodoId(null); }}>
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
                 <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-widest">待办模板库</h3>
                 <button 
                    onClick={() => { 
                        setEditingTask({ id: '', name: '', color: '#3b82f6', category: activePoolCategory === 'all' ? '' : activePoolCategory }); 
                        setIsTaskEditorOpen(true); 
                    }}
                    className="p-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all shadow-sm"
                    title="新建模板"
                >
                    <Plus size={14} />
                </button>
            </div>
            
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-stone-50 bg-white shrink-0">
                {poolCategories.map(cat => (
                    <div key={cat} className="flex items-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActivePoolCategory(cat); }}
                            className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all border flex items-center gap-1",
                                activePoolCategory === cat 
                                    ? "bg-stone-900 text-white border-stone-900" 
                                    : "bg-white text-stone-400 border-stone-100 hover:border-stone-200"
                            )}
                        >
                            {getCategoryName(cat)}
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar pb-10">
                <div className="grid grid-cols-1 gap-2.5">
                    {filteredPoolTasks.map(task => {
                        const isConfirming = confirmDeleteTaskId === task.id;
                        const lastExec = taskLastExecutionMap[task.id];
                        const lastExecText = lastExec === null ? '从未执行' : (lastExec === 0 ? '今天' : `${lastExec}天前`);
                        
                        return (
                          <div key={task.id} onClick={() => handlePickTaskFromPool(task)} className="group p-4 bg-white border border-stone-100 rounded-xl flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] relative overflow-hidden">
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1 opacity-20"
                                style={{ backgroundColor: task.color }}
                              />
                              <div className="flex flex-col gap-0.5 overflow-hidden flex-1 pl-1">
                                  <span className="text-[12px] font-black text-stone-800 truncate">{task.name}</span>
                                  <div className="flex items-center gap-1.5 text-stone-400">
                                      <Clock size={10} />
                                      <span className="text-[9px] font-bold uppercase tracking-wider">{lastExecText}</span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                  {!isConfirming && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsTaskEditorOpen(true); }} 
                                        className="p-1.5 text-stone-300 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                  )}
                                  <button 
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (isConfirming) {
                                            onDeleteTask?.(task.id);
                                            setConfirmDeleteTaskId(null);
                                          } else {
                                            setConfirmDeleteTaskId(task.id);
                                          }
                                      }} 
                                      className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        isConfirming ? "bg-red-500 text-white" : "text-stone-300 hover:text-red-500 bg-stone-50 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                      )}
                                  >
                                      {isConfirming ? <span className="text-[8px] font-black px-1">确认?</span> : <Trash2 size={12} />}
                                  </button>
                              </div>
                          </div>
                        );
                    })}
                    {filteredPoolTasks.length === 0 && (
                        <div className="py-12 text-center flex flex-col items-center gap-2 opacity-30">
                            <LayoutGrid size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">暂无模板</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-white overflow-hidden" onClick={() => { setConfirmDeleteTodoId(null); setConfirmDeleteTaskId(null); }}>
      {/* Left Column: Arranged Todos */}
      <div className="flex-1 flex flex-col h-full border-r border-stone-50 bg-white">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-100 px-5 py-3.5 flex items-center gap-3 shadow-sm">
              <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2">
                  {(Object.keys(filterLabels) as FilterRange[]).map((range) => (
                      <button key={range} onClick={() => setActiveFilter(range)} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black border transition-all uppercase tracking-wider", activeFilter === range ? "bg-stone-900 text-white border-stone-900 shadow-md" : "bg-white text-stone-400 border-stone-100 hover:border-stone-200")}>{filterLabels[range]}</button>
                  ))}
              </div>
              <button onClick={() => { setEditingTodo(null); setIsModalOpen(true); }} className="w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"><Plus size={22} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-10 custom-scrollbar bg-white/50">
            <section>
              <div className="flex items-center gap-3 mb-5 px-1">
                  <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border border-amber-200 shadow-sm">核心焦点</div>
                  <div className="h-px flex-1 bg-amber-100" />
              </div>
              {frogs.map(t => <TodoItem key={t.id} todo={t} />)}
              {frogs.length === 0 && (
                <div className="text-center py-10 rounded-2xl border-2 border-dashed border-stone-50 bg-stone-50/20 text-stone-300">
                    <Star size={24} className="mx-auto mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">今日无核心挑战</p>
                </div>
              )}
            </section>
            
            {displayObjectives.map(obj => {
                const tasks = groupedTadpoles[obj.id];
                if (!tasks || tasks.length === 0) return null;
                return (
                    <section key={obj.id}>
                        <div className="flex items-center gap-3 mb-5 px-1">
                            <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm" style={{ backgroundColor: `${obj.color}15`, color: obj.color, borderColor: `${obj.color}30` }}>
                                {obj.title}
                            </div>
                            <div className="h-px flex-1" style={{ backgroundColor: `${obj.color}15` }} />
                        </div>
                        {tasks.map(t => <TodoItem key={t.id} todo={t} />)}
                    </section>
                );
            })}

            {uncategorizedTadpoles.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-5 px-1">
                        <div className="px-3 py-1 bg-stone-100 text-stone-500 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border border-stone-200 shadow-sm">
                            常规待办
                        </div>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    {uncategorizedTadpoles.map(t => <TodoItem key={t.id} todo={t} />)}
                </section>
            )}

            {completed.length > 0 && (
              <section className="pt-4 opacity-70">
                <div className="flex items-center gap-3 mb-5 px-1">
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border border-emerald-100 shadow-sm">任务达成</div>
                    <div className="h-px flex-1 bg-emerald-50" />
                </div>
                {completed.map(t => <TodoItem key={t.id} todo={t} />)}
              </section>
            )}
          </div>
      </div>

      {/* Right Column: Template Pool (Fixed on Desktop) */}
      <aside className="hidden lg:flex w-[400px] flex-col border-l border-stone-100 shrink-0 bg-stone-50/20">
          <div className="flex-1 overflow-hidden">{renderTaskPool()}</div>
      </aside>

      {/* Mobile Template Pool Toggle */}
      <button 
        onClick={() => setIsTaskPoolOpen(true)}
        className="lg:hidden fixed bottom-28 right-6 w-14 h-14 bg-white border border-stone-200 text-stone-900 rounded-2xl flex items-center justify-center shadow-2xl z-50 active:scale-90 transition-all"
      >
        <LayoutGrid size={24} />
      </button>

      {isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-2xl w-full max-w-md h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-stone-300">
              <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-b border-stone-100">
                  <h3 className="font-black text-sm text-stone-800 uppercase tracking-widest">模板选择</h3>
                  <button onClick={() => setIsTaskPoolOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-400"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-hidden">{renderTaskPool()}</div>
          </div>
        </div>
      )}

      <TodoEditorModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          todo={editingTodo} 
          objectives={objectives} 
          onSave={(todo) => editingTodo ? onUpdateTodo(todo) : onAddTodo(todo)} 
          onDelete={onDeleteTodo} 
          frogCount={frogs.length}
          defaultDate={currentDate} 
      />
      
      <TaskEditorModal 
        isOpen={isTaskEditorOpen} 
        onClose={() => setIsTaskEditorOpen(false)} 
        task={editingTask} 
        onSave={(t) => t.id ? onUpdateTask?.(t) : onAddTask?.(t)} 
        onDelete={onDeleteTask || (() => {})} 
        objectives={objectives} 
        simplified={true}
        onAddObjective={onAddObjective}
        onDeleteObjective={onDeleteObjective}
      />

      <ObjectiveEditorModal 
        isOpen={isObjModalOpen} 
        onClose={() => setIsObjModalOpen(false)} 
        objective={editingObjective} 
        onSave={(obj) => {
            if (onUpdateObjective) onUpdateObjective(obj);
            setIsObjModalOpen(false);
        }} 
        onDelete={onDeleteObjective}
        zIndex={300}
      />
    </div>
  );
};
