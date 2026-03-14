/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, CheckCircle2, Circle, Star, AlertCircle, 
  Plus, MoreVertical, Trash2, Edit2, Save, X,
  Coffee, Briefcase, User, Sun, Moon, Zap,
  Droplets, Smile, Heart, Target, Sparkles, Trophy,
  MessageSquare, Trash
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { cn, Button, Card, Badge, Modal, Input, Select } from '../components/UI';
import { Task, Priority, DayPlan, TimeBlock } from '../types';
import { TaskItem, RoutineItem, TimeBlockItem, WellnessTracker, GratitudeWins, DailyFocus } from '../components/DayPlannerComponents';

// Time slots for the day planner (24 hours)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

export const DayPlanner: React.FC = () => {
  const { tasks, updateTask, addTask, deleteTask, dayPlans, addDayPlan, updateDayPlan, teamMembers } = useApp();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Modal states
  const [isTimeBlockModalOpen, setIsTimeBlockModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlock | null>(null);
  const [newTimeBlock, setNewTimeBlock] = useState<Omit<TimeBlock, 'id'>>({
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    type: 'work',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  });

  // Find or initialize day plan
  const currentDayPlan = useMemo(() => {
    const dateStr = startOfDay(selectedDate).toISOString();
    const expectedId = `dp-${user?.id}-${dateStr}`;
    return dayPlans.find(dp => dp.id === expectedId);
  }, [dayPlans, selectedDate, user]);

  // Daily tasks for the selected date
  const dailyTasks = useMemo(() => {
    const currentUserMember = teamMembers.find(tm => tm.email?.toLowerCase() === user?.email?.toLowerCase());
    return tasks
      .filter(task => {
        if (!task.dueDate) return false;
        // Only show tasks explicitly marked as Day Plan tasks (using ID prefix)
        if (!task.id.startsWith('dptk')) return false;
        
        // Personalize: Only show tasks assigned to the current user
        if (currentUserMember && task.assignedToId && task.assignedToId !== currentUserMember.id && task.assignedToId !== user?.id) {
          return false;
        }
        try {
          return isSameDay(parseISO(task.dueDate), selectedDate);
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [tasks, selectedDate, teamMembers, user]);

  // "Eat the Frog" - Highest priority task
  const frogTask = useMemo(() => {
    const pending = dailyTasks.filter(t => t.status !== 'Done');
    if (pending.length === 0) return null;
    return pending.sort((a, b) => {
      const priorityMap = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    })[0];
  }, [dailyTasks]);

  const completedTasksCount = dailyTasks.filter(t => t.status === 'Done').length;
  const progress = dailyTasks.length > 0 ? (completedTasksCount / dailyTasks.length) * 100 : 0;

  const handlePrevDay = useCallback(() => setSelectedDate(prev => subDays(prev, 1)), []);
  const handleNextDay = useCallback(() => setSelectedDate(prev => addDays(prev, 1)), []);
  const handleToday = useCallback(() => setSelectedDate(new Date()), []);

  const handleToggleTask = useCallback(async (task: Task) => {
    await updateTask(task.id, { 
      status: task.status === 'Done' ? 'To Do' : 'Done' 
    });
  }, [updateTask]);

  const handleToggleExpandTask = useCallback((id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  }, []);

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id);
  }, [deleteTask]);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const currentUserMember = teamMembers.find(tm => tm.email?.toLowerCase() === user?.email?.toLowerCase());

    await addTask({
      title: newTaskTitle,
      assignedToId: currentUserMember?.id || user?.id || 'tm-1', 
      description: newTaskDescription,
      priority: 'Medium',
      status: 'To Do',
      dueDate: format(selectedDate, 'yyyy-MM-dd'),
      estimatedHours: 1,
      actualHours: 0,
      startTime: newTaskTime,
      subtasks: [],
      isDayPlanTask: true
    } as any);

    setNewTaskTitle('');
    setNewTaskTime('09:00');
    setNewTaskDescription('');
    setIsAddingTask(false);
  };

  // Day Plan Handlers
  const ensureDayPlan = async () => {
    if (!currentDayPlan) {
      const dateStr = startOfDay(selectedDate).toISOString();
      await addDayPlan({
        date: dateStr,
        userId: user?.id || '',
        dailyFocus: '',
        notes: '',
        waterIntake: 0,
        mood: null,
        routine: [
          { id: 'r1', title: 'Morning Meditation', completed: false },
          { id: 'r2', title: 'Deep Work Session', completed: false },
          { id: 'r3', title: 'Exercise / Movement', completed: false },
          { id: 'r4', title: 'Daily Review', completed: false },
        ],
        timeBlocks: [],
        gratitude: '',
        wins: ''
      });
    }
  };

  const updateField = useCallback(async (field: keyof DayPlan, value: any) => {
    await ensureDayPlan();
    const dateStr = startOfDay(selectedDate).toISOString();
    const expectedId = `dp-${user?.id}-${dateStr}`;
    const plan = dayPlans.find(dp => dp.id === expectedId);
    if (plan) {
      await updateDayPlan(plan.id, { [field]: value });
    }
  }, [dayPlans, selectedDate, updateDayPlan, ensureDayPlan, user]);

  const handleToggleRoutine = useCallback(async (id: string, completed: boolean) => {
    if (!currentDayPlan) return;
    const updatedRoutine = (currentDayPlan.routine || []).map(r => r.id === id ? { ...r, completed } : r);
    await updateField('routine', updatedRoutine);
  }, [currentDayPlan, updateField]);

  const handleSaveTimeBlock = async () => {
    await ensureDayPlan();
    const dateStr = startOfDay(selectedDate).toISOString();
    const expectedId = `dp-${user?.id}-${dateStr}`;
    const plan = dayPlans.find(dp => dp.id === expectedId);
    if (!plan) return;

    let updatedBlocks = [...plan.timeBlocks];
    if (editingTimeBlock) {
      updatedBlocks = updatedBlocks.map(b => b.id === editingTimeBlock.id ? { ...newTimeBlock, id: b.id } : b);
    } else {
      updatedBlocks.push({ ...newTimeBlock, id: `tb-${Date.now()}` });
    }

    await updateDayPlan(plan.id, { timeBlocks: updatedBlocks });
    setIsTimeBlockModalOpen(false);
    setEditingTimeBlock(null);
    setNewTimeBlock({
      startTime: '09:00',
      endTime: '10:00',
      title: '',
      type: 'work',
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    });
  };

  const handleSaveRoutine = async () => {
    await updateField('routine', editingRoutine);
    setIsRoutineModalOpen(false);
  };

  const handleAddRoutineItem = useCallback(() => {
    setEditingRoutine(prev => [...prev, { id: `r-${Date.now()}`, title: '', completed: false }]);
  }, []);

  const handleRemoveRoutineItem = useCallback((id: string) => {
    setEditingRoutine(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleUpdateRoutineItem = useCallback((id: string, title: string) => {
    setEditingRoutine(prev => prev.map(item => item.id === id ? { ...item, title } : item));
  }, []);

  const handleDeleteTimeBlock = useCallback(async (id: string) => {
    if (!currentDayPlan) return;
    const updatedBlocks = currentDayPlan.timeBlocks.filter(b => b.id !== id);
    await updateDayPlan(currentDayPlan.id, { timeBlocks: updatedBlocks });
  }, [currentDayPlan, updateDayPlan]);

  const handleEditTimeBlock = useCallback((block: TimeBlock) => {
    setEditingTimeBlock(block);
    setNewTimeBlock(block);
    setIsTimeBlockModalOpen(true);
  }, []);

  const typeColors = {
    work: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    meeting: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    break: 'bg-orange-100 text-orange-700 border-orange-200',
    personal: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {format(selectedDate, 'EEEE, MMMM do')}
            </h2>
            <p className="text-slate-500 font-medium">
              {dailyTasks.length} tasks scheduled for today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button 
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Hourly Schedule */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Time Blocking
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => {
                  setEditingTimeBlock(null);
                  setNewTimeBlock({
                    startTime: '09:00',
                    endTime: '10:00',
                    title: '',
                    type: 'work',
                    color: typeColors.work
                  });
                  setIsTimeBlockModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-1 max-h-[1000px] overflow-y-auto custom-scrollbar">
              {TIME_SLOTS.map(hour => {
                const timeString = `${hour.toString().padStart(2, '0')}:00`;
                const blocks = currentDayPlan?.timeBlocks.filter(b => b.startTime.startsWith(hour.toString().padStart(2, '0'))) || [];
                
                return (
                  <div key={hour} className="group flex gap-4 min-h-[64px]">
                    <div className="w-16 text-right pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </span>
                    </div>
                    <div className="flex-1 relative border-t border-slate-100 pt-1">
                      {blocks.length > 0 ? (
                        <div className="space-y-1">
                          {blocks.map(block => (
                            <TimeBlockItem 
                              key={block.id}
                              block={block}
                              onClick={handleEditTimeBlock}
                              onDelete={handleDeleteTimeBlock}
                            />
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="h-full w-full rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" 
                          onClick={() => {
                            setEditingTimeBlock(null);
                            setNewTimeBlock({
                              startTime: timeString,
                              endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                              title: '',
                              type: 'work',
                              color: typeColors.work
                            });
                            setIsTimeBlockModalOpen(true);
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Middle Column: Tasks & Focus */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Focus */}
          <DailyFocus 
            focus={currentDayPlan?.dailyFocus || ''}
            onUpdate={(val) => updateField('dailyFocus', val)}
          />

          {/* Eat the Frog */}
          {frogTask && (
            <Card className="p-6 border-rose-100 bg-rose-50/30 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Target className="w-24 h-24 text-rose-600" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="danger" className="bg-rose-100 text-rose-700 border-rose-200">Eat the Frog</Badge>
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Highest Priority</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-lg font-bold text-slate-900">{frogTask.title}</h4>
                  <Button 
                    size="sm" 
                    variant="success" 
                    className="rounded-full h-10 w-10 p-0 shadow-lg shadow-emerald-200"
                    onClick={() => handleToggleTask(frogTask)}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* To-Do List */}
          <Card className="p-0 border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900">Today's Tasks</h3>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {completedTasksCount}/{dailyTasks.length}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingTask(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </div>

            <div className="p-2">
              {/* Progress Bar */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Daily Progress</span>
                  <span className="text-xs font-bold text-indigo-600">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 mt-2">
                {isAddingTask && (
                  <form onSubmit={handleQuickAddTask} className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 mx-2 mb-2">
                    <div className="flex gap-2 mb-2">
                      <input 
                        autoFocus
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Enter task title..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      <input 
                        type="time"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <textarea 
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Add a description (optional)..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2 resize-none h-20"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingTask(false)}>Cancel</Button>
                      <Button type="submit" size="sm">Save Task</Button>
                    </div>
                  </form>
                )}

                {dailyTasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No tasks scheduled for today.</p>
                    <Button 
                      variant="ghost" 
                      className="text-indigo-600 mt-2"
                      onClick={() => setIsAddingTask(true)}
                    >
                      Click here to add one
                    </Button>
                  </div>
                ) : (
                  dailyTasks.map(task => (
                    <TaskItem 
                      key={task.id}
                      task={task}
                      isExpanded={expandedTaskId === task.id}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onToggleExpand={handleToggleExpandTask}
                    />
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Gratitude & Wins */}
          <GratitudeWins 
            gratitude={currentDayPlan?.gratitude || ''}
            wins={currentDayPlan?.wins || ''}
            onUpdateGratitude={(val) => updateField('gratitude', val)}
            onUpdateWins={(val) => updateField('wins', val)}
          />
        </div>

        {/* Right Column: Routine & Wellness */}
        <div className="lg:col-span-3 space-y-6">
          {/* Daily Routine */}
          <Card className="p-5 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Daily Routine
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => {
                  setEditingRoutine(currentDayPlan?.routine || [
                    { id: 'r1', title: 'Morning Meditation', completed: false },
                    { id: 'r2', title: 'Deep Work Session', completed: false },
                    { id: 'r3', title: 'Exercise / Movement', completed: false },
                    { id: 'r4', title: 'Daily Review', completed: false },
                  ]);
                  setIsRoutineModalOpen(true);
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {(currentDayPlan?.routine || [
                { id: 'r1', title: 'Morning Meditation', completed: false },
                { id: 'r2', title: 'Deep Work Session', completed: false },
                { id: 'r3', title: 'Exercise / Movement', completed: false },
                { id: 'r4', title: 'Daily Review', completed: false },
              ]).map(item => (
                <RoutineItem 
                  key={item.id}
                  item={item}
                  onToggle={handleToggleRoutine}
                />
              ))}
            </div>
          </Card>

          {/* Wellness Tracker */}
          <WellnessTracker 
            waterIntake={currentDayPlan?.waterIntake || 0}
            mood={currentDayPlan?.mood || null}
            onUpdateWater={(val) => updateField('waterIntake', val)}
            onUpdateMood={(val) => updateField('mood', val)}
          />

          {/* Notes */}
          <Card className="p-5 border-slate-200 shadow-sm flex flex-col h-[300px]">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-500" />
              Notes
            </h3>
            <textarea 
              value={currentDayPlan?.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Jot down ideas or reminders..."
              className="flex-1 w-full bg-slate-50 rounded-xl p-4 text-sm text-slate-700 placeholder:text-slate-400 border-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </Card>
        </div>
      </div>

      {/* Time Block Modal */}
      <Modal 
        isOpen={isTimeBlockModalOpen} 
        onClose={() => setIsTimeBlockModalOpen(false)}
        title={editingTimeBlock ? 'Edit Time Block' : 'Add Time Block'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Title</label>
            <Input 
              value={newTimeBlock.title}
              onChange={(e) => setNewTimeBlock({...newTimeBlock, title: e.target.value})}
              placeholder="e.g., Deep Work, Meeting, Lunch"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">Start Time</label>
              <Input 
                type="time"
                value={newTimeBlock.startTime}
                onChange={(e) => setNewTimeBlock({...newTimeBlock, startTime: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1 block">End Time</label>
              <Input 
                type="time"
                value={newTimeBlock.endTime}
                onChange={(e) => setNewTimeBlock({...newTimeBlock, endTime: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">Type</label>
            <Select 
              value={newTimeBlock.type}
              onChange={(e) => {
                const type = e.target.value as TimeBlock['type'];
                setNewTimeBlock({...newTimeBlock, type, color: typeColors[type]});
              }}
            >
              <option value="work">Work</option>
              <option value="meeting">Meeting</option>
              <option value="break">Break</option>
              <option value="personal">Personal</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsTimeBlockModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTimeBlock}>
              {editingTimeBlock ? 'Update Block' : 'Add Block'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Routine Modal */}
      <Modal 
        isOpen={isRoutineModalOpen} 
        onClose={() => setIsRoutineModalOpen(false)}
        title="Manage Daily Routine"
      >
        <div className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {editingRoutine.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input 
                    value={item.title}
                    onChange={(e) => handleUpdateRoutineItem(item.id, e.target.value)}
                    placeholder={`Routine item ${index + 1}`}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-500 hover:bg-rose-50"
                  onClick={() => handleRemoveRoutineItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {editingRoutine.length === 0 && (
              <p className="text-center py-4 text-slate-500 text-sm italic">No routine items added yet.</p>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-200"
            onClick={handleAddRoutineItem}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Routine Item
          </Button>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsRoutineModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoutine}>Save Routine</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
