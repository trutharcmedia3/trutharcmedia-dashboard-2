/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, User, Bell, Monitor, Database, 
  Save, Shield, Globe, Mail, Lock, Trash2, Download, Pencil,
  CheckCircle2, CreditCard, Clock, MessageSquare,
  Cloud, CloudOff, AlertCircle, RefreshCw, ExternalLink, Activity,
  Smartphone, Users, UserPlus, X
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Input, Select, cn, Badge } from '../components/UI';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { User as UserType } from '../types';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agency');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const { clients, settings } = useApp();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserType[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'member' as 'admin' | 'member'
  });

  const checkDbStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (data.database === 'connected') {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch (error) {
      setDbStatus('error');
    }
  };

  useEffect(() => {
    checkDbStatus();
  }, []);
  
  const tabs = [
    { id: 'agency', name: 'Agency Profile', icon: Building2 },
    { id: 'account', name: 'User Account', icon: User },
    ...(currentUser?.role === 'admin' ? [{ id: 'users', name: 'User Management', icon: Users }] : []),
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'display', name: 'Display & UI', icon: Monitor },
    { id: 'email', name: 'Email Settings', icon: Mail },
    { id: 'whatsapp', name: 'WhatsApp', icon: Smartphone },
    { id: 'data', name: 'Data Management', icon: Database },
  ];

  const [emailSettings, setEmailSettings] = useState({
    EMAIL_USER: '',
    EMAIL_PASS: ''
  });
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const [whatsappStatus, setWhatsappStatus] = useState<{
    status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
    qr: string | null;
    user: { id: string; name?: string } | null;
  }>({ status: 'disconnected', qr: null, user: null });
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  const fetchWhatsAppStatus = async () => {
    try {
      const response = await fetch(`/api/whatsapp/status?t=${Date.now()}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setWhatsappStatus(data);
        }
      }
    } catch (error) {
      // Silent fail for status polling
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
    // Poll faster when connecting or waiting for QR
    const intervalTime = whatsappStatus.status === 'connected' ? 10000 : 2000;
    const interval = setInterval(fetchWhatsAppStatus, intervalTime);
    return () => clearInterval(interval);
  }, [whatsappStatus.status]);

  const handleConnectWhatsApp = async () => {
    setIsConnectingWhatsApp(true);
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
      fetchWhatsAppStatus();
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
    } finally {
      setIsConnectingWhatsApp(false);
    }
  };

  const handleLogoutWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      fetchWhatsAppStatus();
    } catch (error) {
      console.error('Error logging out WhatsApp:', error);
    }
  };

  useEffect(() => {
    if (settings && settings.length > 0) {
      const userSetting = settings.find((s: any) => s.key === 'EMAIL_USER');
      const passSetting = settings.find((s: any) => s.key === 'EMAIL_PASS');
      
      setEmailSettings({
        EMAIL_USER: userSetting?.value || '',
        EMAIL_PASS: passSetting?.value || ''
      });
    }
  }, [settings]);

  const handleSaveEmailSettings = async () => {
    setIsSavingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const trimmedUser = emailSettings.EMAIL_USER.trim();
      const trimmedPass = emailSettings.EMAIL_PASS.trim();
      
      const responses = await Promise.all([
        fetch('/api/settings/EMAIL_USER', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ value: trimmedUser })
        }),
        fetch('/api/settings/EMAIL_PASS', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ value: trimmedPass })
        })
      ]);

      if (responses.every(r => r.ok)) {
        alert('✅ Email settings saved successfully!');
      } else {
        alert('❌ Failed to save some settings.');
      }
    } catch (error) {
      console.error('Error saving email settings:', error);
      alert('❌ Error saving settings.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        alert('✅ Test email sent successfully! Check your inbox (including spam).');
      } else {
        alert(`❌ Test failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error testing email:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const fetchUsers = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsFetchingUsers(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsFetchingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all fields');
      return;
    }

    setIsAddingUser(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        alert('✅ User added successfully!');
        setNewUser({ username: '', email: '', password: '', role: 'member' });
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`❌ Failed to add user: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('❌ Error adding user');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ User deleted successfully!');
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`❌ Failed to delete user: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Error deleting user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          role: editingUser.role,
          password: editPassword || undefined
        })
      });

      if (response.ok) {
        alert('✅ User updated successfully!');
        setEditingUser(null);
        setEditPassword('');
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`❌ Failed to update user: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('❌ Error updating user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </aside>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'agency' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">Agency Profile</h3>
                <p className="text-xs text-slate-500 mt-1">Manage your agency's public information and branding.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl">T</div>
                  <div>
                    <Button variant="outline" size="sm">Change Logo</Button>
                    <p className="text-xs text-slate-400 mt-2">JPG, PNG or SVG. Max size 2MB.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Agency Name</label>
                    <Input defaultValue="Truth Arc Media" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Website</label>
                    <Input defaultValue="https://trutharc.media" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Email</label>
                    <Input defaultValue="hello@trutharc.media" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                    <Input defaultValue="+1 (555) 123-4567" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Office Address</label>
                  <textarea 
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                    defaultValue="123 Creative Way, Suite 100, Los Angeles, CA 90001"
                  />
                </div>
                <div className="flex justify-end">
                  <Button><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'account' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">User Account</h3>
                <p className="text-xs text-slate-500 mt-1">Update your personal information and security settings.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">Personal Info</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                      <Input defaultValue={currentUser?.username || "Admin User"} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                      <Input defaultValue={currentUser?.email || "admin@trutharc.com"} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">Security</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Password</p>
                          <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Change Password</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Two-Factor Authentication</p>
                          <p className="text-xs text-slate-500">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Enable 2FA</Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button><Save className="w-4 h-4 mr-2" /> Update Account</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-900">Add New User</h3>
                  <p className="text-xs text-slate-500 mt-1">Create a new account for a team member.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Username / Full Name</label>
                        <Input 
                          placeholder="e.g. John Doe"
                          value={newUser.username}
                          onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                        <Input 
                          type="email"
                          placeholder="john@example.com"
                          value={newUser.email}
                          onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                        <Input 
                          type="password"
                          placeholder="••••••••"
                          value={newUser.password}
                          onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                        <Select
                          value={newUser.role}
                          onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' }))}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isAddingUser}>
                        {isAddingUser ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Create User Account
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">Existing Users</h3>
                      <p className="text-xs text-slate-500 mt-1">Manage current team members and their access levels.</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={isFetchingUsers}>
                      <RefreshCw className={cn("w-4 h-4", isFetchingUsers && "animate-spin")} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-3 font-bold text-slate-500 uppercase text-[10px]">User</th>
                          <th className="pb-3 font-bold text-slate-500 uppercase text-[10px]">Email</th>
                          <th className="pb-3 font-bold text-slate-500 uppercase text-[10px]">Role</th>
                          <th className="pb-3 font-bold text-slate-500 uppercase text-[10px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map((u) => (
                          <tr key={u.id} className="group">
                            <td className="py-4 font-medium text-slate-900">{u.username}</td>
                            <td className="py-4 text-slate-500">{u.email}</td>
                            <td className="py-4">
                              <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => setEditingUser(u)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {u.id !== currentUser?.id && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && !isFetchingUsers && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              No other users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Edit User Account</h3>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                    <Input 
                      value={editingUser.username} 
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                    <Input 
                      type="email"
                      value={editingUser.email} 
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">New Password (leave blank to keep current)</label>
                    <Input 
                      type="password"
                      value={editPassword} 
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                    <Select 
                      value={editingUser.role} 
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button type="submit" disabled={isUpdatingUser}>
                      {isUpdatingUser ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Update User
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500 mt-1">Choose how you want to be notified about agency activity.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Email Alerts', desc: 'Receive daily summaries and critical alerts via email.', icon: Mail },
                  { title: 'Task Reminders', desc: 'Get notified when tasks are due or assigned to you.', icon: CheckCircle2 },
                  { title: 'Payment Alerts', desc: 'Alerts for received, pending, or overdue payments.', icon: CreditCard },
                  { title: 'Deadline Warnings', desc: 'Get notified when project deadlines are approaching.', icon: Clock },
                  { title: 'Comment Mentions', desc: 'Notify when someone mentions you in a comment.', icon: MessageSquare },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-50 text-slate-500">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === 'display' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">Display & UI</h3>
                <p className="text-xs text-slate-500 mt-1">Customize the look and feel of your dashboard.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Interface Theme</label>
                    <Select>
                      <option>Light Mode</option>
                      <option>Dark Mode (Beta)</option>
                      <option>System Default</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date Format</label>
                    <Select>
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Currency Symbol</label>
                    <Select>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>SGD (S$)</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Default Landing Page</label>
                    <Select>
                      <option>Dashboard Overview</option>
                      <option>Projects List</option>
                      <option>Task Board</option>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button><Save className="w-4 h-4 mr-2" /> Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">Email Settings (Gmail)</h3>
                <p className="text-xs text-slate-500 mt-1">Configure your Gmail account to send invoices and receipts.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-1 uppercase">Important Security Note:</p>
                    <p>For Gmail, you <strong>must</strong> use an "App Password", not your regular Gmail password. 
                    Go to your Google Account {'>'} Security {'>'} 2-Step Verification {'>'} App Passwords to generate one.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Gmail Address</label>
                    <Input 
                      placeholder="yourname@gmail.com" 
                      value={emailSettings.EMAIL_USER}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, EMAIL_USER: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">App Password (16 characters)</label>
                    <Input 
                      type="password" 
                      placeholder="xxxx xxxx xxxx xxxx" 
                      value={emailSettings.EMAIL_PASS}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, EMAIL_PASS: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleTestEmail}
                    disabled={isTestingEmail || !emailSettings.EMAIL_USER || !emailSettings.EMAIL_PASS}
                  >
                    {isTestingEmail ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleSaveEmailSettings} 
                    disabled={isSavingEmail}
                  >
                    {isSavingEmail ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Email Settings
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-6 border-t border-slate-50">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Quick Setup Guide</h4>
                  <ol className="text-xs text-slate-500 space-y-3 list-decimal pl-4">
                    <li>Enable <strong>2-Step Verification</strong> in your Google Account.</li>
                    <li>Search for <strong>"App Passwords"</strong> in your Google Account settings.</li>
                    <li>Select "Other" as the app and name it "Agency Vault".</li>
                    <li>Copy the 16-character code and paste it into the "App Password" field above.</li>
                  </ol>
                  <a 
                    href="https://myaccount.google.com/security" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-bold text-indigo-600 mt-4 hover:underline"
                  >
                    Open Google Security Settings <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'whatsapp' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">WhatsApp Integration</h3>
                    <p className="text-xs text-slate-500 mt-1">Connect your WhatsApp account to send automated receipts and messages.</p>
                  </div>
                  <Badge variant={
                    whatsappStatus.status === 'connected' ? 'success' : 
                    whatsappStatus.status === 'qr_ready' ? 'warning' : 'secondary'
                  }>
                    {whatsappStatus.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {whatsappStatus.status === 'disconnected' && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Not Connected</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                        Connect your WhatsApp account to start sending automated messages to your clients.
                      </p>
                    </div>
                    <Button onClick={handleConnectWhatsApp} disabled={isConnectingWhatsApp}>
                      {isConnectingWhatsApp ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4 mr-2" />
                      )}
                      Connect WhatsApp
                    </Button>
                  </div>
                )}

                {whatsappStatus.status === 'connecting' && (
                  <div className="text-center py-12 space-y-4">
                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-900">Initializing...</h4>
                      <p className="text-xs text-slate-500">Please wait while we prepare the connection.</p>
                    </div>
                  </div>
                )}

                {whatsappStatus.status === 'qr_ready' && whatsappStatus.qr && (
                  <div className="text-center py-8 space-y-6">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm inline-block mx-auto">
                      <img src={whatsappStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900">Scan QR Code</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Open WhatsApp on your phone, go to Linked Devices, and scan this code to connect.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" size="sm" onClick={fetchWhatsAppStatus}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-500" onClick={handleLogoutWhatsApp}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {whatsappStatus.status === 'connected' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-900">Connected as {whatsappStatus.user?.name || 'WhatsApp User'}</p>
                        <p className="text-xs text-emerald-700 opacity-80">{whatsappStatus.user?.id.split(':')[0]}</p>
                      </div>
                      <Button variant="outline" size="sm" className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleLogoutWhatsApp}>
                        Disconnect
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Type</p>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-500" />
                          <p className="text-sm font-bold text-slate-900">In-Memory (Volatile)</p>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Your session is stored in RAM. It will be cleared if the server restarts for security.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Responder</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Active</Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Automated receipts and invoices will be sent via this connection.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-50">
                  <h4 className="text-sm font-bold text-slate-900 mb-3">WhatsApp Connection Tips</h4>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                    <li>Keep your phone connected to the internet for the best experience.</li>
                    <li>If messages are not sending, try disconnecting and reconnecting.</li>
                    <li>This connection uses the official WhatsApp Multi-Device API.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'data' && (
            <Card>
              <CardHeader>
                <h3 className="font-bold text-slate-900">Data Management</h3>
                <p className="text-xs text-slate-500 mt-1">Export your data or manage storage settings.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        dbStatus === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Cloud Database (Supabase)</p>
                        <p className="text-xs text-slate-500">
                          {dbStatus === 'connected' 
                            ? 'Your data is securely stored in a cloud-hosted PostgreSQL database.' 
                            : 'Database connection error. Please check your configuration.'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={dbStatus === 'connected' ? 'success' : 'error'}>
                      {dbStatus === 'connected' ? 'Connected' : 'Error'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clients</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Status</p>
                      <p className={cn(
                        "text-sm font-bold mt-2 flex items-center gap-1",
                        dbStatus === 'connected' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {dbStatus === 'connected' ? (
                          <><Shield className="w-3 h-3" /> Healthy</>
                        ) : (
                          <><AlertCircle className="w-3 h-3" /> Issue Detected</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Export All Data</p>
                        <p className="text-xs text-slate-500">Download all agency data in CSV format</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Export CSV</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Trash2 className="w-5 h-5 text-rose-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Clear Cache</p>
                        <p className="text-xs text-slate-500">Reset local filters and view preferences</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-rose-600">Clear All</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
