/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, TeamMember, Project, Task, Comment, ActivityLog, TaskStatus, Priority } from '../types';
import { subDays, subMonths, addDays, format } from 'date-fns';

// Team Members
export const teamMembers: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Saad Ahmed',
    role: 'Creative Director',
    email: 'saad@trutharc.com',
    phone: '+1 234 567 890',
    skills: ['Strategy', 'Video', 'Design'],
    availability: 'Available',
    utilization: 85,
  },
  {
    id: 'tm-2',
    name: 'Jane Doe',
    role: 'Senior Editor',
    email: 'jane@trutharc.com',
    phone: '+1 234 567 891',
    skills: ['Premiere Pro', 'After Effects'],
    availability: 'Busy',
    utilization: 95,
  }
];

// Clients
export const clients: Client[] = [
  {
    id: 'cl-1',
    name: 'John Smith',
    company: 'TechCorp Solutions',
    industry: 'Technology',
    contactPerson: 'John Smith',
    email: 'john@techcorp.com',
    phone: '+1 555 0123',
    country: 'USA',
    accountManagerId: 'tm-1',
    status: 'Active',
    notes: 'Key account for Q1',
    createdAt: subMonths(new Date(), 2).toISOString(),
  },
  {
    id: 'cl-2',
    name: 'Sarah Wilson',
    company: 'Green Energy Co',
    industry: 'Renewables',
    contactPerson: 'Sarah Wilson',
    email: 'sarah@greenenergy.com',
    phone: '+1 555 0124',
    country: 'Canada',
    accountManagerId: 'tm-1',
    status: 'Active',
    notes: 'Interested in video series',
    createdAt: subMonths(new Date(), 1).toISOString(),
  }
];

// Projects
export const projects: Project[] = [
  {
    id: 'pj-1',
    title: 'Website Design',
    clientId: 'cl-1',
    serviceType: 'Graphic Design',
    description: 'Full website redesign and branding',
    teamMemberIds: ['tm-1', 'tm-2'],
    startDate: subDays(new Date(), 30).toISOString(),
    deadline: addDays(new Date(), 15).toISOString(),
    estimatedDelivery: addDays(new Date(), 10).toISOString(),
    budget: 10000,
    status: 'In Progress',
    priority: 'High',
    progress: 65,
    tags: ['web', 'branding'],
  },
  {
    id: 'pj-2',
    title: 'Social Media Campaign',
    clientId: 'cl-2',
    serviceType: 'Social Media Campaign',
    description: 'Q2 Awareness campaign',
    teamMemberIds: ['tm-1'],
    startDate: subDays(new Date(), 10).toISOString(),
    deadline: addDays(new Date(), 20).toISOString(),
    estimatedDelivery: addDays(new Date(), 18).toISOString(),
    budget: 5000,
    status: 'In Progress',
    priority: 'Medium',
    progress: 30,
    tags: ['social', 'marketing'],
  }
];

// Tasks
export const tasks: Task[] = [
  {
    id: 'tk-1',
    title: 'Initial Wireframes',
    projectId: 'pj-1',
    assignedToId: 'tm-2',
    description: 'Create wireframes for homepage and about page',
    priority: 'High',
    status: 'Done',
    dueDate: subDays(new Date(), 20).toISOString(),
    estimatedHours: 10,
    actualHours: 12,
    subtasks: [
      { id: 'st-1', title: 'Homepage', completed: true },
      { id: 'st-2', title: 'About Page', completed: true }
    ],
  }
];

// Comments
export const comments: Comment[] = [];

// Activity Log
export const activityLogs: ActivityLog[] = [];
