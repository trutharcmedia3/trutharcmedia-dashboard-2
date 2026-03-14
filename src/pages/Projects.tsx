/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, LayoutGrid, List, MoreVertical, Eye, Edit2, Trash2,
  Calendar, DollarSign, Target, MessageSquare, Clock, Shield,
  Users, CheckSquare, Activity, ArrowRight, FileText, CreditCard, Wallet
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { 
  Card, Button, Input, Select, Badge, Table, THead, TBody, TR, TH, TD, Modal,
  cn, ConfirmModal
} from '../components/UI';
import { format, parseISO } from 'date-fns';
import { Project, ProjectStatus, ServiceType, Priority, Comment } from '../types';

export const Projects: React.FC = () => {
  const { 
    projects, clients, teamMembers, comments, tasks, payments,
    addProject, updateProject, deleteProject, 
    addComment, addUser, updateTask
  } = useApp();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'All'>('All');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectForChat, setSelectedProjectForChat] = useState<Project | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newCommentType, setNewCommentType] = useState<Comment['type']>('General Note');

  const projectPayment = selectedProject ? payments.find(p => p.projectId === selectedProject.id) : null;
  const totalReceived = projectPayment?.paidAmount || 0;
  const remainingBalance = selectedProject ? (projectPayment?.totalAmount || selectedProject.budget) - totalReceived : 0;

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

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const client = clients.find(c => c.id === project.clientId);
      const matchesSearch = 
        (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client?.company || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
      const matchesService = serviceFilter === 'All' || project.serviceType === serviceFilter;
      
      return matchesSearch && matchesStatus && matchesService;
    });
  }, [projects, clients, searchTerm, statusFilter, serviceFilter]);

  const serviceTypes: ServiceType[] = [
    'Video Editing', 'Graphic Design', 'Content Research', 
    'Social Media Campaign', 'Motion Graphics', 'Creative Strategy', 'Other'
  ];

  const statuses: ProjectStatus[] = ['Pending', 'In Progress', 'Under Review', 'Completed'];

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'In Progress': return 'primary';
      case 'Under Review': return 'purple';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Low': return 'bg-slate-100 text-slate-600';
      case 'Medium': return 'bg-blue-100 text-blue-600';
      case 'High': return 'bg-amber-100 text-amber-600';
      case 'Critical': return 'bg-rose-100 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
          <p className="text-slate-500 text-sm mt-1">Manage and track all creative projects</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search projects..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select 
            className="w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="All">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === 'table' ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === 'kanban' ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsAddUserModalOpen(true)} className="w-full sm:w-auto">
                <Shield className="w-4 h-4 mr-2" /> Add User
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> New Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Content */}
      {viewMode === 'table' ? (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Project Title</TH>
                <TH>Client</TH>
                <TH>Service</TH>
                <TH>Team</TH>
                <TH>Deadline</TH>
                <TH>Progress</TH>
                <TH>Status</TH>
                {isAdmin && <TH className="text-right">Budget</TH>}
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filteredProjects.map((project) => {
                const client = clients.find(c => c.id === project.clientId);
                return (
                  <TR key={project.id}>
                    <TD>
                      <p className="font-semibold text-slate-900">{project.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">ID: {project.id}</p>
                    </TD>
                    <TD>{client?.company}</TD>
                    <TD>
                      <Badge variant="default">{project.serviceType}</Badge>
                    </TD>
                    <TD>
                      <div className="flex -space-x-2 overflow-hidden">
                        {(Array.isArray(project.teamMemberIds) ? project.teamMemberIds : []).slice(0, 3).map((id) => {
                          const member = teamMembers.find(tm => tm.id === id);
                          return (
                            <div key={id} className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600" title={member?.name}>
                              {member?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                            </div>
                          );
                        })}
                        {(Array.isArray(project.teamMemberIds) ? project.teamMemberIds : []).length > 3 && (
                          <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            +{(Array.isArray(project.teamMemberIds) ? project.teamMemberIds : []).length - 3}
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <p className="text-sm">{project.deadline ? format(parseISO(project.deadline), 'MMM d, yyyy') : 'No deadline'}</p>
                    </TD>
                    <TD>
                      <div className="w-24">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-500">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              project.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                            )} 
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TD>
                    {isAdmin && <TD className="text-right font-bold text-slate-900">Rs. {(project.budget || 0).toLocaleString()}</TD>}
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setIsChatModalOpen(true); }} title="Project Chat"><MessageSquare className="w-4 h-4 text-indigo-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setIsViewModalOpen(true); }}><Eye className="w-4 h-4 text-slate-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedProject(project); setIsEditModalOpen(true); }}><Edit2 className="w-4 h-4 text-slate-400" /></Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => {
                            openConfirm(
                              'Delete Project',
                              'Are you sure you want to delete this project?',
                              () => deleteProject(project.id)
                            );
                          }}><Trash2 className="w-4 h-4 text-rose-400" /></Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statuses.map(status => (
            <div key={status} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{status}</h3>
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {filteredProjects.filter(p => p.status === status).length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4 min-h-[500px] bg-slate-50/50 rounded-xl p-2">
                {filteredProjects.filter(p => p.status === status).map(project => (
                  <Card key={project.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow group" onClick={() => { setSelectedProject(project); setIsViewModalOpen(true); }}>
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="default" className="text-[10px]">{project.serviceType}</Badge>
                      <div className="flex gap-1">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", getPriorityColor(project.priority))}>
                          {project.priority}
                        </span>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={(e) => { 
                            e.stopPropagation(); 
                            openConfirm(
                              'Delete Project',
                              'Are you sure you want to delete this project?',
                              () => deleteProject(project.id)
                            );
                          }}>
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{clients.find(c => c.id === project.clientId)?.company}</p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex -space-x-1.5">
                        {(Array.isArray(project.teamMemberIds) ? project.teamMemberIds : []).slice(0, 3).map((id) => (
                          <div key={id} className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600">
                            {teamMembers.find(tm => tm.id === id)?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <button 
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(project);
                            setIsChatModalOpen(true);
                          }}
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[10px]">{comments.filter(c => c.projectId === project.id).length}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px]">{project.deadline ? format(parseISO(project.deadline), 'MMM d') : 'No date'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="w-full bg-slate-100 h-1 rounded-full">
                        <div 
                          className="bg-indigo-500 h-full rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Create New Project"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          addProject({
            title: formData.get('title') as string,
            clientId: formData.get('clientId') as string,
            serviceType: formData.get('serviceType') as ServiceType,
            description: formData.get('description') as string,
            teamMemberIds: Array.from(formData.getAll('teamMemberIds')) as string[],
            startDate: formData.get('startDate') as string,
            deadline: formData.get('deadline') as string,
            estimatedDelivery: formData.get('deadline') as string,
            budget: Number(formData.get('budget')),
            status: 'Pending',
            priority: formData.get('priority') as Priority,
            tags: ((formData.get('tags') as string) || '').split(',').map(t => t.trim()).filter(Boolean),
          });
          setIsAddModalOpen(false);
        }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Project Title</label>
            <Input name="title" placeholder="e.g. Q4 Marketing Video" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Client</label>
              <Select name="clientId" required>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Service Type</label>
              <Select name="serviceType">
                {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
              <Input name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Deadline</label>
              <Input name="deadline" type="date" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Budget (Rs.)</label>
              <Input name="budget" type="number" placeholder="0.00" required />
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
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Team Members</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
              {teamMembers.map(tm => (
                <label key={tm.id} className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-slate-50 p-2 rounded border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="teamMemberIds" 
                      value={tm.id} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900">{tm.name}</p>
                      <p className="text-[10px] text-slate-500">{tm.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      tm.utilization > 80 ? "text-rose-500" : tm.utilization > 50 ? "text-amber-500" : "text-emerald-500"
                    )}>
                      {tm.utilization}%
                    </p>
                    <p className="text-[9px] text-slate-400 uppercase">Util.</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea 
              name="description"
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              placeholder="Project goals and requirements..."
            ></textarea>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tags (comma separated)</label>
            <Input name="tags" placeholder="video, marketing, q4" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Project"
      >
        {selectedProject && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const updateData: any = {
              title: formData.get('title') as string,
              clientId: formData.get('clientId') as string,
              serviceType: formData.get('serviceType') as ServiceType,
              description: formData.get('description') as string,
              teamMemberIds: Array.from(formData.getAll('teamMemberIds')) as string[],
              startDate: formData.get('startDate') as string,
              deadline: formData.get('deadline') as string,
              progress: Number(formData.get('progress')),
              status: formData.get('status') as ProjectStatus,
              priority: formData.get('priority') as Priority,
            };
            if (isAdmin) {
              updateData.budget = Number(formData.get('budget'));
            }
            updateProject(selectedProject.id, updateData);
            setIsEditModalOpen(false);
          }}>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Project Title</label>
              <Input name="title" defaultValue={selectedProject.title} required disabled={currentUser?.role !== 'admin'} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Client</label>
                <Select name="clientId" defaultValue={selectedProject.clientId} required disabled={currentUser?.role !== 'admin'}>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Service Type</label>
                <Select name="serviceType" defaultValue={selectedProject.serviceType} disabled={currentUser?.role !== 'admin'}>
                  {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <Select name="status" defaultValue={selectedProject.status}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                <Select name="priority" defaultValue={selectedProject.priority} disabled={currentUser?.role !== 'admin'}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                <Input name="startDate" type="date" defaultValue={selectedProject.startDate?.split('T')[0] || ''} required disabled={currentUser?.role !== 'admin'} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Deadline</label>
                <Input name="deadline" type="date" defaultValue={selectedProject.deadline?.split('T')[0] || ''} required disabled={currentUser?.role !== 'admin'} />
              </div>
              {isAdmin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Budget (Rs.)</label>
                  <Input name="budget" type="number" defaultValue={selectedProject.budget} required />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Progress (%)</label>
                <Input name="progress" type="number" min="0" max="100" defaultValue={selectedProject.progress} required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Team Members</label>
              <div className={cn(
                "grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg",
                currentUser?.role !== 'admin' && "opacity-60 pointer-events-none"
              )}>
                {teamMembers.map(tm => (
                  <label key={tm.id} className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-slate-50 p-2 rounded border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        name="teamMemberIds" 
                        value={tm.id} 
                        defaultChecked={(Array.isArray(selectedProject.teamMemberIds) ? selectedProject.teamMemberIds : []).includes(tm.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        disabled={currentUser?.role !== 'admin'}
                      />
                      <div>
                        <p className="font-bold text-slate-900">{tm.name}</p>
                        <p className="text-[10px] text-slate-500">{tm.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        tm.utilization > 80 ? "text-rose-500" : tm.utilization > 50 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {tm.utilization}%
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase">Util.</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
              <textarea 
                name="description"
                defaultValue={selectedProject.description}
                disabled={currentUser?.role !== 'admin'}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 disabled:bg-slate-50 disabled:text-slate-500"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Update Project</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Project Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Project Details"
        size="lg"
      >
        {selectedProject && (
          <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Header / Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="text-[10px] uppercase tracking-wider font-bold">
                    {selectedProject.serviceType}
                  </Badge>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                    getPriorityColor(selectedProject.priority)
                  )}>
                    {selectedProject.priority} Priority
                  </span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {selectedProject.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500">
                  <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center">
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium">
                    {clients.find(c => c.id === selectedProject.clientId)?.company || 'Private Client'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Badge variant={getStatusColor(selectedProject.status)} className="px-4 py-1 text-xs font-bold uppercase tracking-widest">
                  {selectedProject.status}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="h-9">
                    <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                  </Button>
                  {isAdmin && (
                    <Button variant="danger" size="sm" className="h-9" onClick={() => {
                      setIsViewModalOpen(false);
                      openConfirm(
                        'Delete Project',
                        'Are you sure you want to delete this project?',
                        () => deleteProject(selectedProject.id)
                      );
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Project Roadmap */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="w-3 h-3" /> Project Roadmap
              </h4>
              <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
                <div className="relative flex justify-between">
                  {[
                    { label: 'Discovery', status: 'Completed' },
                    { label: 'Design', status: selectedProject.progress > 25 ? 'Completed' : 'In Progress' },
                    { label: 'Development', status: selectedProject.progress > 50 ? 'Completed' : selectedProject.progress > 25 ? 'In Progress' : 'Pending' },
                    { label: 'Review', status: selectedProject.progress > 75 ? 'Completed' : selectedProject.progress > 50 ? 'In Progress' : 'Pending' },
                    { label: 'Delivery', status: selectedProject.progress === 100 ? 'Completed' : 'Pending' }
                  ].map((step, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 bg-white px-2 z-10">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        step.status === 'Completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                        step.status === 'In Progress' ? "bg-white border-indigo-500 text-indigo-500 animate-pulse" :
                        "bg-white border-slate-200 text-slate-300"
                      )}>
                        {step.status === 'Completed' ? <CheckSquare className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        step.status === 'Pending' ? "text-slate-400" : "text-slate-900"
                      )}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
                </div>
                <p className="text-lg font-black text-slate-900">
                  {isAdmin ? `Rs. ${(selectedProject.budget || 0).toLocaleString()}` : 'Confidential'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline</p>
                </div>
                <p className="text-lg font-black text-slate-900">
                  {selectedProject.deadline ? format(parseISO(selectedProject.deadline), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-black text-slate-900">{selectedProject.progress}%</p>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-rose-200 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-rose-100 rounded-lg text-rose-600 group-hover:scale-110 transition-transform">
                    <Target className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks</p>
                </div>
                <p className="text-lg font-black text-slate-900">
                  {useApp().getTasksByProjectId(selectedProject.id).length} Active
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Info & Team */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Project Overview
                  </h4>
                  <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {selectedProject.description || 'No description provided for this project.'}
                    </p>
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users className="w-3 h-3" /> Assigned Team
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Array.isArray(selectedProject.teamMemberIds) ? selectedProject.teamMemberIds : []).map(id => {
                      const member = teamMembers.find(tm => tm.id === id);
                      if (!member) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all group">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{member.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{member.role}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-[10px] font-black",
                              member.utilization > 80 ? "text-rose-500" : "text-emerald-500"
                            )}>{member.utilization}%</p>
                            <p className="text-[8px] text-slate-400 uppercase font-bold">Load</p>
                          </div>
                        </div>
                      );
                    })}
                    {(Array.isArray(selectedProject.teamMemberIds) ? selectedProject.teamMemberIds : []).length === 0 && (
                      <p className="text-xs text-slate-400 italic col-span-2">No team members assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Target className="w-3 h-3" /> Project Milestones
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Start Date</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.startDate ? format(parseISO(selectedProject.startDate), 'MMM d, yyyy') : 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Final Delivery</p>
                        <p className="text-sm font-bold text-slate-900">{selectedProject.deadline ? format(parseISO(selectedProject.deadline), 'MMM d, yyyy') : 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Tasks */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CheckSquare className="w-3 h-3" /> Interactive Tasks
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      {useApp().getTasksByProjectId(selectedProject.id).filter(t => t.status === 'Done').length} / {useApp().getTasksByProjectId(selectedProject.id).length} Completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {useApp().getTasksByProjectId(selectedProject.id).map(task => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center justify-between p-4 bg-white border rounded-2xl transition-all group",
                          task.status === 'Done' ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => updateTask(task.id, { status: task.status === 'Done' ? 'To Do' : 'Done' })}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              task.status === 'Done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-transparent hover:border-indigo-500"
                            )}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                          <div>
                            <p className={cn(
                              "text-sm font-bold transition-all",
                              task.status === 'Done' ? "text-slate-400 line-through" : "text-slate-900"
                            )}>{task.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{task.priority} Priority • {task.estimatedHours}h</p>
                          </div>
                        </div>
                        <Badge variant={
                          task.status === 'Done' ? 'success' : 
                          task.status === 'In Progress' ? 'primary' : 'default'
                        } className="text-[9px] uppercase tracking-wider font-bold">
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                    {useApp().getTasksByProjectId(selectedProject.id).length === 0 && (
                      <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">No tasks assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Tracking Section */}
                {isAdmin && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <CreditCard className="w-3 h-3" /> Payment Tracking
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl group hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Received</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          Rs. {totalReceived.toLocaleString()}
                        </p>
                        <div className="mt-3 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (totalReceived / (projectPayment?.totalAmount || selectedProject.budget)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl group hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                            <Clock className="w-4 h-4" />
                          </div>
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Remaining Balance</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          Rs. {remainingBalance.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-rose-400 font-bold uppercase mt-2">
                          {remainingBalance <= 0 ? 'Fully Paid' : 'Pending Payment'}
                        </p>
                      </div>
                    </div>
                    
                    {projectPayment && projectPayment.installments.length > 0 && (
                      <div className="mt-4 bg-white border border-slate-100 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment History</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {projectPayment.installments.map((inst, idx) => (
                            <div key={inst.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">Rs. {inst.amount.toLocaleString()}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">{format(parseISO(inst.date), 'MMM d, yyyy')}</p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-[8px] uppercase">{inst.paymentMethod}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Chat & Activity */}
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col h-[500px]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" /> Project Chat
                    </h4>
                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
                      {comments.filter(c => c.projectId === selectedProject.id).length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                    {comments.filter(c => c.projectId === selectedProject.id).length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                        <MessageSquare className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">No messages yet</p>
                      </div>
                    ) : (
                      comments.filter(c => c.projectId === selectedProject.id).map(c => {
                        const author = teamMembers.find(tm => tm.id === c.authorId);
                        const isMe = c.authorId === 'tm-1';
                        return (
                          <div key={c.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                            <div className="flex items-center gap-2 px-1">
                              {!isMe && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{author?.name || 'Admin'}</span>}
                              <span className="text-[8px] text-slate-500">{c.timestamp ? format(parseISO(c.timestamp), 'h:mm a') : ''}</span>
                            </div>
                            <div className={cn(
                              "p-3 rounded-2xl text-xs leading-relaxed max-w-[90%]",
                              isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/5 text-slate-300 border border-white/10 rounded-tl-none"
                            )}>
                              {c.content}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="relative">
                    <Input 
                      placeholder="Send a message..." 
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 pr-12 h-12 rounded-2xl focus:ring-indigo-500 focus:border-indigo-500"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newComment.trim()) {
                          addComment({
                            projectId: selectedProject.id,
                            authorId: 'tm-1',
                            content: newComment,
                            type: 'General Note',
                            isIssue: false
                          });
                          setNewComment('');
                        }
                      }}
                    />
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                      onClick={() => {
                        if (newComment.trim()) {
                          addComment({
                            projectId: selectedProject.id,
                            authorId: 'tm-1',
                            content: newComment,
                            type: 'General Note',
                            isIssue: false
                          });
                          setNewComment('');
                        }
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
        title="Add New User Account"
      >
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const success = await addUser({
            username: formData.get('username') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: formData.get('role') as 'admin' | 'member',
          });
          if (success) setIsAddUserModalOpen(false);
        }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
            <Input name="username" placeholder="e.g. jdoe" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
            <Input name="email" type="email" placeholder="john@example.com" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
            <Select name="role" required>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Project Chat Modal */}
      <Modal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title={selectedProject ? `Project Chat: ${selectedProject.title}` : 'Project Chat'}
      >
        {selectedProject && (
          <div className="flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {comments.filter(c => c.projectId === selectedProject.id).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No messages yet.</p>
                  <p className="text-xs">Start the discussion below.</p>
                </div>
              ) : (
                comments
                  .filter(c => c.projectId === selectedProject.id)
                  .sort((a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime())
                  .map((comment) => {
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
                            <span className="text-[9px] text-slate-400">{comment.timestamp ? format(parseISO(comment.timestamp), 'MMM d, h:mm a') : 'Unknown time'}</span>
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
              <div className="flex flex-wrap gap-2">
                {(['General Note', 'Important', 'Revision', 'Progress Update', 'Issue Reported'] as Comment['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewCommentType(type)}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full transition-all",
                      newCommentType === type 
                        ? "bg-indigo-600 text-white" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      addComment({
                        projectId: selectedProject.id,
                        authorId: 'tm-1',
                        content: newComment,
                        type: newCommentType,
                        isIssue: newCommentType === 'Issue Reported'
                      });
                      setNewComment('');
                    }
                  }}
                />
                <Button onClick={() => {
                  if (newComment.trim()) {
                    addComment({
                      projectId: selectedProject.id,
                      authorId: 'tm-1',
                      content: newComment,
                      type: newCommentType,
                      isIssue: newCommentType === 'Issue Reported'
                    });
                    setNewComment('');
                  }
                }}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
