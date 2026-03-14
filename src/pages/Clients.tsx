/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Eye, Edit2, Trash2, 
  Mail, Phone, Globe, User, Building2, Calendar, Users
} from 'lucide-react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { 
  Card, Button, Input, Select, Badge, Table, THead, TBody, TR, TH, TD, Modal,
  cn, ConfirmModal
} from '../components/UI';
import { format, parseISO } from 'date-fns';
import { Client } from '../types';

export const Clients: React.FC = () => {
  const { clients, teamMembers, projects, addClient, updateClient, deleteClient } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  const { addProject } = useApp();

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.industry || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesIndustry = industryFilter === 'All' || client.industry === industryFilter;
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      
      return matchesSearch && matchesIndustry && matchesStatus;
    });
  }, [clients, searchTerm, industryFilter, statusFilter]);

  const industries = ['All', 'Tech', 'Media', 'Finance', 'Healthcare', 'Retail', 'Education', 'Entertainment', 'Energy', 'Real Estate', 'Aviation', 'Fitness', 'Logistics', 'Food'];

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setIsViewModalOpen(true);
  };

  const handleDeleteClient = (id: string) => {
    openConfirm(
      'Delete Client',
      'Are you sure you want to delete this client? This will not delete their projects.',
      () => deleteClient(id)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
          <p className="text-slate-500 text-sm mt-1">Total {clients.length} clients in your agency</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search clients..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select 
            className="w-full sm:w-40"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </Select>
          <Select 
            className="w-full sm:w-32"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
          {isAdmin && (
            <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add New Client
            </Button>
          )}
        </div>
      </div>

      {/* Client Table */}
      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Client Name</TH>
              <TH>Company</TH>
              <TH>Industry</TH>
              <TH>Project Manager</TH>
              <TH>Projects</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {filteredClients.map((client) => {
              const clientProjects = projects.filter(p => p.clientId === client.id);
              const activeCount = clientProjects.filter(p => p.status !== 'Completed').length;
              const manager = teamMembers.find(tm => tm.id === client.accountManagerId);

              return (
                <TR key={client.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {client.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{client.company}</TD>
                  <TD>
                    <Badge variant="default">{client.industry}</Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                        {manager?.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                      </div>
                      <span className="text-xs">{manager?.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{activeCount} Active</Badge>
                      <span className="text-xs text-slate-400">{clientProjects.length - activeCount} Done</span>
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={client.status === 'Active' ? 'success' : 'default'}>
                      {client.status}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewClient(client)}>
                        <Eye className="w-4 h-4 text-slate-400" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedClient(client); setIsEditModalOpen(true); }}>
                            <Edit2 className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)}>
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        {filteredClients.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No clients found</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">Try adjusting your search or filters to find what you're looking for.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setIndustryFilter('All'); setStatusFilter('All'); }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </Card>

      {/* View Client Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title="Client Profile"
      >
        {selectedClient && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500 text-white flex items-center justify-center text-2xl font-bold">
                  {selectedClient.name?.split(' ')?.map(n => n[0]).join('') || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedClient.name}</h3>
                  <p className="text-slate-500 font-medium">{selectedClient.company}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success">{selectedClient.status}</Badge>
                    <Badge variant="default">{selectedClient.industry}</Badge>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>Edit Profile</Button>
                  <Button size="sm" onClick={() => setIsAddProjectModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Project
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{selectedClient.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{selectedClient.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">{selectedClient.country}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Contact: {selectedClient.contactPerson}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Account Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">Project Manager: {teamMembers.find(tm => tm.id === selectedClient.accountManagerId)?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Client Since: {format(parseISO(selectedClient.createdAt), 'MMMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Project History</h4>
              <div className="space-y-3">
                {projects.filter(p => p.clientId === selectedClient.id).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-500">{p.serviceType}</p>
                    </div>
                    <Badge variant={p.status === 'Completed' ? 'success' : 'primary'}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Notes</h4>
              <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg italic">
                "{selectedClient.notes || 'No notes available for this client.'}"
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Client Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Client"
      >
        {selectedClient && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            updateClient(selectedClient.id, {
              name: formData.get('name') as string,
              company: formData.get('company') as string,
              industry: formData.get('industry') as string,
              contactPerson: formData.get('contactPerson') as string,
              email: formData.get('email') as string,
              phone: formData.get('phone') as string,
              country: formData.get('country') as string,
              accountManagerId: formData.get('accountManagerId') as string,
              status: formData.get('status') as 'Active' | 'Inactive',
              notes: formData.get('notes') as string,
            });
            setIsEditModalOpen(false);
          }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Client Name</label>
                <Input name="name" defaultValue={selectedClient.name} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                <Input name="company" defaultValue={selectedClient.company} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Industry</label>
                <Select name="industry" defaultValue={selectedClient.industry}>
                  {industries.filter(i => i !== 'All').map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                <Input name="contactPerson" defaultValue={selectedClient.contactPerson} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                <Input name="email" type="email" defaultValue={selectedClient.email} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                <Input name="phone" defaultValue={selectedClient.phone} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                <Input name="country" defaultValue={selectedClient.country} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Project Manager</label>
                <Select name="accountManagerId" defaultValue={selectedClient.accountManagerId}>
                  {teamMembers.map(tm => (
                    <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <Select name="status" defaultValue={selectedClient.status}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
              <textarea 
                name="notes"
                defaultValue={selectedClient.notes}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit">Update Client</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Project Modal (from Client) */}
      <Modal 
        isOpen={isAddProjectModalOpen} 
        onClose={() => setIsAddProjectModalOpen(false)} 
        title={`New Project for ${selectedClient?.name}`}
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          if (!selectedClient) return;
          const formData = new FormData(e.currentTarget);
          addProject({
            title: formData.get('title') as string,
            clientId: selectedClient.id,
            serviceType: formData.get('serviceType') as any,
            description: formData.get('description') as string,
            teamMemberIds: [],
            startDate: formData.get('startDate') as string,
            deadline: formData.get('deadline') as string,
            estimatedDelivery: formData.get('deadline') as string,
            budget: Number(formData.get('budget')),
            status: 'Pending',
            priority: formData.get('priority') as any,
            tags: [],
          });
          setIsAddProjectModalOpen(false);
        }}>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Project Title</label>
            <Input name="title" placeholder="e.g. Website Redesign" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Service Type</label>
              <Select name="serviceType">
                <option value="Video Editing">Video Editing</option>
                <option value="Graphic Design">Graphic Design</option>
                <option value="Motion Graphics">Motion Graphics</option>
                <option value="Social Media Campaign">Social Media Campaign</option>
                <option value="Creative Strategy">Creative Strategy</option>
                <option value="Content Research">Content Research</option>
              </Select>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
              <Input name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Deadline</label>
              <Input name="deadline" type="date" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Budget (Rs.)</label>
            <Input name="budget" type="number" placeholder="0.00" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea 
              name="description"
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              placeholder="Project scope and details..."
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* Add Client Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add New Client"
      >
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          addClient({
            name: formData.get('name') as string,
            company: formData.get('company') as string,
            industry: formData.get('industry') as string,
            contactPerson: formData.get('contactPerson') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            country: formData.get('country') as string,
            accountManagerId: formData.get('accountManagerId') as string,
            status: formData.get('status') as 'Active' | 'Inactive',
            notes: formData.get('notes') as string,
          });
          setIsAddModalOpen(false);
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Client Name</label>
              <Input name="name" placeholder="Full Name" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
              <Input name="company" placeholder="Company" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Industry</label>
              <Select name="industry">
                {industries.filter(i => i !== 'All').map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
              <Input name="contactPerson" placeholder="Primary Contact" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
              <Input name="email" type="email" placeholder="email@company.com" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
              <Input name="phone" placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
              <Input name="country" placeholder="USA" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Project Manager</label>
              <Select name="accountManagerId">
                {teamMembers.map(tm => (
                  <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <Select name="status">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
            <textarea 
              name="notes"
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              placeholder="Additional client details..."
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Client</Button>
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
    </div>
  );
};
