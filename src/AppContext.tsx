/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { 
  Client, TeamMember, Project, Task, Comment, ActivityLog, Expenditure, DayPlan, TimeBlock, User, Payment
} from './types';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';

interface AppState {
  clients: Client[];
  teamMembers: TeamMember[];
  projects: Project[];
  tasks: Task[];
  expenditures: Expenditure[];
  dayPlans: DayPlan[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  users: User[];
  payments: Payment[];
  settings: { key: string, value: string }[];
  monthlyBudget: number;
  loading: boolean;
  syncing: boolean;
  lastSyncError: string | null;
}

interface AppContextType extends AppState {
  // CRUD Operations
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  
  addProject: (project: Omit<Project, 'id' | 'progress'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addExpenditure: (expenditure: Omit<Expenditure, 'id'>) => Promise<void>;
  updateExpenditure: (id: string, expenditure: Partial<Expenditure>) => Promise<void>;
  deleteExpenditure: (id: string) => Promise<void>;
  
  addDayPlan: (dayPlan: Omit<DayPlan, 'id'>) => Promise<void>;
  updateDayPlan: (id: string, dayPlan: Partial<DayPlan>) => Promise<void>;
  
  updateMonthlyBudget: (amount: number) => Promise<void>;
  
  addComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  
  addTeamMember: (member: Omit<TeamMember, 'id' | 'utilization'>) => Promise<void>;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  sendInvoice: (projectId: string, options?: { totalAmount?: number, paidAmount?: number, dueDate?: string, notes?: string, paymentMethod?: string, bankDetails?: { bankName: string, accountNumber: string, accountName: string } }) => Promise<any>;
  sendReceipt: (paymentId: string, installmentIndex: number) => Promise<void>;
  
  addUser: (userData: any) => Promise<boolean>;
  refreshData: () => Promise<void>;
  
  // Helpers
  getProjectById: (id: string) => Project | undefined;
  getClientById: (id: string) => Client | undefined;
  getTeamMemberById: (id: string) => TeamMember | undefined;
  getTasksByProjectId: (projectId: string) => Task[];
  getCommentsByProjectId: (projectId: string) => Comment[];
  getCommentsByTaskId: (taskId: string) => Comment[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    clients: [],
    teamMembers: [],
    projects: [],
    tasks: [],
    expenditures: [],
    dayPlans: [],
    comments: [],
    activityLogs: [],
    users: [],
    payments: [],
    settings: [],
    monthlyBudget: 500000,
    loading: true,
    syncing: false,
    lastSyncError: null,
  });

  const { token, user } = useAuth();

  const fetchData = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      
      if (data._syncError) {
        const errorMsg = data._tableErrors?.join(', ') || 'Partial sync (some tables failed)';
        console.error('Sync Error Details:', data._tableErrors);
        setState(prev => ({ ...prev, lastSyncError: errorMsg }));
      } else {
        setState(prev => ({ ...prev, lastSyncError: null }));
      }
      
      // Normalize data to ensure arrays are actually arrays (handles stringified JSON from Supabase)
      const normalize = (obj: any) => {
        if (!obj || typeof obj !== 'object') return obj;
        const n = { ...obj };
        const arrayFields = ['teamMemberIds', 'tags', 'subtasks', 'skills', 'routine', 'timeBlocks', 'installments'];
        arrayFields.forEach(field => {
          if (n[field] && typeof n[field] === 'string') {
            try {
              const parsed = JSON.parse(n[field]);
              if (Array.isArray(parsed)) n[field] = parsed;
            } catch (e) {
              // Not a JSON array, keep as is or set to empty array if it was supposed to be one
              if (n[field].startsWith('[') || n[field] === '') n[field] = [];
            }
          }
        });
        return n;
      };

      const normalizedData: any = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key])) {
            if (key === 'tasks') {
              normalizedData[key] = data[key].map((t: any) => ({
                ...normalize(t),
                isDayPlanTask: t.id?.startsWith('dptk')
              }));
            } else {
              normalizedData[key] = data[key].map(normalize);
            }
          } else {
            normalizedData[key] = data[key];
          }
        });
      }
      
      let users = [];
      if (user?.role === 'admin') {
        try {
          const usersResponse = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (usersResponse.ok) {
            users = await usersResponse.json();
          }
        } catch (e) {
          console.error('Error fetching users:', e);
        }
      }

      setState(prev => ({ 
        ...prev, 
        ...normalizedData, 
        users: Array.isArray(users) ? users : [], 
        loading: false 
      }));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false, lastSyncError: error.message || 'Failed to fetch data' }));
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      
      // Setup Realtime Subscriptions
      const tables = [
        'clients', 'projects', 'tasks', 'expenditures', 
        'comments', 'activity_logs', 'day_plans', 'team_members', 'users', 'settings', 'payments'
      ];

      const channels = tables.map(table => {
        return supabase
          .channel(`public:${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
            console.log(`Realtime change in ${table}:`, payload);
            
            // Normalize incoming data
            const normalize = (obj: any) => {
              if (!obj || typeof obj !== 'object') return obj;
              const n = { ...obj };
              const arrayFields = ['teamMemberIds', 'tags', 'subtasks', 'skills', 'routine', 'timeBlocks', 'installments'];
              arrayFields.forEach(field => {
                if (n[field] && typeof n[field] === 'string') {
                  try {
                    const parsed = JSON.parse(n[field]);
                    if (Array.isArray(parsed)) n[field] = parsed;
                  } catch (e) {
                    if (n[field].startsWith('[') || n[field] === '') n[field] = [];
                  }
                }
              });
              return n;
            };

            const newRecord = payload.new ? normalize(payload.new) : null;

            setState(prev => {
              if (table === 'settings') {
                if (newRecord && (newRecord as any).key === 'monthlyBudget') {
                  return { ...prev, monthlyBudget: parseFloat((newRecord as any).value) };
                }
                return prev;
              }

              const key = table === 'team_members' ? 'teamMembers' : 
                          table === 'activity_logs' ? 'activityLogs' : 
                          table === 'day_plans' ? 'dayPlans' : table as keyof AppState;
              
              const currentData = prev[key] as any[];
              if (!currentData) return prev;

              if (payload.eventType === 'INSERT') {
                const exists = currentData.some(item => item.id === newRecord.id);
                if (exists) {
                  return { ...prev, [key]: currentData.map(item => item.id === newRecord.id ? newRecord : item) };
                }
                return { ...prev, [key]: [newRecord, ...currentData] };
              } else if (payload.eventType === 'UPDATE') {
                return { ...prev, [key]: currentData.map(item => item.id === newRecord.id ? newRecord : item) };
              } else if (payload.eventType === 'DELETE') {
                return { ...prev, [key]: currentData.filter(item => item.id !== payload.old.id) };
              }
              return prev;
            });
          })
          .subscribe();
      });

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [token]);

  const addActivity = async (type: ActivityLog['type'], action: string, userName: string, target: string) => {
    const id = `al-${Date.now()}`;
    const newLog: ActivityLog = {
      id,
      timestamp: new Date().toISOString(),
      type,
      action,
      user: userName,
      target,
    };
    
    // Optimistic update for activity logs
    setState(prev => ({
      ...prev,
      activityLogs: [newLog, ...prev.activityLogs]
    }));

    try {
      await fetch('/api/activity_logs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLog),
      });
    } catch (error) {
      console.error('Error adding activity log:', error);
    }
  };

  /**
   * Generic Optimistic Update Helper
   */
  const performOptimisticUpdate = async <T extends keyof AppState>(
    key: T,
    updateFn: (current: AppState[T]) => AppState[T],
    apiCall: () => Promise<Response>,
    activityLog?: { type: ActivityLog['type'], action: string, target: string }
  ) => {
    const previousValue = state[key];
    
    // 1. Apply Optimistic Change
    setState(prev => ({
      ...prev,
      [key]: updateFn(prev[key]),
      syncing: true,
      lastSyncError: null
    }));

    try {
      // 2. Perform API Call
      const response = await apiCall();
      if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
      
      // 3. Log Activity if provided
      if (activityLog && user) {
        await addActivity(activityLog.type, activityLog.action, user.username, activityLog.target);
      }
    } catch (error: any) {
      // 4. Rollback on Failure
      const errorMessage = error?.message || 'Unknown sync error';
      console.error(`Optimistic update failed for ${String(key)}:`, error);
      console.error('Full error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        cause: error?.cause
      });
      setState(prev => ({
        ...prev,
        [key]: previousValue,
        lastSyncError: errorMessage
      }));
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setState(prev => ({ ...prev, lastSyncError: null }));
      }, 5000);
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  };

  const teamWithUtilization = useMemo(() => {
    return state.teamMembers.map(tm => {
      const activeTasks = state.tasks.filter(t => t.assignedToId === tm.id && t.status !== 'Done');
      const totalHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      // Assume 40 hours is 100% capacity
      const calculatedUtilization = Math.min(Math.round((totalHours / 40) * 100), 100);
      return {
        ...tm,
        utilization: tm.utilization || calculatedUtilization
      };
    });
  }, [state.teamMembers, state.tasks]);

  const value = useMemo(() => ({
    ...state,
    teamMembers: teamWithUtilization,
    
    addClient: async (clientData) => {
      const id = `cl-${Date.now()}`;
      const newClient: Client = {
        ...clientData,
        id,
        createdAt: new Date().toISOString(),
      };
      
      await performOptimisticUpdate(
        'clients',
        (clients) => [...clients, newClient],
        () => fetch('/api/clients', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newClient),
        }),
        { type: 'client', action: 'added', target: newClient.name }
      );
    },
    updateClient: async (id, clientData) => {
      await performOptimisticUpdate(
        'clients',
        (clients) => clients.map(c => c.id === id ? { ...c, ...clientData } : c),
        () => fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(clientData),
        }),
        { type: 'client', action: 'updated', target: id }
      );
    },
    deleteClient: async (id) => {
      await performOptimisticUpdate(
        'clients',
        (clients) => clients.filter(c => c.id !== id),
        () => fetch(`/api/clients/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'client', action: 'deleted', target: id }
      );
    },
    
    addProject: async (projectData) => {
      const id = `pj-${Date.now()}`;
      const newProject: Project = {
        ...projectData,
        id,
        progress: 0,
      };

      await performOptimisticUpdate(
        'projects',
        (projects) => [...projects, newProject],
        () => fetch('/api/projects', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newProject),
        }),
        { type: 'project', action: 'added', target: newProject.title }
      );
    },
    updateProject: async (id, projectData) => {
      await performOptimisticUpdate(
        'projects',
        (projects) => projects.map(p => p.id === id ? { ...p, ...projectData } : p),
        () => fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(projectData),
        }),
        { type: 'project', action: 'updated', target: id }
      );
    },
    deleteProject: async (id) => {
      await performOptimisticUpdate(
        'projects',
        (projects) => projects.filter(p => p.id !== id),
        () => fetch(`/api/projects/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'project', action: 'deleted', target: id }
      );
    },
    
    addTask: async (taskData) => {
      const prefix = taskData.isDayPlanTask ? 'dptk' : 'tk';
      const id = `${prefix}-${Date.now()}`;
      const { isDayPlanTask, ...rest } = taskData;
      const newTask: Task = { ...taskData, id };
      
      await performOptimisticUpdate(
        'tasks',
        (tasks) => [...tasks, newTask],
        () => fetch('/api/tasks', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...rest, id }),
        }),
        { type: 'task', action: 'added', target: newTask.title }
      );
    },
    updateTask: async (id, taskData) => {
      const { isDayPlanTask, ...rest } = taskData as any;
      await performOptimisticUpdate(
        'tasks',
        (tasks) => tasks.map(t => t.id === id ? { ...t, ...taskData } : t),
        () => fetch(`/api/tasks/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(rest),
        }),
        { type: 'task', action: 'updated', target: id }
      );
    },
    deleteTask: async (id) => {
      await performOptimisticUpdate(
        'tasks',
        (tasks) => tasks.filter(t => t.id !== id),
        () => fetch(`/api/tasks/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'task', action: 'deleted', target: id }
      );
    },
    
    addExpenditure: async (expenditureData) => {
      const id = `ex-${Date.now()}`;
      const newExpenditure: Expenditure = { ...expenditureData, id };

      await performOptimisticUpdate(
        'expenditures',
        (expenditures) => [...expenditures, newExpenditure],
        () => fetch('/api/expenditures', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newExpenditure),
        }),
        { type: 'expenditure', action: 'expenditure added', target: newExpenditure.title }
      );
    },
    updateExpenditure: async (id, expenditureData) => {
      await performOptimisticUpdate(
        'expenditures',
        (expenditures) => expenditures.map(ex => ex.id === id ? { ...ex, ...expenditureData } : ex),
        () => fetch(`/api/expenditures/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(expenditureData),
        })
      );
    },
    deleteExpenditure: async (id) => {
      await performOptimisticUpdate(
        'expenditures',
        (expenditures) => expenditures.filter(ex => ex.id !== id),
        () => fetch(`/api/expenditures/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'expenditure', action: 'expenditure deleted', target: id }
      );
    },
    
    addDayPlan: async (dayPlanData) => {
      if (!user) return;
      const id = `dp-${user.id}-${dayPlanData.date}`;
      const newDayPlan: DayPlan = { ...dayPlanData, id, userId: user.id };

      await performOptimisticUpdate(
        'dayPlans',
        (dayPlans) => [...dayPlans, newDayPlan],
        () => {
          const { userId, ...payload } = newDayPlan;
          return fetch('/api/day_plans', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
        }
      );
    },
    updateDayPlan: async (id, dayPlanData) => {
      await performOptimisticUpdate(
        'dayPlans',
        (dayPlans) => dayPlans.map(dp => dp.id === id ? { ...dp, ...dayPlanData } : dp),
        () => {
          const { userId, ...payload } = dayPlanData as any;
          return fetch(`/api/day_plans/${id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
          });
        }
      );
    },
    
    updateMonthlyBudget: async (amount) => {
      const previousBudget = state.monthlyBudget;
      setState(prev => ({ ...prev, monthlyBudget: amount, syncing: true }));
      
      try {
        const response = await fetch('/api/settings/monthlyBudget', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ value: amount }),
        });
        if (!response.ok) throw new Error('Failed to update budget');
        if (user) await addActivity('expenditure', 'budget updated', user.username, `Rs. ${amount}`);
      } catch (error) {
        console.error('Error updating budget:', error);
        setState(prev => ({ ...prev, monthlyBudget: previousBudget }));
      } finally {
        setState(prev => ({ ...prev, syncing: false }));
      }
    },
    
    addComment: async (commentData) => {
      const id = `cm-${Date.now()}`;
      const newComment: Comment = {
        ...commentData,
        id,
        timestamp: new Date().toISOString(),
      };

      await performOptimisticUpdate(
        'comments',
        (comments) => [...comments, newComment],
        () => fetch('/api/comments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newComment),
        }),
        { type: 'comment', action: 'added', target: commentData.projectId || commentData.taskId || 'Unknown' }
      );
    },
    deleteComment: async (id) => {
      await performOptimisticUpdate(
        'comments',
        (comments) => comments.filter(c => c.id !== id),
        () => fetch(`/api/comments/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
    },
    
    addTeamMember: async (memberData) => {
      const id = `tm-${Date.now()}`;
      const newMember: TeamMember = {
        ...memberData,
        id,
        utilization: 0,
      };

      await performOptimisticUpdate(
        'teamMembers',
        (teamMembers) => [...teamMembers, newMember],
        () => fetch('/api/team_members', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newMember),
        }),
        { type: 'team', action: 'added', target: newMember.name }
      );
    },
    updateTeamMember: async (id, memberData) => {
      await performOptimisticUpdate(
        'teamMembers',
        (teamMembers) => teamMembers.map(tm => tm.id === id ? { ...tm, ...memberData } : tm),
        () => fetch(`/api/team_members/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(memberData),
        }),
        { type: 'team', action: 'updated', target: id }
      );
    },
    deleteTeamMember: async (id) => {
      await performOptimisticUpdate(
        'teamMembers',
        (teamMembers) => teamMembers.filter(tm => tm.id !== id),
        () => fetch(`/api/team_members/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'team', action: 'deleted', target: id }
      );
    },

    addPayment: async (paymentData) => {
      const id = `py-${Date.now()}`;
      const newPayment: Payment = { ...paymentData, id };
      
      await performOptimisticUpdate(
        'payments',
        (payments) => [...payments, newPayment],
        () => fetch('/api/payments', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newPayment),
        }),
        { type: 'payment', action: 'added', target: newPayment.invoiceNumber }
      );
    },
    updatePayment: async (id, paymentData) => {
      await performOptimisticUpdate(
        'payments',
        (payments) => payments.map(p => p.id === id ? { ...p, ...paymentData } : p),
        () => fetch(`/api/payments/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(paymentData),
        }),
        { type: 'payment', action: 'updated', target: id }
      );
    },
    deletePayment: async (id) => {
      await performOptimisticUpdate(
        'payments',
        (payments) => payments.filter(p => p.id !== id),
        () => fetch(`/api/payments/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        { type: 'payment', action: 'deleted', target: id }
      );
    },
    sendInvoice: async (projectId: string, options?: { totalAmount?: number, paidAmount?: number, dueDate?: string, notes?: string, paymentMethod?: string, bankDetails?: { bankName: string, accountNumber: string, accountName: string } }) => {
      setState(prev => ({ ...prev, syncing: true }));
      try {
        const response = await fetch('/api/invoices/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ projectId, ...options }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to send invoice');
        }
        
        const result = await response.json();
        if (user) await addActivity('payment', 'invoice sent', user.username, projectId);
        await fetchData();
        return result;
      } catch (error: any) {
        console.error('Error sending invoice:', error);
        setState(prev => ({ ...prev, lastSyncError: error.message }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, syncing: false }));
      }
    },
    sendReceipt: async (paymentId: string, installmentIndex: number) => {
      setState(prev => ({ ...prev, syncing: true }));
      try {
        const response = await fetch('/api/payments/receipt', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ paymentId, installmentIndex }),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to send receipt');
        }
        if (user) await addActivity('payment', 'receipt sent', user.username, paymentId);
        await fetchData();
      } catch (error: any) {
        console.error('Error sending receipt:', error);
        setState(prev => ({ ...prev, lastSyncError: error.message }));
      } finally {
        setState(prev => ({ ...prev, syncing: false }));
      }
    },

    addUser: async (userData) => {
      setState(prev => ({ ...prev, syncing: true }));
      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData),
        });
        if (!response.ok) throw new Error('Failed to add user');
        const newUser = await response.json();
        setState(prev => ({ 
          ...prev, 
          users: [...prev.users, newUser],
          syncing: false 
        }));
        if (user) await addActivity('team', 'user added', user.username, newUser.username);
        return true;
      } catch (error) {
        console.error('Error adding user:', error);
        setState(prev => ({ ...prev, syncing: false, lastSyncError: 'Failed to add user' }));
        return false;
      }
    },

    refreshData: async () => {
      setState(prev => ({ ...prev, syncing: true }));
      await fetchData();
      setState(prev => ({ ...prev, syncing: false }));
    },

    getProjectById: (id) => state.projects.find(p => p.id === id),
    getClientById: (id) => state.clients.find(c => c.id === id),
    getTeamMemberById: (id) => teamWithUtilization.find(tm => tm.id === id),
    getTasksByProjectId: (projectId) => state.tasks.filter(t => t.projectId === projectId),
    getCommentsByProjectId: (projectId) => state.comments.filter(c => c.projectId === projectId),
    getCommentsByTaskId: (taskId) => state.comments.filter(c => c.taskId === taskId),
  }), [state, token, user, teamWithUtilization]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
