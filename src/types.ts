/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectStatus = 'Pending' | 'In Progress' | 'Under Review' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type AvailabilityStatus = 'Available' | 'Busy' | 'On Leave';
export type ExpenditureCategory = 'Salaries' | 'Software' | 'Marketing' | 'Rent' | 'Utilities' | 'Equipment' | 'Other';

export interface Expenditure {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: ExpenditureCategory;
  description: string;
  paymentMethod: string;
  status: 'Paid' | 'Pending';
}

export type ServiceType = 
  | 'Video Editing' 
  | 'Graphic Design' 
  | 'Content Research' 
  | 'Social Media Campaign' 
  | 'Motion Graphics' 
  | 'Creative Strategy' 
  | 'Other';

export interface Client {
  id: string;
  name: string;
  company: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  accountManagerId: string;
  status: 'Active' | 'Inactive';
  notes: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  skills: string[];
  availability: AvailabilityStatus;
  avatar?: string;
  bio?: string;
  utilization: number; // 0-100
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  serviceType: ServiceType;
  description: string;
  teamMemberIds: string[];
  startDate: string;
  deadline: string;
  estimatedDelivery: string;
  budget: number;
  status: ProjectStatus;
  priority: Priority;
  progress: number; // 0-100
  tags: string[];
  isInvoiced?: boolean;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  assignedToId: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  startTime?: string; // "HH:mm"
  subtasks: { id: string; title: string; completed: boolean }[];
  isDayPlanTask?: boolean;
}

export interface Comment {
  id: string;
  projectId?: string;
  taskId?: string;
  authorId: string;
  timestamp: string;
  type: 'Progress Update' | 'Client Feedback' | 'Issue Reported' | 'Resolution' | 'General Note' | 'Revision' | 'Important';
  content: string;
  isIssue: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'task' | 'comment' | 'project' | 'client' | 'team' | 'expenditure' | 'payment';
  action: string;
  user: string;
  target: string;
}

export interface TimeBlock {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;
  title: string;
  type: 'work' | 'personal' | 'break' | 'meeting';
  color: string;
}

export interface DayPlan {
  id: string;
  userId: string;
  date: string; // ISO string (start of day)
  dailyFocus: string;
  notes: string;
  waterIntake: number;
  mood: string | null;
  routine: { id: string; title: string; completed: boolean }[];
  timeBlocks: TimeBlock[];
  gratitude?: string;
  wins?: string;
}

export interface Installment {
  id: string;
  amount: number;
  date: string;
  note: string; // e.g., "1st Installment - Advance"
  paymentMethod: 'JazzCash' | 'Bank Transfer' | 'Cash' | 'Online Payment Gateway' | 'Cheque';
  referenceNumber?: string;
}

export interface Payment {
  id: string;
  projectId: string;
  clientId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Zero Received' | 'Partially Paid' | 'Fully Paid' | 'Overdue';
  isSent: boolean;
  sentAt?: string;
  installments: Installment[];
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}
