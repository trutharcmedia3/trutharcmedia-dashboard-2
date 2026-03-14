/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, CheckCircle2, Clock, AlertCircle, 
  Trash2, UserPlus, MessageSquare, Send, Shield
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { 
  Card, CardHeader, CardContent, Button, Input, Select, Badge, Modal, cn,
  Table, THead, TBody, TR, TH, TD, ConfirmModal
} from '../components/UI';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Task, TaskStatus, Priority, TeamMember, Comment } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Tasks: React.FC<{ initialTab?: 'board' | 'team' | 'workload' }> = ({ initialTab = 'board' }) => {
  const { 
    tasks, projects, teamMembers, comments, users,
    addTask, updateTask, deleteTask, 
    addTeamMember, updateTeamMember, deleteTeamMember,
    addComment, getCommentsByTaskId, addUser
  } = useApp();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'board' | 'team' | 'workload'>(initialTab);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');

  React.useEffect(() => {
    if (!isAdmin && teamMembers.length > 0 && currentUser) {
      const member = teamMembers.find(m => m.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (member) {
        setAssigneeFilter(member.id);
      }
    }
  }, [isAdmin, teamMembers, currentUser]);
  
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskForChat, setSelectedTaskForChat] = useState<Task | null>(null);
  
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<Comment['type']>('General Note');
  
  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };
  
  const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Low': return 'bg-slate-100 text-slate-600';
      case 'Medium': return 'bg-blue-100 text-blue-600';
      case 'High': return 'bg-amber-100 text-amber-600';
      case 'Critical': return 'bg-rose-100 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Workload Data
  const workloadData = useMemo(() => {
    return teamMembers.map(tm => {
      const activeTasks = tasks.filter(t => t.assignedToId === tm.id && t.status !== 'Done');
      const totalHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      return {
        name: tm.name,
        tasks: activeTasks.length,
        hours: totalHours,
        capacity: 40, // Mock capacity
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [teamMembers, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = projectFilter === 'All' || task.projectId === projectFilter;
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'All' || task.assignedToId === assigneeFilter;
      const isNotDayPlan = !task.id.startsWith('dptk');
      
      return matchesSearch && matchesProject && matchesPriority && matchesAssignee && isNotDayPlan;
    });
  }, [tasks, searchTerm, projectFilter, priorityFilter, assigneeFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team & Tasks</h2>
          <div className="flex items-center gap-1 mt-1">
            <button 
              onClick={() => setActiveTab('board')}
              className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", activeTab === 'board' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-700")}
            >
              Task Board
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", activeTab === 'team' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-700")}
            >
              Team Members
            </button>
            <button 
              onClick={() => setActiveTab('workload')}
              className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", activeTab === 'workload' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-700")}
            >
              Workload View
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(true)}>
              <Shield className="w-4 h-4 mr-2" /> Add User
            </Button>
          )}
          <Button onClick={() => setIsAddTaskModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="All">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
          <Select 
            value={assigneeFilter} 
            onChange={(e) => setAssigneeFilter(e.target.value)}
            disabled={!isAdmin}
          >
            <option value="All">All Assignees</option>
            {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
          </Select>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taskStatuses.map(status => (
            <div key={status} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {status}
                  <span className="text-xs font-normal text-slate-400">({filteredTasks.filter(t => t.status === status).length})</span>
                </h3>
              </div>
              <div className="space-y-4 min-h-[600px] bg-slate-50/50 rounded-xl p-2">
                {filteredTasks.filter(t => t.status === status).map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  const member = teamMembers.find(tm => tm.id === task.assignedToId);
                  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
                  const completedSubtasks = subtasks.filter(st => st.completed).length;

                    return (
                      <Card 
                        key={task.id} 
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer group border-l-4"
                        style={{ borderLeftColor: task.priority === 'Critical' ? '#F43F5E' : task.priority === 'High' ? '#F59E0B' : task.priority === 'Medium' ? '#6366F1' : '#94A3B8' }}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsEditTaskModalOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-1">
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskForChat(task);
                                setIsChatModalOpen(true);
                              }}
                            >
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(
                                    'Delete Task',
                                    'Are you sure you want to delete this task?',
                                    () => deleteTask(task.id)
                                  );
                                }}
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px]">{task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : 'No date'}</span>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{task.description}</p>
                        <p className="text-[10px] text-indigo-600 font-bold mt-2 uppercase tracking-wider">{project?.title}</p>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600">
                              {member?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                            </div>
                            <span className="text-[10px] text-slate-500">{member?.name}</span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {completedSubtasks}/{(Array.isArray(task.subtasks) ? task.subtasks : []).length}
                          </div>
                        </div>
                        
                        <div className="mt-3 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all" 
                            style={{ width: `${(Array.isArray(task.subtasks) ? task.subtasks : []).length > 0 ? (completedSubtasks / (Array.isArray(task.subtasks) ? task.subtasks : []).length) * 100 : 0}%` }}
                          />
                        </div>

                        {/* Quick Status Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Move to:</span>
                          <div className="flex gap-1">
                            {taskStatuses.filter(s => s !== task.status).map(s => (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTask(task.id, { status: s });
                                }}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </Card>
                    );
                })}
                {filteredTasks.filter(t => t.status === status).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs font-medium">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teamMembers.map(member => {
            const activeTaskCount = tasks.filter(t => t.assignedToId === member.id && t.status !== 'Done').length;
            const projectCount = projects.filter(p => (p.teamMemberIds || []).includes(member.id)).length;

            return (
              <Card key={member.id} className="p-6 text-center group">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {member.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                    member.availability === 'Available' ? "bg-emerald-500" :
                    member.availability === 'Busy' ? "bg-amber-500" : "bg-slate-400"
                  )} />
                </div>
                <h3 className="font-bold text-slate-900">{member.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{member.role}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-6 py-4 border-y border-slate-50">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{activeTaskCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Active Tasks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{projectCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Projects</p>
                  </div>
                </div>

                {projectCount > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Assigned Projects</p>
                    <div className="flex flex-wrap gap-1">
                      {projects.filter(p => (Array.isArray(p.teamMemberIds) ? p.teamMemberIds : []).includes(member.id)).map(p => (
                        <Badge key={p.id} variant="primary" className="text-[9px] px-1.5 py-0">
                          {p.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Utilization</span>
                    <span className="font-bold text-slate-900">{member.utilization}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full">
                    <div 
                      className={cn(
                        "h-full rounded-full",
                        member.utilization > 80 ? "bg-rose-500" :
                        member.utilization > 50 ? "bg-amber-500" : "bg-emerald-500"
                      )} 
                      style={{ width: `${member.utilization}%` }}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" className="flex-1" size="sm" onClick={() => { setSelectedMember(member); setIsEditTeamModalOpen(true); }}>Edit</Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-400" onClick={() => {
                      openConfirm(
                        'Delete Team Member',
                        'Are you sure you want to delete this team member?',
                        () => deleteTeamMember(member.id)
                      );
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
          {isAdmin && (
            <Card 
              onClick={() => setIsAddTeamModalOpen(true)}
              className="p-6 border-dashed border-2 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
            >
              <UserPlus className="w-8 h-8 mb-2" />
              <span className="font-bold text-sm">Add Team Member</span>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <h3 className="font-bold text-slate-900">Team Workload (Hours Assigned)</h3>
            </CardHeader>
            <CardContent className="h-[500px]">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                  <BarChart data={workloadData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={120} />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24}>
                    {workloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours > 35 ? '#F43F5E' : entry.hours > 25 ? '#F59E0B' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <Table>
              <THead>
                <TR>
                  <TH>Team Member</TH>
                  <TH>Role</TH>
                  <TH>Active Tasks</TH>
                  <TH>Total Hours</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {workloadData.map((data) => {
                  const member = teamMembers.find(tm => tm.name === data.name);
                  return (
                    <TR key={data.name}>
                      <TD className="font-bold">{data.name}</TD>
                      <TD>{member?.role}</TD>
                      <TD>{data.tasks} tasks</TD>
                      <TD>{data.hours} hrs</TD>
                      <TD>
                        <Badge variant={data.hours > 35 ? 'danger' : data.hours > 25 ? 'warning' : 'success'}>
                          {data.hours > 35 ? 'Overloaded' : data.hours > 25 ? 'Near Capacity' : 'Healthy'}
                        </Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal 
        isOpen={isAddTaskModalOpen} 
        onClose={() => setIsAddTaskModalOpen(false)} 
        title="Add New Task"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          addTask({
            title: formData.get('title') as string,
            projectId: formData.get('projectId') as string,
            assignedToId: formData.get('assignedToId') as string,
            description: formData.get('description') as string,
            priority: formData.get('priority') as Priority,
            status: 'To Do',
            dueDate: formData.get('dueDate') as string,
            estimatedHours: Number(formData.get('estimatedHours')),
            actualHours: 0,
            subtasks: [],
            isDayPlanTask: false,
          });
          setIsAddTaskModalOpen(false);
        }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Task Title</label>
            <Input name="title" placeholder="e.g. Design initial wireframes" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Project</label>
              <Select name="projectId" required>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Assign To</label>
              <Select name="assignedToId" required>
                {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
              <Input name="dueDate" type="date" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
              <Select name="priority">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Est. Hours</label>
              <Input name="estimatedHours" type="number" placeholder="0" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea 
              name="description"
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              placeholder="Task details and requirements..."
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Add Team Member Modal */}
      <Modal 
        isOpen={isAddTeamModalOpen} 
        onClose={() => setIsAddTeamModalOpen(false)} 
        title="Add Team Member"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          addTeamMember({
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            availability: 'Available',
            skills: ((formData.get('skills') as string) || '').split(',').map(s => s.trim()).filter(Boolean),
            avatar: '',
            bio: formData.get('bio') as string,
          });
          setIsAddTeamModalOpen(false);
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
              <Input name="name" placeholder="John Doe" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
              <Select name="role">
                <option value="Creative Strategist">Creative Strategist</option>
                <option value="Video Editor">Video Editor</option>
                <option value="Graphic Designer">Graphic Designer</option>
                <option value="Account Manager">Account Manager</option>
                <option value="Content Researcher">Content Researcher</option>
                <option value="Motion Designer">Motion Designer</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <Input name="email" type="email" placeholder="john@trutharc.media" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
              <Input name="phone" placeholder="+1..." />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Skills (comma separated)</label>
            <Input name="skills" placeholder="Premiere Pro, After Effects, Photoshop" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Bio</label>
            <textarea 
              name="bio"
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              placeholder="Short bio..."
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddTeamModalOpen(false)}>Cancel</Button>
            <Button type="submit">Add Member</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Member Modal */}
      <Modal 
        isOpen={isEditTeamModalOpen} 
        onClose={() => setIsEditTeamModalOpen(false)} 
        title="Edit Team Member"
      >
        {selectedMember && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateTeamMember(selectedMember.id, {
              name: formData.get('name') as string,
              role: formData.get('role') as string,
              email: formData.get('email') as string,
              phone: formData.get('phone') as string,
              availability: formData.get('availability') as any,
              skills: ((formData.get('skills') as string) || '').split(',').map(s => s.trim()).filter(Boolean),
              bio: formData.get('bio') as string,
            });
            setIsEditTeamModalOpen(false);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <Input name="name" defaultValue={selectedMember.name} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                <Select name="role" defaultValue={selectedMember.role}>
                  <option value="Creative Strategist">Creative Strategist</option>
                  <option value="Video Editor">Video Editor</option>
                  <option value="Graphic Designer">Graphic Designer</option>
                  <option value="Account Manager">Account Manager</option>
                  <option value="Content Researcher">Content Researcher</option>
                  <option value="Motion Designer">Motion Designer</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <Input name="email" type="email" defaultValue={selectedMember.email} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <Input name="phone" defaultValue={selectedMember.phone} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Availability</label>
                <Select name="availability" defaultValue={selectedMember.availability}>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Ooo">Out of Office</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Skills (comma separated)</label>
              <Input name="skills" defaultValue={selectedMember.skills.join(', ')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Bio</label>
              <textarea 
                name="bio"
                defaultValue={selectedMember.bio}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditTeamModalOpen(false)}>Cancel</Button>
              <Button type="submit">Update Member</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Task Modal */}
      <Modal 
        isOpen={isEditTaskModalOpen} 
        onClose={() => setIsEditTaskModalOpen(false)} 
        title="Edit Task"
      >
        {selectedTask && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateTask(selectedTask.id, {
              title: formData.get('title') as string,
              projectId: formData.get('projectId') as string,
              assignedToId: formData.get('assignedToId') as string,
              description: formData.get('description') as string,
              priority: formData.get('priority') as Priority,
              status: formData.get('status') as TaskStatus,
              dueDate: formData.get('dueDate') as string,
              estimatedHours: Number(formData.get('estimatedHours')),
              actualHours: Number(formData.get('actualHours')),
            });
            setIsEditTaskModalOpen(false);
          }}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Task Title</label>
              <Input name="title" defaultValue={selectedTask.title} required disabled={!isAdmin} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Project</label>
                <Select name="projectId" defaultValue={selectedTask.projectId} required disabled={!isAdmin}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign To</label>
                <Select name="assignedToId" defaultValue={selectedTask.assignedToId} required disabled={!isAdmin}>
                  {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <Select name="status" defaultValue={selectedTask.status} required>
                  {taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                <Select name="priority" defaultValue={selectedTask.priority} disabled={!isAdmin}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
                <Input name="dueDate" type="date" defaultValue={selectedTask.dueDate?.split('T')[0] || ''} required disabled={!isAdmin} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Est. Hours</label>
                <Input name="estimatedHours" type="number" defaultValue={selectedTask.estimatedHours} required disabled={!isAdmin} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Actual Hours</label>
                <Input name="actualHours" type="number" defaultValue={selectedTask.actualHours} required disabled={!isAdmin} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
              <textarea 
                name="description"
                defaultValue={selectedTask.description}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 disabled:bg-slate-50 disabled:text-slate-500"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditTaskModalOpen(false)}>Cancel</Button>
              <Button type="submit">Update Task</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Task Chat Modal */}
      <Modal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title={selectedTaskForChat ? `Chat: ${selectedTaskForChat.title}` : 'Task Chat'}
      >
        {selectedTaskForChat && (
          <div className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {getCommentsByTaskId(selectedTaskForChat.id).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No messages yet.</p>
                  <p className="text-xs">Start the discussion below.</p>
                </div>
              ) : (
                getCommentsByTaskId(selectedTaskForChat.id).map((comment) => {
                  const author = teamMembers.find(tm => tm.id === comment.authorId);
                  const isMe = comment.authorId === 'tm-1';
                  return (
                    <div key={comment.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "")}>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] flex-shrink-0">
                        {author?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                      </div>
                        <div className={cn("max-w-[80%] space-y-1", isMe ? "items-end" : "")}>
                          <div className={cn("flex items-center gap-2", isMe ? "flex-row-reverse" : "")}>
                            <span className="text-[10px] font-bold text-slate-900">{author?.name}</span>
                            <Badge 
                              variant={
                                comment.type === 'Important' ? 'danger' : 
                                comment.type === 'Revision' ? 'warning' : 
                                comment.type === 'Issue Reported' ? 'danger' : 'secondary'
                              }
                              className="text-[8px] px-1 py-0"
                            >
                              {comment.type}
                            </Badge>
                            <span className="text-[9px] text-slate-400">{formatDistanceToNow(parseISO(comment.timestamp), { addSuffix: true })}</span>
                          </div>
                          <div className={cn(
                            "p-3 rounded-2xl text-xs shadow-sm",
                            isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none",
                            comment.type === 'Important' && !isMe ? "border-rose-200 bg-rose-50" : "",
                            comment.type === 'Revision' && !isMe ? "border-amber-200 bg-amber-50" : ""
                          )}>
                            {comment.content}
                          </div>
                        </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white space-y-3">
              <div className="flex gap-2">
                {(['General Note', 'Important', 'Revision', 'Progress Update', 'Issue Reported'] as Comment['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewCommentType(type)}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full transition-all",
                      newCommentType === type 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <form 
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCommentText.trim()) return;
                  addComment({
                    taskId: selectedTaskForChat.id,
                    authorId: 'tm-1',
                    type: newCommentType,
                    content: newCommentText,
                    isIssue: newCommentType === 'Issue Reported',
                  });
                  setNewCommentText('');
                  setNewCommentType('General Note');
                }}
              >
                <Input 
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={newCommentType === 'Revision' ? "Describe the revision..." : "Type a message..."}
                  className="flex-1 h-10"
                />
                <Button type="submit" size="icon" className="h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
      {/* Add User Modal */}
      <Modal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        title="Add New User (Login Access)"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          addUser({
            username: formData.get('username') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: formData.get('role') as string,
          });
          setIsAddUserModalOpen(false);
        }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
            <Input name="username" placeholder="saad" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
            <Input name="email" type="email" placeholder="admin@example.com" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
            <Select name="role" required>
              <option value="member">Team Member</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mt-4">
            <p className="text-[10px] text-amber-700 leading-relaxed">
              <strong>Note:</strong> This will create a user who can log in to the system. 
              To show them in the team list, you should also add them as a Team Member with the same email.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>

        {/* List of existing users */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Existing Users</h4>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-bold text-slate-900 capitalize">{u.username}</p>
                  <p className="text-[10px] text-slate-500">{u.email}</p>
                </div>
                <Badge variant={u.role === 'admin' ? 'primary' : 'secondary'}>
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
