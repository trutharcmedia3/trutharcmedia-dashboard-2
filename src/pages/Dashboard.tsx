/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Users, Briefcase, CheckCircle, Clock, 
  TrendingUp, TrendingDown, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight,
  CheckSquare, Plus, Search, MoreVertical,
  Filter, Download, ChevronRight, User,
  LayoutGrid, List, BarChart3, PieChart as PieChartIcon,
  Activity, Zap, Target, AlertCircle, Star,
  MessageSquare, Bell, ArrowRight, Sparkles,
  ShieldCheck, Rocket, Globe, CreditCard, RefreshCw,
  Cpu, Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { Card, CardHeader, CardContent, Badge, cn, Modal, Button } from '../components/UI';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { getAIInsights, getFullAnalysis, AIInsight } from '../services/aiService';
import Markdown from 'react-markdown';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#06B6D4'];

const ICON_MAP: Record<string, any> = {
  Sparkles,
  AlertCircle,
  Zap,
  ShieldCheck,
  TrendingUp,
  Target,
  CreditCard,
  TrendingDown,
  Cpu,
  Globe,
  Layers,
  Activity
};

const STRATEGIC_ICONS: Record<string, any> = {
  "Profitability": DollarSign,
  "Efficiency": Zap,
  "Client Retention": Users,
  "Team Load": Activity,
  "Growth": TrendingUp,
  "Risk Level": AlertCircle,
  "Innovation": Sparkles,
  "Market Reach": Globe
};

const PRIORITY_COLORS: Record<string, string> = {
  "High": "#f43f5e",
  "Medium": "#f59e0b",
  "Low": "#10b981",
  "Urgent": "#8b5cf6"
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        x={-15} 
        y={4} 
        textAnchor="end" 
        fill="#94a3b8" 
        fontSize={10} 
        fontWeight={700}
        className="uppercase tracking-tighter font-mono"
      >
        {payload.value}
      </text>
      <circle cx={-6} cy={0} r={3} fill="#334155" />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 py-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-bold text-white">{entry.name}:</span>
            <span className="text-xs font-mono text-indigo-400">Rs. {entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC = () => {
  const { projects, tasks, clients, payments, teamMembers, expenditures, refreshData, syncing } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [aiInsights, setAiInsights] = React.useState<AIInsight[]>([]);
  const [isLoadingAI, setIsLoadingAI] = React.useState(false);
  const [isFullAnalysisOpen, setIsFullAnalysisOpen] = React.useState(false);
  const [fullAnalysisText, setFullAnalysisText] = React.useState('');
  const [fullAnalysisChartData, setFullAnalysisChartData] = React.useState<{ name: string; value: number }[]>([]);
  const [fullAnalysisRoadmap, setFullAnalysisRoadmap] = React.useState<{ phase: string; duration: string; tasks: string[] }[]>([]);
  const [isLoadingFullAnalysis, setIsLoadingFullAnalysis] = React.useState(false);

  // --- Data Calculations ---
  
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'In Progress').length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Done').length;
    
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalExpenses = expenditures.reduce((sum, ex) => sum + (ex.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      activeProjects,
      completedProjects,
      pendingTasks,
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin
    };
  }, [projects, tasks, payments, expenditures]);

  const kpis = useMemo(() => {
    const baseKpis = [
      { 
        label: 'Active Projects', 
        value: stats.activeProjects, 
        change: '+12%', 
        isUp: true, 
        icon: Briefcase, 
        color: 'indigo',
        description: 'Currently in development'
      },
      { 
        label: 'Pending Tasks', 
        value: stats.pendingTasks, 
        change: '-5%', 
        isUp: false, 
        icon: CheckSquare, 
        color: 'amber',
        description: 'Tasks needing attention'
      },
    ];

    const adminKpis = [
      { 
        label: 'Total Revenue', 
        value: `Rs. ${stats.totalRevenue.toLocaleString()}`, 
        change: '+8.4%', 
        isUp: true, 
        icon: DollarSign, 
        color: 'emerald',
        description: 'Lifetime earnings'
      },
      { 
        label: 'Net Profit', 
        value: `Rs. ${stats.netProfit.toLocaleString()}`, 
        change: '+15.2%', 
        isUp: true, 
        icon: TrendingUp, 
        color: 'violet',
        description: 'After all expenses'
      },
    ];

    const teamKpi = { 
      label: 'Team Members', 
      value: teamMembers.length, 
      change: 'Stable', 
      isUp: true, 
      icon: Users, 
      color: 'amber',
      description: 'Active contributors'
    };

    if (isAdmin) {
      return [baseKpis[0], adminKpis[0], adminKpis[1], teamKpi];
    }
    return [...baseKpis, teamKpi];
  }, [stats, teamMembers, isAdmin]);

  const revenueData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthlyRevenue = payments
        .filter(p => p.invoiceDate && isWithinInterval(parseISO(p.invoiceDate), { start: monthStart, end: monthEnd }))
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

      const monthlyExpenses = expenditures
        .filter(ex => ex.date && isWithinInterval(parseISO(ex.date), { start: monthStart, end: monthEnd }))
        .reduce((sum, ex) => sum + (ex.amount || 0), 0);

      return {
        name: format(date, 'MMM'),
        revenue: monthlyRevenue,
        expenses: monthlyExpenses,
        profit: monthlyRevenue - monthlyExpenses
      };
    });
    return months;
  }, [payments, expenditures]);

  const projectStatusData = useMemo(() => [
    { name: 'In Progress', value: projects.filter(p => p.status === 'In Progress').length, color: '#6366F1' },
    { name: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#10B981' },
    { name: 'Pending', value: projects.filter(p => p.status === 'Pending').length, color: '#F59E0B' },
    { name: 'Review', value: projects.filter(p => p.status === 'Under Review').length, color: '#8B5CF6' },
  ], [projects]);

  const expenditureByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    expenditures.forEach(ex => {
      categories[ex.category] = (categories[ex.category] || 0) + (ex.amount || 0);
    });
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [expenditures]);

  const recentTransactions = useMemo(() => {
    const p = payments.map(pay => ({
      id: pay.id,
      title: `Revenue: ${projects.find(proj => proj.id === pay.projectId)?.title || 'Project Payment'}`,
      amount: pay.paidAmount,
      date: pay.invoiceDate,
      type: 'revenue' as const,
      category: 'Income'
    }));

    const e = expenditures.map(ex => ({
      id: ex.id,
      title: ex.title,
      amount: ex.amount,
      date: ex.date,
      type: 'expense' as const,
      category: ex.category
    }));

    return [...p, ...e]
      .filter(t => t.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [payments, expenditures, projects]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    return projects
      .filter(p => p.status !== 'Completed' && p.deadline && isAfter(parseISO(p.deadline), today) && isBefore(parseISO(p.deadline), nextWeek))
      .sort((a, b) => parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime())
      .slice(0, 3);
  }, [projects]);

  const highPriorityTasks = useMemo(() => 
    tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length
  , [tasks]);

  const revenueByClient = useMemo(() => {
    const clientRevenue: Record<string, number> = {};
    payments.forEach(p => {
      const client = clients.find(c => c.id === p.clientId);
      const name = client ? (client.company || client.name) : 'Unknown';
      clientRevenue[name] = (clientRevenue[name] || 0) + (p.paidAmount || 0);
    });
    return Object.entries(clientRevenue).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [payments, clients]);

  const taskPriorityData = useMemo(() => [
    { name: 'Critical', value: tasks.filter(t => t.priority === 'Critical' && t.status !== 'Done').length, color: '#F43F5E' },
    { name: 'High', value: tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length, color: '#F59E0B' },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'Medium' && t.status !== 'Done').length, color: '#6366F1' },
    { name: 'Low', value: tasks.filter(t => t.priority === 'Low' && t.status !== 'Done').length, color: '#10B981' },
  ], [tasks]);

  const teamWorkloadData = useMemo(() => {
    return teamMembers.map(tm => {
      const activeTasks = tasks.filter(t => t.assignedToId === tm.id && t.status !== 'Done').length;
      return {
        name: tm.name.split(' ')[0],
        tasks: activeTasks,
        utilization: tm.utilization
      };
    }).sort((a, b) => b.tasks - a.tasks).slice(0, 6);
  }, [teamMembers, tasks]);

  const businessHealthScore = useMemo(() => {
    const marginScore = Math.min(stats.profitMargin * 2, 30); // Max 30 points
    const projectScore = Math.min((projects.filter(p => p.status === 'Completed').length / Math.max(projects.length, 1)) * 30, 30); // Max 30 points
    const taskScore = Math.min((tasks.filter(t => t.status === 'Done').length / Math.max(tasks.length, 1)) * 40, 40); // Max 40 points
    return Math.round(marginScore + projectScore + taskScore);
  }, [stats.profitMargin, projects, tasks]);

  const fetchInsights = React.useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingAI(true);
    try {
      const insights = await getAIInsights({
        stats,
        upcomingDeadlines,
        highPriorityTasks,
        teamSize: teamMembers.length
      });
      if (insights.length > 0) {
        setAiInsights(insights);
      }
    } catch (error) {
      console.error("Failed to fetch AI insights:", error);
    } finally {
      setIsLoadingAI(false);
    }
  }, [isAdmin, stats, upcomingDeadlines, highPriorityTasks, teamMembers.length]);

  React.useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleFullAnalysis = async () => {
    setIsFullAnalysisOpen(true);
    setIsLoadingFullAnalysis(true);
    try {
      const response = await getFullAnalysis({
        projects,
        tasks,
        stats,
        teamSize: teamMembers.length
      });
      setFullAnalysisText(response.text);
      setFullAnalysisChartData(response.chartData);
      setFullAnalysisRoadmap(response.roadmap);
    } catch (error) {
      setFullAnalysisText("Failed to generate analysis. Please try again.");
      setFullAnalysisChartData([]);
      setFullAnalysisRoadmap([]);
    } finally {
      setIsLoadingFullAnalysis(false);
    }
  };

  // --- Render Helpers ---

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100 }
    }
  };

  return (
    <motion.div 
      className="space-y-6 pb-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Command Center</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Live</span>
            </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-1 opacity-60">
            Operational Intelligence • <span className="text-indigo-600">{user?.username}</span>
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-200/50">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Session</span>
              <span className="text-xs font-bold text-slate-700">{format(new Date(), 'HH:mm:ss')}</span>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">{format(new Date(), 'MMM dd, yyyy')}</span>
          </div>
          
          <button 
            onClick={() => refreshData()}
            disabled={syncing}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
          </button>
          
          <button className="px-5 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>Initialize Project</span>
          </button>
        </motion.div>
      </div>

      {/* --- Business Health Score --- */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 skew-x-12 translate-x-1/4" />
          
          <CardContent className="p-10 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            <div className="flex items-center gap-10">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * businessHealthScore) / 100}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-1000",
                      businessHealthScore > 80 ? "text-emerald-500" :
                      businessHealthScore > 60 ? "text-indigo-500" : "text-amber-500"
                    )}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{businessHealthScore}%</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Health</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Agency Vitality</h2>
                </div>
                <p className="text-slate-500 text-sm font-medium max-w-xs leading-relaxed">
                  Real-time performance index calculated from project velocity, profit margins, and team utilization.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-12 w-full lg:w-auto">
              {[
                { label: 'Efficiency', value: '94%', color: 'text-emerald-500', icon: Zap },
                { label: 'Risk Level', value: 'Low', color: 'text-indigo-500', icon: ShieldCheck },
                { label: 'Growth', value: '+12.4%', color: 'text-violet-500', icon: TrendingUp },
                { label: 'Stability', value: 'Strong', color: 'text-amber-500', icon: Target }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center lg:items-start gap-2">
                  <div className="flex items-center gap-2">
                    <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className={cn("text-2xl font-black tracking-tight", stat.color)}>{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- KPI Bento Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="hover:shadow-2xl transition-all duration-500 border border-slate-100 shadow-sm bg-white overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "p-3 rounded-2xl transition-transform group-hover:scale-110 duration-500",
                    kpi.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : 
                    kpi.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : 
                    kpi.color === 'violet' ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"
                  )}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
                    kpi.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {kpi.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.change}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{kpi.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full",
                        kpi.color === 'indigo' ? "bg-indigo-500" : 
                        kpi.color === 'emerald' ? "bg-emerald-500" : 
                        kpi.color === 'violet' ? "bg-violet-500" : "bg-amber-500"
                      )} style={{ width: '70%' }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">70%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* --- Main Dashboard Content --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Financial Performance Chart */}
        <motion.div variants={itemVariants} className={cn("lg:col-span-8", !isAdmin && "lg:col-span-12")}>
          {isAdmin ? (
            <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden h-full">
              <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    <h3 className="text-lg font-black tracking-tight uppercase">Financial Trajectory</h3>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Revenue vs Expenses • Last 6 Months</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Expenses</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-10">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                        className="uppercase tracking-tighter font-mono"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        tickFormatter={(value) => `Rs.${value/1000}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        name="Revenue"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#f43f5e" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorExp)" 
                        name="Expenses"
                      />
                      <Bar 
                        dataKey="profit" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        barSize={20} 
                        name="Profit"
                        opacity={0.3}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden h-full">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <h3 className="text-lg font-black tracking-tight uppercase">Project Pipeline</h3>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Status Distribution</p>
              </CardHeader>
              <CardContent className="p-8 h-[400px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-900">{projects.length}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Projects</span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* AI Advisor & Insights */}
        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_50%)]" />
            
            <CardHeader className="p-8 pb-4 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase">Strategic Advisor</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Neural Engine Active</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={fetchInsights}
                  disabled={isLoadingAI}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4 text-slate-400", isLoadingAI && "animate-spin")} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4 relative">
              {isLoadingAI && aiInsights.length === 0 ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-white/5 rounded-2xl p-5 border border-white/5 h-28" />
                  ))}
                </div>
              ) : (
                <>
                  {aiInsights.map((insight, i) => {
                    const Icon = ICON_MAP[insight.icon] || Sparkles;
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="group bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md rounded-2xl p-5 border border-white/5 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            "p-2 rounded-xl transition-transform group-hover:scale-110",
                            insight.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                            insight.color === 'rose' ? "bg-rose-500/20 text-rose-400" :
                            insight.color === 'amber' ? "bg-amber-500/20 text-amber-400" : 
                            insight.color === 'violet' ? "bg-violet-500/20 text-violet-400" : "bg-indigo-500/20 text-indigo-400"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{insight.title}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium group-hover:text-white transition-colors">{insight.text}</p>
                      </motion.div>
                    );
                  })}
                </>
              )}
              <button 
                onClick={handleFullAnalysis}
                className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3 mt-4"
              >
                <span>Generate Deep Intelligence</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 space-y-6">
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profit Margin</p>
                      <p className="text-lg font-black text-slate-900">{stats.profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-16 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ value: stats.profitMargin }, { value: 100 - stats.profitMargin }]}
                          innerRadius={20}
                          outerRadius={28}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell fill="#F59E0B" />
                          <Cell fill="#F1F5F9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasks Done</p>
                    <p className="text-lg font-black text-slate-900">{tasks.filter(t => t.status === 'Done').length}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Excellent</p>
                  <p className="text-[10px] text-slate-400 font-bold">Progress Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* --- Bottom Grid: Projects, Deadlines & Team --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Expenditure Breakdown & Recent Transactions */}
        {isAdmin && (
          <>
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden h-full">
                <CardHeader className="p-8 pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    <h3 className="text-lg font-black tracking-tight uppercase">Resource Allocation</h3>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expenditure by Category</p>
                </CardHeader>
                <CardContent className="p-8 h-[350px] flex flex-col items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenditureByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenditureByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-900 leading-none">
                      {expenditureByCategory.length}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sectors</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-8">
              <Card className="border-none shadow-sm h-full overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Transactions</h3>
                    <p className="text-slate-500 text-sm font-medium">Latest financial movements</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <ArrowUpRight className="w-3 h-3" />
                      Revenue
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <ArrowDownRight className="w-3 h-3" />
                      Expense
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            tx.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            {tx.type === 'revenue' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{tx.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tx.category} • {format(parseISO(tx.date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-black",
                            tx.type === 'revenue' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {tx.type === 'revenue' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Successful</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {/* --- New Dashboard Sections --- */}
        {isAdmin && (
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <Card className="border-none shadow-sm h-full overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Revenue by Client</h3>
                <p className="text-slate-500 text-sm font-medium">Top 5 clients contribution</p>
              </CardHeader>
              <CardContent className="p-8 h-[350px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByClient}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {revenueByClient.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 gap-y-2 mt-4 w-full">
                  {revenueByClient.map((client, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: client.color }} />
                        <span className="text-[10px] font-bold text-slate-600 truncate">{client.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900">Rs. {client.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className={cn(isAdmin ? "lg:col-span-4" : "lg:col-span-6")}>
          <Card className="border-none shadow-sm h-full overflow-hidden">
            <CardHeader className="p-8 pb-0">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Team Workload</h3>
              <p className="text-slate-500 text-sm font-medium">Active tasks per member</p>
            </CardHeader>
            <CardContent className="p-8 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkloadData} layout="vertical" margin={{ left: -20, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="tasks" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className={cn(isAdmin ? "lg:col-span-4" : "lg:col-span-6")}>
          <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden h-full">
            <CardHeader className="p-8 pb-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                <h3 className="text-lg font-black tracking-tight uppercase">Strategic Focus</h3>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Distribution by Priority</p>
            </CardHeader>
            <CardContent className="p-8 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskPriorityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                    className="uppercase tracking-tighter font-mono"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                    {taskPriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Projects Table-like List */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  <h3 className="text-lg font-black tracking-tight uppercase">Active Operations</h3>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monitoring ongoing development</p>
              </div>
              <button className="px-4 py-2 bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all border border-slate-200">View Registry</button>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-3">
                {projects.filter(p => p.status === 'In Progress').slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-5 bg-white hover:bg-slate-50/80 rounded-2xl transition-all group border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-slate-200">
                        {project.title.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 mb-1">{project.title}</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                            <span className="text-[8px] font-black uppercase tracking-widest">{project.serviceType}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{format(parseISO(project.deadline), 'MMM dd')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="hidden md:block w-40">
                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          <span>Velocity</span>
                          <span className="text-indigo-600">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${project.progress}%` }} 
                          />
                        </div>
                      </div>
                      <div className="flex -space-x-3">
                        {project.teamMemberIds.slice(0, 3).map((id, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                        ))}
                        {project.teamMemberIds.length > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                            +{project.teamMemberIds.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-slate-100">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Deadlines & Team Status */}
        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
          
          {/* Upcoming Deadlines */}
          <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                <h3 className="text-lg font-black tracking-tight uppercase">Critical Alerts</h3>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Imminent Project Deadlines</p>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4 bg-rose-50/30 rounded-2xl border border-rose-100/50 group hover:bg-rose-50 transition-all">
                  <div className="w-12 h-12 bg-rose-100 rounded-xl flex flex-col items-center justify-center text-rose-600 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="text-[9px] font-black uppercase tracking-tighter">{format(parseISO(p.deadline), 'MMM')}</span>
                    <span className="text-lg font-black leading-none">{format(parseISO(p.deadline), 'dd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-slate-900 truncate mb-1">{p.title}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                      <p className="text-[9px] text-rose-600 font-black uppercase tracking-widest">Immediate Action Required</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Systems Clear</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Status */}
          <Card className="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <h3 className="text-lg font-black tracking-tight uppercase">Personnel</h3>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Deployment</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              {teamMembers.slice(0, 4).map((member) => (
                <div key={member.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm group-hover:border-indigo-300 transition-all">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Load</span>
                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-indigo-500 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all border border-slate-200">Personnel Directory</button>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* --- Full Analysis Modal --- */}
      <Modal 
        isOpen={isFullAnalysisOpen} 
        onClose={() => setIsFullAnalysisOpen(false)} 
        title="AI Agency Strategy Report"
        size="lg"
      >
        <div className="-m-6">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-indigo-200" />
              <h2 className="text-2xl font-black tracking-tight">Strategic Intelligence Report</h2>
            </div>
            <p className="text-indigo-100 text-sm font-medium">Generated by Gemini AI • {format(new Date(), 'MMMM do, yyyy')}</p>
          </div>
          
          <div className="p-8 space-y-8">
            {isLoadingFullAnalysis ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Gemini is synthesizing your agency data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-8">
                  <div className="prose prose-slate max-w-none">
                    <div className="markdown-body">
                      <Markdown>{fullAnalysisText}</Markdown>
                    </div>
                  </div>

                  {fullAnalysisRoadmap.length > 0 && (
                    <div className="space-y-6 pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-3 mb-6">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">30-Day Actionable Roadmap</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {fullAnalysisRoadmap.map((step, i) => (
                          <motion.div 
                            key={i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex gap-5 group"
                          >
                            <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-black text-slate-900">{step.phase}</h4>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">{step.duration}</span>
                              </div>
                              <ul className="space-y-1.5">
                                {step.tasks.map((task, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm text-slate-500 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 flex-shrink-0" />
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="lg:col-span-5 space-y-6">
                  <Card className="border-none bg-white p-6 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Strategic Priority Scores</h3>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Current</span>
                      </div>
                    </div>
                    
                    <div className="h-[420px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={fullAnalysisChartData} 
                          layout="vertical" 
                          margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                          barGap={0}
                        >
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#6366F1" />
                              <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                          </defs>
                          <XAxis type="number" hide domain={[0, 100]} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={<CustomYAxisTick />}
                            width={110}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc', radius: 8 }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                              padding: '12px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(value: number, name: string) => [
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span>{value}% Score</span>
                              </div>,
                              null
                            ]}
                          />
                          <Bar 
                            dataKey="value" 
                            fill="url(#barGradient)" 
                            radius={20} 
                            barSize={16}
                            background={{ fill: '#f1f5f9', radius: 20 }}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                            <ShieldCheck className="w-3 h-3 text-slate-400" />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-tight">
                        Metrics verified by Agency Pulse AI based on real-time project velocity and financial data.
                      </p>
                    </div>
                  </Card>

                  <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700" />
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <Target className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Strategic Milestone</h4>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-2 leading-tight">Optimize Operational Margin</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                      Targeting a <span className="text-white font-bold">25% net profit margin</span> by reducing unbillable hours and consolidating software subscriptions.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Progress</span>
                        <span className="text-2xl font-black text-white">65<span className="text-sm text-slate-500 ml-0.5">%</span></span>
                      </div>
                      <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-12 mt-4 pt-8 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidential Agency Report</p>
                    <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">
                      <Download className="w-3 h-3" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                  <Button onClick={() => setIsFullAnalysisOpen(false)} className="px-8 py-3 rounded-2xl shadow-lg shadow-indigo-100">
                    Close Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
