
import React, { useState, useMemo, useEffect } from 'react';
import { Todo, Objective, Task } from '../types';
import { TodoEditorModal } from '../components/TodoEditorModal';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { ObjectiveEditorModal } from '../components/ObjectiveEditorModal';
import { cn, generateId, formatDate } from '../utils';
import { Plus, CheckCircle2, Circle, Star, Calendar, X, Edit2, LayoutGrid, Trash2 } from 'lucide-react';
import { parseISO, isThisWeek, isThisMonth } from 'date-fns';

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
  onDeleteObjective
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
    onAddTodo({
        id: generateId(),
        title: task.name,
        objectiveId: task.category || 'none',
        isFrog: false,
        isCompleted: false,
        subTasks: [],
        createdAt: new Date().toISOString(),
        startDate: formatDate(new Date())
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
                            setEditingTask({ id: '', name: '', color: '#3b82f6', category: '' }); 
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
                 <h3 className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">常用模板</h3>
                 <button 
                    onClick={() => { 
                        setEditingTask({ id: '', name: '', color: '#3b82f6', category: '' }); 
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
                                "px-3 py-1 rounded-full text-[9px] font-medium whitespace-nowrap transition-all border flex items-center gap-1",
                                activePoolCategory === cat 
                                    ? "bg-stone-100 text-stone-800 border-stone-200" 
                                    : "bg-white text-stone-400 border-stone-100 hover:border-stone-200"
                            )}
                        >
                            {getCategoryName(cat)}
                            {cat !== 'all' && cat !== 'uncategorized' && activePoolCategory === cat && (
                                <Edit2 
                                    size={8} 
                                    className="ml-1 hover:text-stone-900" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingObjective(objectives.find(o => o.id === cat) || null);
                                        setIsObjModalOpen(true);
                                    }}
                                />
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar pb-10">
                <div className="grid grid-cols-1 gap-2">
                    {filteredPoolTasks.map(task => {
                        const isConfirming = confirmDeleteTaskId === task.id;
                        return (
                          <div key={task.id} onClick={() => handlePickTaskFromPool(task)} className="group p-3 bg-white border border-stone-100 rounded-lg flex items-center justify-between hover:border-stone-300 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99]">
                              <div className="flex items-center gap-3 overflow-hidden flex-1">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                                  <span className="text-[12px] font-medium text-stone-700 truncate">{task.name}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
                                  {!isConfirming && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsTaskEditorOpen(true); }} 
                                        className="p-1.5 text-stone-300 hover:text-stone-800 hover:bg-stone-50 rounded-md"
                                    >
                                        <Edit2 size={14} />
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
                                        isConfirming ? "bg-red-500 text-white" : "text-stone-300 hover:text-red-500 hover:bg-red-50"
                                      )}
                                  >
                                      {isConfirming ? <span className="text-[8px] font-medium px-1">确认删除?</span> : <Trash2 size={14} />}
                                  </button>
                              </div>
                          </div>
                        );
                    })}
                    {filteredPoolTasks.length === 0 && (
                        <div className="py-8 text-center text-[10px] text-stone-300 font-medium">暂无有效模板</div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white" onClick={() => { setConfirmDeleteTodoId(null); setConfirmDeleteTaskId(null); }}>
      <div className="flex-1 flex flex-col h-full border-r border-stone-50">
          <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-100 px-5 py-3 flex items-center gap-3">
              <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2">
                  {(Object.keys(filterLabels) as FilterRange[]).map((range) => (
                      <button key={range} onClick={() => setActiveFilter(range)} className={cn("px-4 py-1.5 rounded-full text-[10px] font-medium border transition-all", activeFilter === range ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100 hover:border-stone-200")}>{filterLabels[range]}</button>
                  ))}
              </div>
              <button onClick={() => { setEditingTodo(null); setIsModalOpen(true); }} className="w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all shrink-0"><Plus size={22} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-8 custom-scrollbar">
            <section>
              <div className="flex items-center gap-2 mb-4"><div className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-medium uppercase tracking-widest">核心任务</div><div className="h-px flex-1 bg-amber-50" /></div>
              {frogs.map(t => <TodoItem key={t.id} todo={t} />)}
              {frogs.length === 0 && <div className="text-center py-6 text-stone-300 text-[10px] font-medium">无今日核心</div>}
            </section>
            
            {displayObjectives.map(obj => {
                const tasks = groupedTadpoles[obj.id];
                if (!tasks || tasks.length === 0) return null;
                return (
                    <section key={obj.id}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-widest" style={{ backgroundColor: `${obj.color}15`, color: obj.color }}>
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
                    <div className="flex items-center gap-2 mb-4">
                        <div className="px-2 py-0.5 bg-stone-100 text-stone-400 rounded text-[9px] font-medium uppercase tracking-widest">
                            默认清单
                        </div>
                        <div className="h-px flex-1 bg-stone-50" />
                    </div>
                    {uncategorizedTadpoles.map(t => <TodoItem key={t.id} todo={t} />)}
                </section>
            )}

            {completed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4"><div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-medium uppercase tracking-widest">已达成</div><div className="h-px flex-1 bg-emerald-50" /></div>
                {completed.map(t => <TodoItem key={t.id} todo={t} />)}
              </section>
            )}
          </div>
      </div>

      <aside className="hidden md:flex w-64 flex-col border-l border-stone-100 shrink-0">
          <div className="p-5 border-b border-stone-100"><h2 className="text-[10px] font-medium text-stone-400 uppercase tracking-widest text-right">待办模板库</h2></div>
          <div className="flex-1 overflow-hidden">{renderTaskPool()}</div>
      </aside>

      {isTaskPoolOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-md h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-stone-300">
              <div className="flex justify-between items-center px-6 py-4 bg-stone-50 border-b border-stone-100">
                  <h3 className="font-medium text-sm text-stone-800">待办模板库</h3>
                  <button onClick={() => setIsTaskPoolOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-400"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-hidden">{renderTaskPool()}</div>
          </div>
        </div>
      )}

      <TodoEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} todo={editingTodo} objectives={objectives} onSave={(todo) => editingTodo ? onUpdateTodo(todo) : onAddTodo(todo)} onDelete={onDeleteTodo} frogCount={frogs.length} />
      
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
