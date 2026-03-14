import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: 'admin' | 'member';
      };
    }
  }
}

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';
import { whatsappService } from './whatsapp-service';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gqppjvhpcutgunecsgyb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHBqdmhwY3V0Z3VuZWNzZ3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE4OTA2MSwiZXhwIjoyMDg4NzY1MDYxfQ.kmDue_xuu80VWu_Oj9uNWyTfVi9xtFyfUoyDHFlIygw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function initSettings() {
  try {
    const defaultSettings = [
      { key: 'EMAIL_USER', value: 'trutharcmedia3@gmail.com' },
      { key: 'EMAIL_PASS', value: 'lepv uuhe avmy gjgf' }
    ];

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('key', setting.key)
        .single();

      if (!data) {
        await supabase.from('settings').insert([setting]);
      }
    }
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
  }
}

async function bootstrapUsers() {
  try {
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking users count:', countError.message);
      return;
    }

    const defaultUsers = [
      {
        username: 'Saad',
        email: 'trutharcmedia3@gmail.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        username: 'Saad Waseem',
        email: 'saadwaseemwasr@gmail.com',
        password: 'admin123',
        role: 'admin'
      }
    ];

    for (const user of defaultUsers) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const { error: insertError } = await supabase.from('users').insert([
          {
            ...user,
            password: hashedPassword
          }
        ]);

        if (insertError) {
          console.error(`Failed to create user ${user.email}:`, insertError.message);
        } else {
          console.log(`Successfully bootstrapped user: ${user.email}`);
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to bootstrap users:', error.message);
  }
}

async function startServer() {
  const app = express();

  // 1. Basic Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize WhatsApp Service (background)
  whatsappService.init().catch(err => console.error('Failed to auto-init WhatsApp:', err));

  // 2. Request logging middleware removed
  app.use((req, res, next) => {
    next();
  });

  // 3. WhatsApp API Routes - VERY TOP
  app.get('/api/whatsapp/status', (req, res) => {
    try {
      const status = whatsappService.getStatus();
      res.json(status);
    } catch (err: any) {
      console.error('Error in /api/whatsapp/status:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/connect', async (req, res) => {
    try {
      await whatsappService.init(true);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in /api/whatsapp/connect:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/logout', async (req, res) => {
    try {
      await whatsappService.logout();
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in /api/whatsapp/logout:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/whatsapp/send', async (req, res) => {
    const { to, message, image } = req.body;
    console.log(`WhatsApp Send Request: to=${to}, messageLength=${message?.length}, hasImage=${!!image}`);
    try {
      await whatsappService.sendMessage(to, message, image);
      console.log(`WhatsApp message sent successfully to ${to}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/whatsapp/send:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
  });

  // Auth Routes
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error(`Login error for ${email}:`, error.message);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user) {
        console.warn(`Login failed: User not found for ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.warn(`Login failed: Invalid password for ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } catch (err: any) {
      console.error('Critical login error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('id', decoded.id)
        .single();
      
      if (error) throw error;
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Middleware to check auth
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // User Management (Admin only)
  app.post('/api/users', authenticate, isAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = Math.random().toString(36).substr(2, 9);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ id, username, email, password: hashedPassword, role }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: 'User already exists or error creating user' });
    }
    res.json({ id, username, email, role });
  });

  app.get('/api/users', authenticate, isAdmin, async (req, res) => {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, role');
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(users);
  });

  app.delete('/api/users/:id', authenticate, isAdmin, async (req, res) => {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.patch('/api/users/:id', authenticate, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, email, role')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Generic CRUD helper
  const setupCrud = (table: string) => {
    app.get(`/api/${table}`, authenticate, async (req, res) => {
      try {
        // Financial tables restricted to admin
        if (['expenditures'].includes(table) && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        let query = supabase.from(table).select('*');

        // Apply filtering for non-admins
        if (req.user.role !== 'admin') {
          if (table === 'day_plans') {
            // Use id prefix for isolation since userId column might be missing
            query = query.ilike('id', `dp-${req.user.id}-%`);
          } else if (table === 'tasks') {
            // Find team member ID for this user email
            const { data: member } = await supabase.from('team_members').select('id').eq('email', req.user.email).single();
            if (member) {
              query = query.or(`assignedToId.eq.${req.user.id},assignedToId.eq.${member.id}`);
            } else {
              query = query.eq('assignedToId', req.user.id);
            }
          }
        }

        const { data, error } = await query;
        
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
      } catch (err: any) {
        console.error(`Error in GET /api/${table}:`, err);
        res.status(500).json({ error: err.message });
      }
    });

    app.post(`/api/${table}`, authenticate, async (req, res) => {
      try {
        // Restrict creation of sensitive entities to admin
        if (['expenditures', 'clients', 'projects', 'team_members'].includes(table) && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        const body = req.body;
        const id = body.id || Math.random().toString(36).substr(2, 9);
        const payload = { ...body, id };

        // Auto-assign assignedToId for tasks if not provided
        if (table === 'tasks' && !payload.assignedToId) {
          payload.assignedToId = req.user.id;
        }
        
        const { data, error } = await supabase
          .from(table)
          .insert([payload])
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
      } catch (err: any) {
        console.error(`Error in POST /api/${table}:`, err);
        res.status(500).json({ error: err.message });
      }
    });

    app.put(`/api/${table}/:id`, authenticate, async (req, res) => {
      try {
        if (req.user.role !== 'admin') {
          // Restricted tables for non-admins
          if (['expenditures', 'clients', 'team_members'].includes(table)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          
          // For projects and tasks, members can only update status and progress
          if (['projects', 'tasks'].includes(table)) {
            // If it's a task, check if the user is the assignee
            if (table === 'tasks') {
              // Find team member ID for this user email
              const { data: member } = await supabase.from('team_members').select('id').eq('email', req.user.email).single();
              const memberId = member?.id;

              const { data: task } = await supabase.from('tasks').select('assignedToId').eq('id', req.params.id).single();
              if (task && (task.assignedToId === req.user.id || task.assignedToId === memberId)) {
                // User is the assignee, allow full update
              } else {
                const allowedFields = ['status', 'progress', 'subtasks', 'actualHours'];
                const keys = Object.keys(req.body).filter(k => k !== 'id');
                if (keys.some(k => !allowedFields.includes(k))) {
                  return res.status(403).json({ error: 'Forbidden: Members can only update status, progress, and hours of tasks not assigned to them' });
                }
              }
            } else {
              // For projects, always restrict
              const allowedFields = ['status', 'progress', 'subtasks', 'actualHours'];
              const keys = Object.keys(req.body).filter(k => k !== 'id');
              if (keys.some(k => !allowedFields.includes(k))) {
                return res.status(403).json({ error: 'Forbidden: Members can only update status, progress, and hours' });
              }
            }
          }
        }
        
        const body = req.body;
        const id = req.params.id;
        
        const { data, error } = await supabase
          .from(table)
          .update(body)
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
      } catch (err: any) {
        console.error(`Error in PUT /api/${table}:`, err);
        res.status(500).json({ error: err.message });
      }
    });

    app.delete(`/api/${table}/:id`, authenticate, async (req, res) => {
      try {
        const id = req.params.id;

        // For non-admins, check ownership
        if (req.user.role !== 'admin') {
          if (table === 'tasks') {
            // Find team member ID for this user email
            const { data: member } = await supabase.from('team_members').select('id').eq('email', req.user.email).single();
            const memberId = member?.id;

            const { data: task } = await supabase.from('tasks').select('assignedToId').eq('id', id).single();
            if (task && task.assignedToId !== req.user.id && task.assignedToId !== memberId) {
              return res.status(403).json({ error: 'Forbidden: You can only delete your own tasks' });
            }
          } else if (table === 'day_plans') {
            // Since userId column is missing, we might need to skip this check or fix the schema
            // For now, let's assume we want to allow it if we can't verify ownership yet
            // or we fix the schema.
          } else if (['expenditures', 'clients', 'projects', 'team_members'].includes(table)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        }

        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
      } catch (err: any) {
        console.error(`Error in DELETE /api/${table}:`, err);
        res.status(500).json({ error: err.message });
      }
    });
  };

  // Specific delete handler for clients
  app.delete('/api/clients/:id', authenticate, isAdmin, async (req, res) => {
    const clientId = req.params.id;
    try {
      // 1. Get all projects for this client
      const { data: projects } = await supabase.from('projects').select('id').eq('clientId', clientId);
      
      if (projects && projects.length > 0) {
        for (const project of projects) {
          // Delete everything related to each project
          await supabase.from('tasks').delete().eq('projectId', project.id);
          await supabase.from('comments').delete().eq('projectId', project.id);
          await supabase.from('payments').delete().eq('projectId', project.id);
          await supabase.from('projects').delete().eq('id', project.id);
        }
      }
      
      // 2. Finally delete the client
      await supabase.from('payments').delete().eq('clientId', clientId);
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete client' });
    }
  });

  // Specific delete handler for projects to handle related records
  app.delete('/api/projects/:id', authenticate, isAdmin, async (req, res) => {
    const projectId = req.params.id;
    try {
      await supabase.from('tasks').delete().eq('projectId', projectId);
      await supabase.from('comments').delete().eq('projectId', projectId);
      await supabase.from('payments').delete().eq('projectId', projectId);
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete project' });
    }
  });

  // Specific delete handler for tasks
  app.delete('/api/tasks/:id', authenticate, isAdmin, async (req, res) => {
    const taskId = req.params.id;
    try {
      await supabase.from('comments').delete().eq('taskId', taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete task' });
    }
  });

  // Specific handlers for payments to handle schema differences
  app.post('/api/payments', authenticate, async (req, res) => {
    const { paidAmount, installments, isSent, sentAt, bankDetails, ...rest } = req.body;
    const id = rest.id || `py-${Date.now()}`;
    
    const dbPayment = {
      ...rest,
      id,
      amountPaid: paidAmount || 0
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([dbPayment])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    
    // Map back for frontend
    res.json({
      ...data,
      paidAmount: data.amountPaid || 0,
      installments: []
    });
  });

  app.put('/api/payments/:id', authenticate, async (req, res) => {
    const { paidAmount, installments, isSent, sentAt, bankDetails, ...rest } = req.body;
    const id = req.params.id;
    
    const dbUpdate: any = { ...rest };
    if (paidAmount !== undefined) dbUpdate.amountPaid = paidAmount;

    const { data, error } = await supabase
      .from('payments')
      .update(dbUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    
    // Map back for frontend
    res.json({
      ...data,
      paidAmount: data.amountPaid || 0,
      installments: []
    });
  });

  ['clients', 'projects', 'tasks', 'expenditures', 'comments', 'activity_logs', 'day_plans', 'team_members'].forEach(t => {
    setupCrud(t);
  });
  
  // We already handled payments specifically, but we still need the GET and DELETE from setupCrud
  // So we can just call setupCrud for payments but it will define POST/PUT again which might conflict
  // Better to just define GET and DELETE for payments here or modify setupCrud to be more flexible.
  
  app.get('/api/payments', authenticate, async (req, res) => {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map((p: any) => ({
      ...p,
      paidAmount: p.amountPaid || 0,
      totalAmount: p.totalAmount || 0,
      installments: p.installments || [],
      isSent: p.isSent ?? true,
      invoiceDate: p.invoiceDate || new Date().toISOString(),
      dueDate: p.dueDate || new Date().toISOString(),
      status: p.status || 'Pending'
    })));
  });

  app.delete('/api/payments/:id', authenticate, isAdmin, async (req, res) => {
    const { error } = await supabase.from('payments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get('/api/health', async (req, res) => {
    try {
      const { data, error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
      if (error) throw error;
      res.json({ status: 'ok', database: 'connected' });
    } catch (err: any) {
      console.error('Database health check failed:', err);
      res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
  });

  app.get('/api/data', authenticate, async (req, res) => {
    const tables = ['clients', 'projects', 'tasks', 'expenditures', 'comments', 'activity_logs', 'day_plans', 'team_members', 'settings', 'payments'];
    const data: any = {};

    try {
      const results = await Promise.all(tables.map(async (table) => {
        try {
          // Financial tables restricted to admin
          if (['expenditures'].includes(table) && req.user.role !== 'admin') {
            return { table, rows: [] };
          }
          
          let query = supabase.from(table).select('*');

          // Apply filtering for non-admins
          if (req.user.role !== 'admin') {
            if (table === 'day_plans') {
              query = query.ilike('id', `dp-${req.user.id}-%`);
            } else if (table === 'tasks') {
              query = query.eq('assignedToId', req.user.id);
            }
          }

          const { data: rows, error } = await query;
          
          if (error) {
            console.error(`Supabase error fetching ${table}:`, error.message);
            return { table, rows: [], error: error.message };
          }
          return { table, rows: rows || [] };
        } catch (err: any) {
          console.error(`Unexpected error fetching ${table}:`, err.message);
          return { table, rows: [], error: err.message };
        }
      }));

      let hasAnyError = false;
      const tableErrors: string[] = [];
      results.forEach(({ table, rows, error }) => {
        if (error) {
          hasAnyError = true;
          tableErrors.push(`${table}: ${error}`);
        }
        if (table === 'team_members') {
          data.teamMembers = rows;
        } else if (table === 'day_plans') {
          data.dayPlans = rows;
        } else if (table === 'activity_logs') {
          data.activityLogs = rows;
        } else if (table === 'payments') {
          data.payments = rows.map((p: any) => ({
            ...p,
            paidAmount: p.amountPaid || 0,
            totalAmount: p.totalAmount || 0,
            installments: p.installments || [],
            isSent: p.isSent ?? true,
            invoiceDate: p.invoiceDate || new Date().toISOString(),
            dueDate: p.dueDate || new Date().toISOString(),
            status: p.status || 'Pending'
          }));
        } else {
          data[table] = rows;
        }
      });

      const { data: budgetSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'monthlyBudget')
        .single();
      
      data.monthlyBudget = budgetSetting ? parseFloat(budgetSetting.value) : 500000;

      res.json({ ...data, _syncError: hasAnyError, _tableErrors: tableErrors });
    } catch (error: any) {
      console.error('Error fetching bulk data:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/activity_logs', authenticate, async (req, res) => {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert([req.body]);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error adding activity log:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/settings/:key', authenticate, isAdmin, async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: value.toString() });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Test Email Connection
  app.post('/api/email/test', authenticate, isAdmin, async (req, res) => {
    try {
      const { data: settings } = await supabase.from('settings').select('*');
      const emailUser = settings?.find(s => s.key === 'EMAIL_USER')?.value;
      const emailPass = settings?.find(s => s.key === 'EMAIL_PASS')?.value;

      if (!emailUser || !emailPass) {
        throw new Error('Email settings not configured');
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      await transporter.verify();
      
      await transporter.sendMail({
        from: `"Truth Arc Media" <${emailUser}>`,
        to: emailUser,
        subject: '✅ Truth Arc Media: Email Connection Test',
        text: 'If you are reading this, your email connection is working perfectly! You can now send invoices and receipts to your clients.',
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Email test failed:', error);
      let errorMessage = error.message || 'Test failed';
      if (errorMessage.includes('Invalid login') || errorMessage.includes('Unauthorized') || error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please ensure you are using a 16-character Gmail "App Password" (not your regular password) and that 2-Step Verification is enabled.';
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/invoices/send', authenticate, isAdmin, async (req, res) => {
    const { projectId, totalAmount, paidAmount, dueDate, notes, paymentMethod, bankDetails } = req.body;
    
    try {
      // 1. Get project and client details
      const { data: project, error: pError } = await supabase
        .from('projects')
        .select('*, clients(*)')
        .eq('id', projectId)
        .single();
      
      if (pError || !project) throw new Error('Project not found');
      
      const client = project.clients;
      if (!client) throw new Error('Client not found for this project');

      // 2. Get settings for email and bank details
      const { data: settings } = await supabase.from('settings').select('*');
      
      const finalBankDetails = bankDetails || {
        bankName: settings?.find(s => s.key === 'BANK_NAME')?.value || 'JazzCash',
        accountNumber: settings?.find(s => s.key === 'ACCOUNT_NUMBER')?.value || '03288903232',
        accountName: settings?.find(s => s.key === 'ACCOUNT_NAME')?.value || 'Nazia Rasheed'
      };

      // 3. Create payment record
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const paymentId = `py-${Date.now()}`;

      const newPayment = {
        id: paymentId,
        projectId: project.id,
        clientId: client.id,
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalAmount: totalAmount || project.budget,
        amountPaid: paidAmount || 0,
        paymentMethod: paymentMethod || 'Bank Transfer',
        status: (paidAmount || 0) >= (totalAmount || project.budget) ? 'Fully Paid' : (paidAmount > 0 ? 'Partially Paid' : 'Zero Received'),
        notes: notes || ''
      };

      const { error: payError } = await supabase
        .from('payments')
        .insert([newPayment]);
      
      if (payError) throw payError;

      // Fetch all payments for this project to show history
      const { data: projectPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('projectId', project.id);
      
      const allInstallments = (projectPayments || []).flatMap(p => p.installments || []);
      const totalPaidSoFar = (projectPayments || []).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const currentTotalAmount = totalAmount || project.budget;
      const remainingBalance = currentTotalAmount - totalPaidSoFar;

      const historyRows = allInstallments.map((inst, idx) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${idx + 1}. ${new Date(inst.date).toLocaleDateString()}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${inst.note || 'Installment'}</td>
          <td align="right" style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600;">Rs. ${inst.amount.toLocaleString()}</td>
        </tr>
      `).join('');

      const historyTable = allInstallments.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Payment History</h3>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th align="left" style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Date</th>
                <th align="left" style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Note</th>
                <th align="right" style="padding: 8px 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${historyRows}
            </tbody>
          </table>
        </div>
      ` : '';

      // 4. Send Email
      try {
        const emailUser = settings?.find(s => s.key === 'EMAIL_USER')?.value;
        const emailPass = settings?.find(s => s.key === 'EMAIL_PASS')?.value;

        if (emailUser && emailPass) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass },
          });

          const mailOptions = {
            from: `"Truth Arc Media" <${emailUser}>`,
            to: client.email,
            subject: `Invoice ${invoiceNumber} - Truth Arc Media`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 20px !important; }
      .header { padding: 30px 20px !important; }
      .meta-table td { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 15px !important; }
      .billing-table td { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 20px !important; }
      .totals-table { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #111111; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td class="header" style="background-color: #0f172a; padding: 50px 40px; text-align: center; border-bottom: 1px solid #1a1a1a;">
              <div style="width: 64px; height: 64px; background-color: #10b981; border-radius: 16px; margin: 0 auto 20px auto; display: table;">
                <div style="display: table-cell; vertical-align: middle; text-align: center; font-size: 32px; font-weight: 900; color: #ffffff;">T</div>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Truth Arc Media</h1>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;">Digital Marketing Agency</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              <!-- Invoice Meta -->
              <table class="meta-table" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                <tr>
                  <td>
                    <div style="background-color: #1a1a1a; padding: 12px 16px; border-radius: 12px; border: 1px solid #262626; display: inline-block;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Invoice Number</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff; font-family: monospace;">${invoiceNumber}</p>
                    </div>
                  </td>
                  <td align="right">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Due Date</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ef4444;">${new Date(newPayment.dueDate).toLocaleDateString()}</p>
                  </td>
                </tr>
              </table>

              <!-- Billing Info -->
              <table class="billing-table" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 40px;">
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 12px;">Client Details</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">${client.company || client.name}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">${client.contactPerson}</p>
                    <p style="margin: 2px 0 0 0; font-size: 13px; color: #94a3b8;">${client.email}</p>
                  </td>
                  <td width="50%" style="vertical-align: top; text-align: right;">
                    <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 12px;">Project</p>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">${project.title}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">${project.serviceType}</p>
                  </td>
                </tr>
              </table>

              <!-- Items Table -->
              <div style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #262626; overflow: hidden; margin-bottom: 30px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <thead>
                    <tr style="background-color: #262626;">
                      <th align="left" style="padding: 16px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Description</th>
                      <th align="right" style="padding: 16px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 20px 16px;">
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">${project.title}</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${project.serviceType}</p>
                      </td>
                      <td align="right" style="padding: 20px 16px; font-size: 16px; font-weight: 800; color: #ffffff;">
                        Rs. ${currentTotalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Payment History -->
              ${allInstallments.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 12px 0; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.2em;">Payment History</h3>
                <div style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #262626; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <thead>
                      <tr style="background-color: #262626;">
                        <th align="left" style="padding: 12px 16px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Date</th>
                        <th align="right" style="padding: 12px 16px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${allInstallments.map((inst, idx) => `
                        <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #262626; font-size: 13px; color: #94a3b8;">${new Date(inst.date).toLocaleDateString()}</td>
                          <td align="right" style="padding: 12px 16px; border-bottom: 1px solid #262626; font-size: 13px; font-weight: 700; color: #ffffff;">Rs. ${inst.amount.toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ` : ''}

              <!-- Totals -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 40px;">
                <tr>
                  <td align="right">
                    <table class="totals-table" border="0" cellspacing="0" cellpadding="0" style="width: 280px;">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #94a3b8;">Total Project Budget:</td>
                        <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #ffffff;">Rs. ${currentTotalAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #94a3b8;">Total Paid to Date:</td>
                        <td align="right" style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #10b981;">Rs. ${totalPaidSoFar.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 0 0; font-size: 16px; font-weight: 700; color: #ffffff; border-top: 1px solid #262626;">Balance Due:</td>
                        <td align="right" style="padding: 16px 0 0 0; font-size: 20px; font-weight: 900; color: #6366f1; border-top: 1px solid #262626;">Rs. ${remainingBalance.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Instructions -->
              <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 20px; padding: 30px;">
                <h3 style="margin: 0 0 20px 0; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.2em; text-align: center;">Payment Instructions</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Bank Name</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${finalBankDetails.bankName}</p>
                    </td>
                    <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Account Number</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff; font-family: monospace;">${finalBankDetails.accountNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0 0 0;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Account Name</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${finalBankDetails.accountName}</p>
                    </td>
                    <td align="right" style="padding: 16px 0 0 0;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Status</p>
                      <div style="margin-top: 4px; background-color: #1a1a1a; border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; text-transform: uppercase; display: inline-block;">Pending</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 40px; text-align: center; border-top: 1px solid #262626;">
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">We appreciate your prompt payment.</p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">&copy; 2026 Truth Arc Media • Digital Marketing Agency</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
          };

          await transporter.sendMail(mailOptions);
        }
      } catch (emailErr) {
        console.error('Failed to send invoice email:', emailErr);
      }

      res.json({ success: true, invoiceNumber });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to send invoice' });
    }
  });

  app.post('/api/payments/receipt', authenticate, isAdmin, async (req, res) => {
    const { paymentId, installmentIndex } = req.body;
    
    try {
      // 1. Get payment and client details
      const { data: payment, error: pError } = await supabase
        .from('payments')
        .select('*, clients(*), projects(*)')
        .eq('id', paymentId)
        .single();
      
      if (pError || !payment) throw new Error('Payment record not found');
      
      // Map schema
      payment.paidAmount = payment.amountPaid || 0;
      payment.installments = payment.installments || [];
      
      // Fallback if installments are not tracked in DB
      const installment = payment.installments[installmentIndex] || {
        amount: payment.paidAmount,
        date: new Date().toISOString(),
        note: 'Payment received'
      };

      const client = payment.clients;
      const project = payment.projects;
      if (!client) throw new Error('Client not found');

      // Fetch all payments for this project to show full history
      const { data: projectPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('projectId', project.id);
      
      const allProjectInstallments = (projectPayments || []).flatMap(p => p.installments || []);

      // 2. Send Receipt Email
      const { data: settings } = await supabase.from('settings').select('*');
      const emailUser = settings?.find(s => s.key === 'EMAIL_USER')?.value;
      const emailPass = settings?.find(s => s.key === 'EMAIL_PASS')?.value;

      const totalInvoice = payment.totalAmount;
      const amountPaidNow = installment.amount;
      const totalPaidToDate = payment.paidAmount;
      const paymentAlreadyPaid = totalPaidToDate - amountPaidNow;
      const remainingPayment = totalInvoice - totalPaidToDate;

      if (emailUser && emailPass) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: emailUser, pass: emailPass },
          });

          const mailOptions = {
            from: `"Truth Arc Media" <${emailUser}>`,
            to: client.email,
            subject: `Payment Receipt: ${payment.invoiceNumber} - Truth Arc Media`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
  <style>
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 20px !important; }
      .header { padding: 30px 20px !important; }
      .meta-table td { display: block !important; width: 100% !important; text-align: left !important; padding-bottom: 15px !important; }
      .summary-table td { padding: 8px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #111111; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td class="header" style="background-color: #10b981; padding: 50px 40px; text-align: center; border-bottom: 1px solid #1a1a1a;">
              <div style="width: 64px; height: 64px; background-color: #ffffff; border-radius: 16px; margin: 0 auto 20px auto; display: table;">
                <div style="display: table-cell; vertical-align: middle; text-align: center; font-size: 32px; font-weight: 900; color: #10b981;">T</div>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Truth Arc Media</h1>
              <p style="margin: 8px 0 0 0; color: #ecfdf5; font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;">Payment Confirmation</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #1a1a1a; color: #10b981; padding: 8px 16px; border: 1px solid #10b981; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; display: inline-block; margin-bottom: 16px;">Payment Received</div>
                <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">Thank You for Your Payment</h2>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Hello <strong>${client.contactPerson}</strong>, your payment for <strong>${project.title}</strong> has been received.</p>
              </div>

              <div style="background-color: #1a1a1a; border-radius: 20px; border: 1px solid #262626; padding: 30px; margin-bottom: 30px;">
                <table class="meta-table" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" style="padding-bottom: 20px; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Receipt Number</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${payment.invoiceNumber}</p>
                    </td>
                    <td width="50%" align="right" style="padding-bottom: 20px; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Date Received</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${new Date(installment.date).toLocaleDateString()}</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 20px 0; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Installment</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #6366f1;">${installment.note || 'Payment'}</p>
                    </td>
                    <td width="50%" align="right" style="padding: 20px 0; border-bottom: 1px solid #262626;">
                      <p style="margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Method</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${installment.paymentMethod || 'Bank Transfer'}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Account Summary -->
              <div style="background-color: #1a1a1a; border: 1px solid #262626; border-radius: 20px; padding: 24px; margin-bottom: 30px;">
                <table class="summary-table" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 13px; color: #94a3b8;">Total Invoice</span>
                    </td>
                    <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 14px; font-weight: 700; color: #ffffff;">Rs. ${totalInvoice.toLocaleString()}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 13px; color: #94a3b8;">Payment Already Paid</span>
                    </td>
                    <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 14px; font-weight: 700; color: #ffffff;">Rs. ${paymentAlreadyPaid.toLocaleString()}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 13px; color: #10b981; font-weight: 700;">Amount Paid Now</span>
                    </td>
                    <td align="right" style="padding: 8px 0; border-bottom: 1px solid #262626;">
                      <span style="font-size: 18px; font-weight: 900; color: #10b981;">Rs. ${amountPaidNow.toLocaleString()}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0 0;">
                      <span style="font-size: 14px; color: #ffffff; font-weight: 700;">Remaining Payment</span>
                    </td>
                    <td align="right" style="padding: 12px 0 0 0;">
                      <span style="font-size: 18px; font-weight: 900; color: #ef4444;">Rs. ${remainingPayment.toLocaleString()}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Payment History -->
              ${allProjectInstallments.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 12px 0; font-size: 10px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.2em;">Full Payment History</h3>
                <div style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #262626; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <thead>
                      <tr style="background-color: #262626;">
                        <th align="left" style="padding: 12px 16px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Date</th>
                        <th align="left" style="padding: 12px 16px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Note</th>
                        <th align="right" style="padding: 12px 16px; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${allProjectInstallments.map((inst: any, idx: number) => `
                        <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #262626; font-size: 12px; color: #94a3b8;">${new Date(inst.date).toLocaleDateString()}</td>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #262626; font-size: 12px; color: #94a3b8;">${inst.note || 'Payment'}</td>
                          <td align="right" style="padding: 12px 16px; border-bottom: 1px solid #262626; font-size: 12px; font-weight: 700; color: #ffffff;">Rs. ${inst.amount.toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 40px;">
                <p style="font-size: 14px; color: #64748b;">If you have any questions regarding this receipt, please feel free to contact us.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 40px; text-align: center; border-top: 1px solid #262626;">
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #ffffff;">Thank you for choosing Truth Arc Media!</p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">&copy; 2026 Truth Arc Media • Digital Marketing Agency</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
          };

          await transporter.sendMail(mailOptions);
        } catch (emailErr) {
          console.error('Failed to send receipt email:', emailErr);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending receipt:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // API 404 Handler - prevents falling through to SPA fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global Error Handler for API
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api')) {
      console.error('Unhandled API Error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Run bootstrap logic
  if (!process.env.VERCEL) {
    bootstrapUsers().catch(err => console.error('Failed to bootstrap users:', err));
    initSettings().catch(err => console.error('Failed to initialize settings:', err));
    whatsappService.init().catch(err => console.error('Failed to initialize WhatsApp:', err));
  } else {
    // On Vercel, we run these but don't wait for them, and we skip WhatsApp background init
    bootstrapUsers().catch(() => {});
    initSettings().catch(() => {});
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
