/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FolderKanban, CheckSquare, 
  CreditCard, UserCircle, MessageSquare, BarChart3, 
  Settings, Search, Bell, Menu, X, ChevronRight, Wallet, TrendingUp,
  Calendar, RefreshCcw, AlertCircle, LogOut
} from 'lucide-react';
import { cn } from './UI';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Day Planner', path: '/day-planner', icon: Calendar },
  { name: 'Clients', path: '/clients', icon: Users },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Payments', path: '/payments', icon: CreditCard, adminOnly: true },
  { name: 'Expenditure', path: '/expenditure', icon: Wallet, adminOnly: true },
  { name: 'Net Profit', path: '/net-profit', icon: TrendingUp, adminOnly: true },
  { name: 'Team', path: '/team', icon: UserCircle },
  { name: 'Comments', path: '/comments', icon: MessageSquare },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { syncing, lastSyncError } = useApp();
  const { user, logout } = useAuth();
  
  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'admin');
  const currentPage = navItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

  const userInitials = user?.username?.substring(0, 2).toUpperCase() || 'US';

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-[#0F172A] text-white transition-all duration-300 ease-in-out z-30",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-lg">T</span>
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight whitespace-nowrap">Truth Arc Media</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                isActive 
                  ? "bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "group-hover:text-white")} />
                  {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "flex-col")}>
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {userInitials}
            </div>
            {isSidebarOpen ? (
              <>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-semibold truncate capitalize">{user?.username}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-indigo-600 shadow-sm z-40 hidden md:flex"
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", isSidebarOpen && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-[#0F172A] text-white z-50 transition-transform duration-300 md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center">
              <span className="font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Truth Arc Media</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <nav className="px-3 space-y-1 mt-4">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                isActive ? "bg-[#6366F1] text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-slate-900">{currentPage}</h1>
            {syncing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full animate-pulse">
                <RefreshCcw className="w-3 h-3 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Syncing</span>
              </div>
            )}
            {lastSyncError && (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-full group relative cursor-help">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sync Error</span>
                <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-rose-100 rounded-lg shadow-xl text-[10px] hidden group-hover:block z-50 min-w-[250px] normal-case font-medium">
                  <div className="font-bold text-rose-600 mb-1 border-bottom border-rose-100 pb-1 uppercase tracking-wider">Database Errors:</div>
                  {lastSyncError}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Search */}
            <div className="hidden lg:flex items-center relative">
              <Search className="w-4 h-4 absolute left-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            {/* Notifications */}
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>

            {/* User Dropdown */}
            <div className="flex items-center gap-3 pl-2 md:pl-6 border-l border-slate-200">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-slate-900 leading-none capitalize">{user?.username}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{user?.role}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                {userInitials}
              </div>
              <button 
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors md:ml-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-4 lg:p-4">
          {children}
        </main>
      </div>
    </div>
  );
};
