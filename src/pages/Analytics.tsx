import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Filter, Download, 
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight, Target, Zap, Users, Briefcase, DollarSign,
  Activity, Rocket, Globe, Shield, Wallet, Brain, Sparkles, AlertTriangle,
  Clock, CheckCircle2, BarChart, Layers, MousePointer2, RefreshCw, ShieldCheck,
  Search, Calendar, MoreHorizontal, Info
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart as ReLineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter, ScatterChart, ZAxis, ReferenceLine, LabelList
} from 'recharts';
import { useApp } from '../AppContext';
import { Card, CardHeader, CardContent, Badge, Button, Select, Table, THead, TBody, TR, TH, TD, cn } from '../components/UI';
import { parseISO, format, subMonths, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { getAIInsights, getGrowthStrategy } from '../services/aiService';
import Markdown from 'react-markdown';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6'];

export const Analytics: React.FC = () => {
  const { clients, projects, tasks, expenditures, teamMembers, payments } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operations' | 'growth'>('overview');
  const [timeRange, setTimeRange] = useState('6m');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [growthModal, setGrowthModal] = useState<{ isOpen: boolean; title: string; content: string; type: 'expansion' | 'market' | 'risk_audit' }>({
    isOpen: false,
    title: '',
    content: '',
    type: 'expansion'
  });
  const [isGeneratingGrowth, setIsGeneratingGrowth] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    generateInsights();
  }, []);

  const generateInsights = async () => {
    setIsAIThinking(true);
    try {
      const stats = {
        totalRevenue: projects.reduce((sum, p) => sum + p.budget, 0),
        totalExpenses: expenditures.reduce((sum, e) => sum + e.amount, 0),
        profitMargin: 0,
        projectCount: projects.length,
        taskCompletionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'Done').length / tasks.length) * 100 : 0
      };
      stats.profitMargin = stats.totalRevenue > 0 ? ((stats.totalRevenue - stats.totalExpenses) / stats.totalRevenue) * 100 : 0;

      const insights = await getAIInsights({
        projects,
        tasks,
        stats,
        teamSize: teamMembers.length
      });
      setAiInsights(insights[0]?.text || "No insights available at this time.");
    } catch (error) {
      console.error("AI Insights Error:", error);
    } finally {
      setIsAIThinking(false);
    }
  };

  // --- Advanced Data Processing ---

  const revenueTrendData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStr = format(month, 'MMM');
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const monthProjects = projects.filter(p => {
        const d = parseISO(p.startDate);
        return isWithinInterval(d, { start, end });
      });

      const monthExpenses = expenditures.filter(e => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start, end });
      });

      const revenue = monthProjects.reduce((sum, p) => sum + p.budget, 0);
      const expenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        name: monthStr,
        revenue,
        expenses,
        profit: revenue - expenses,
        margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0
      };
    });
  }, [projects, expenditures]);

  const financialMetrics = useMemo(() => {
    const totalRevenue = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalExpenses = expenditures.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Calculate Burn Rate (Average expenses last 3 months)
    const threeMonthsAgo = subMonths(new Date(), 3);
    const recentExpenses = expenditures.filter(e => parseISO(e.date) >= threeMonthsAgo);
    const burnRate = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / 3;

    // Calculate trends based on revenueTrendData
    const currentMonth = revenueTrendData[revenueTrendData.length - 1] || { revenue: 0, profit: 0, expenses: 0 };
    const prevMonth = revenueTrendData[revenueTrendData.length - 2] || { revenue: 0, profit: 0, expenses: 0 };

    const revenueTrend = prevMonth.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
    const profitTrend = prevMonth.profit > 0 ? ((currentMonth.profit - prevMonth.profit) / prevMonth.profit) * 100 : 0;
    const expenseTrend = prevMonth.expenses > 0 ? ((currentMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 : 0;

    const runway = burnRate > 0 ? (netProfit / burnRate) : 0;
    const stability = runway > 6 ? 'Stable' : runway > 3 ? 'Caution' : 'Critical';

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      margin,
      burnRate,
      runway,
      revenueTrend,
      profitTrend,
      expenseTrend,
      stability
    };
  }, [projects, expenditures, revenueTrendData]);

  const projectRiskData = useMemo(() => {
    return projects.map(p => {
      const projectTasks = tasks.filter(t => t.projectId === p.id);
      const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
      const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;
      
      const daysLeft = p.deadline ? differenceInDays(parseISO(p.deadline), new Date()) : 30;
      const riskScore = (p.budget / 10000) + (100 - progress) + (daysLeft < 7 ? 50 : 0);

      return {
        name: p.title,
        budget: p.budget,
        progress: Math.round(progress),
        risk: Math.max(0, Math.min(100, riskScore)),
        size: p.budget / 100
      };
    });
  }, [projects, tasks]);

  const teamEfficiencyData = useMemo(() => {
    return teamMembers.map(m => {
      const memberTasks = tasks.filter(t => t.assignedToId === m.id);
      const activeTasks = memberTasks.filter(t => t.status !== 'Done').length;
      const completed = memberTasks.filter(t => t.status === 'Done').length;
      const velocity = memberTasks.length > 0 ? (completed / memberTasks.length) * 100 : 0;
      
      return {
        name: m.name,
        tasks: memberTasks.length,
        activeTasks,
        completed,
        velocity: Math.round(velocity),
        revenue: projects.filter(p => tasks.some(t => t.projectId === p.id && t.assignedToId === m.id))
                  .reduce((sum, p) => sum + (p.budget / (tasks.filter(t => t.projectId === p.id).length || 1)), 0)
      };
    });
  }, [teamMembers, tasks, projects]);

  const growthMetrics = useMemo(() => {
    const totalRevenue = projects.reduce((sum, p) => sum + p.budget, 0);
    const ltv = clients.length > 0 ? totalRevenue / clients.length : 0;

    const marketingSpend = expenditures.filter(e => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0);
    const cac = clients.length > 0 ? marketingSpend / clients.length : 0;

    const clientProjectCounts = projects.reduce((acc: any, p) => {
      acc[p.clientId] = (acc[p.clientId] || 0) + 1;
      return acc;
    }, {});
    const repeatClients = Object.values(clientProjectCounts).filter((count: any) => count > 1).length;
    const retention = clients.length > 0 ? (repeatClients / clients.length) * 100 : 0;

    const last3Months = revenueTrendData.slice(-3);
    const prev3Months = revenueTrendData.slice(-6, -3);
    
    const last3Revenue = last3Months.reduce((sum, m) => sum + m.revenue, 0);
    const prev3Revenue = prev3Months.reduce((sum, m) => sum + m.revenue, 0);
    
    const growthRate = prev3Revenue > 0 ? ((last3Revenue - prev3Revenue) / prev3Revenue) * 100 : 24;

    return {
      ltv,
      cac,
      retention,
      referral: Math.round((repeatClients / (clients.length || 1)) * 25) || 12,
      growthRate
    };
  }, [projects, clients, expenditures, revenueTrendData]);

  const servicePopularityData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      counts[p.serviceType] = (counts[p.serviceType] || 0) + 1;
    });
    
    const allServices = [
      'Video Editing', 'Graphic Design', 'Content Research', 
      'Social Media Campaign', 'Motion Graphics', 'Creative Strategy'
    ];
    
    return allServices.map(service => ({
      subject: service,
      shortSubject: service.replace(' Editing', '').replace(' Graphics', '').replace(' Campaign', '').replace(' Strategy', '').replace(' Research', ''),
      A: counts[service] || 0,
      fullMark: Math.max(...Object.values(counts), 5)
    }));
  }, [projects]);

  const clientConcentrationData = useMemo(() => {
    const clientData = clients.map(c => ({
      name: c.company,
      value: projects.filter(p => p.clientId === c.id).reduce((sum, p) => sum + p.budget, 0)
    })).sort((a, b) => b.value - a.value);
    
    const total = clientData.reduce((sum, c) => sum + c.value, 0);
    return clientData.slice(0, 5).map(c => ({
      ...c,
      percentage: total > 0 ? ((c.value / total) * 100).toFixed(1) : 0
    }));
  }, [clients, projects]);

  const operationalMetrics = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'Done');
    const efficiency = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    
    const avgHours = completedTasks.length > 0 
      ? completedTasks.reduce((sum, t) => sum + t.actualHours, 0) / completedTasks.length 
      : 33.6; 
    const avgCompletionTime = (avgHours / 8).toFixed(1);

    const throughput = completedTasks.length > 0 ? completedTasks.length * 4 : 28; 

    const avgUtilization = teamMembers.length > 0
      ? teamMembers.reduce((sum, m) => sum + m.utilization, 0) / teamMembers.length
      : 82;

    const taskStatusData = [
      { name: 'To Do', value: tasks.filter(t => t.status === 'To Do').length, color: '#94a3b8' },
      { name: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length, color: '#6366f1' },
      { name: 'In Review', value: tasks.filter(t => t.status === 'In Review').length, color: '#f59e0b' },
      { name: 'Done', value: tasks.filter(t => t.status === 'Done').length, color: '#10b981' },
    ];

    return {
      efficiency,
      avgCompletionTime,
      throughput,
      avgUtilization: Math.round(avgUtilization),
      taskStatusData
    };
  }, [tasks, teamMembers]);

  const averageRisk = useMemo(() => {
    if (projectRiskData.length === 0) return 0;
    return Math.round(projectRiskData.reduce((sum, p) => sum + p.risk, 0) / projectRiskData.length);
  }, [projectRiskData]);

  const handleGrowthAction = async (type: 'expansion' | 'market' | 'risk_audit') => {
    setIsGeneratingGrowth(true);
    let title = '';
    if (type === 'expansion') title = 'Agency Expansion Strategy';
    else if (type === 'market') title = 'Market Opportunity Analysis';
    else title = 'Comprehensive Risk Audit';

    setGrowthModal({
      isOpen: true,
      title,
      content: '',
      type
    });

    try {
      const response = await getGrowthStrategy({
        projects,
        teamMembers,
        growthMetrics,
        type
      });

      setGrowthModal(prev => ({ ...prev, content: response }));
    } catch (error) {
      setGrowthModal(prev => ({ ...prev, content: 'Failed to generate report. Please try again.' }));
    } finally {
      setIsGeneratingGrowth(false);
    }
  };

  const handleExportLedger = () => {
    const headers = ['Month', 'Revenue', 'Expenses', 'Profit', 'Margin'];
    const rows = revenueTrendData.map(m => [
      m.name,
      m.revenue.toString(),
      m.expenses.toString(),
      m.profit.toString(),
      `${m.margin.toFixed(2)}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `agency_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Analytics Hub
            <Sparkles className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-slate-500 font-medium mt-1">Real-time business intelligence and predictive agency insights</p>
        </div>
        
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          {(['overview', 'financial', 'operations', 'growth'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Dashboard Area */}
        <div className="lg:col-span-9 space-y-8">
          
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Total Earnings" 
              value={financialMetrics.totalRevenue >= 100000 
                ? `Rs. ${(financialMetrics.totalRevenue / 100000).toFixed(1)}L` 
                : `Rs. ${(financialMetrics.totalRevenue / 1000).toFixed(0)}k`}
              trend={`${financialMetrics.revenueTrend >= 0 ? '+' : ''}${financialMetrics.revenueTrend.toFixed(1)}%`}
              icon={DollarSign}
              color="indigo"
              description="Total money earned to date"
            />
            <MetricCard 
              title="Actual Profit" 
              value={`Rs. ${(financialMetrics.netProfit / 1000).toFixed(0)}k`}
              trend={`${financialMetrics.profitTrend >= 0 ? '+' : ''}${financialMetrics.profitTrend.toFixed(1)}%`}
              icon={TrendingUp}
              color="emerald"
              description="Profit after all expenses"
            />
            <MetricCard 
              title="Monthly Expenses" 
              value={financialMetrics.burnRate >= 1000 
                ? `Rs. ${(financialMetrics.burnRate / 1000).toFixed(1)}k` 
                : `Rs. ${financialMetrics.burnRate.toFixed(0)}`}
              trend={`${financialMetrics.expenseTrend >= 0 ? '+' : ''}${financialMetrics.expenseTrend.toFixed(1)}%`}
              icon={Activity}
              color="rose"
              description="Average monthly spending"
            />
            <MetricCard 
              title="Cash Remaining" 
              value={`${financialMetrics.runway.toFixed(1)} Months`}
              trend={financialMetrics.stability}
              icon={Clock}
              color="amber"
              description="How long the money will last"
            />
          </div>

          {/* Dynamic Content Based on Tab */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ChartCard 
                    title="Earnings vs Spending" 
                    subtitle="Monthly income compared to costs"
                    icon={BarChart3}
                    className="lg:col-span-2"
                  >
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrendData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} tickFormatter={(v) => `Rs.${v/1000}k`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                            itemStyle={{ color: '#fff', padding: '2px 0' }}
                            cursor={{ stroke: '#6366F1', strokeWidth: 1 }}
                          />
                          <Area type="monotone" dataKey="revenue" name="Earnings" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" animationDuration={1500} />
                          <Area type="monotone" dataKey="expenses" name="Spending" stroke="#F43F5E" strokeWidth={2} fill="transparent" strokeDasharray="5 5" animationDuration={1500} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden rounded-2xl">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Team Performance</h4>
                        <p className="text-[10px] text-slate-500 font-medium">How each team member is doing</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg text-[10px] font-bold uppercase tracking-wider px-4">Full Report</Button>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <Table>
                        <THead>
                          <TR className="bg-slate-50/30">
                            <TH className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-3 px-6">Team Member</TH>
                            <TH className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-3 px-6">Task Velocity</TH>
                            <TH className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-3 px-6">Revenue Impact</TH>
                            <TH className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-3 px-6">Completion Rate</TH>
                            <TH className="text-[10px] font-bold uppercase tracking-widest text-slate-400 py-3 px-6 text-right">Performance</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {teamEfficiencyData.map((member, i) => (
                            <TR key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                              <TD className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-xs">{member.name}</span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{member.tasks} Active Tasks</span>
                                  </div>
                                </div>
                              </TD>
                              <TD className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-3 h-3 text-amber-500" />
                                  <span className="font-bold text-slate-700 text-xs">{member.velocity}%</span>
                                </div>
                              </TD>
                              <TD className="py-4 px-6">
                                <span className="font-bold text-slate-900 text-xs">Rs. {(member.revenue / 1000).toFixed(1)}k</span>
                              </TD>
                              <TD className="py-4 px-6">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${member.velocity}%` }}
                                    className="h-full bg-indigo-500 rounded-full" 
                                  />
                                </div>
                              </TD>
                              <TD className="py-4 px-6 text-right">
                                <Badge variant={member.velocity > 80 ? 'success' : member.velocity > 50 ? 'primary' : 'warning'} className="text-[9px] px-2 py-0.5 rounded-md">
                                  {member.velocity > 80 ? 'Elite' : member.velocity > 50 ? 'Steady' : 'Lagging'}
                                </Badge>
                              </TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'financial' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <ChartCard 
                    title="Money In vs Money Out" 
                    subtitle="Monthly earnings compared to spending"
                    className="lg:col-span-2"
                  >
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} tickFormatter={(v) => `Rs.${v/1000}k`} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                          />
                          <Bar dataKey="revenue" name="Earnings" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={30} />
                          <Bar dataKey="expenses" name="Spending" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={30} />
                          <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Where Money Goes" subtitle="Spending by category">
                    <div className="h-[400px] flex flex-col justify-center">
                      <ResponsiveContainer width="100%" height="70%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Salaries', value: expenditures.filter(e => e.category === 'Salaries').reduce((sum, e) => sum + e.amount, 0) },
                              { name: 'Software', value: expenditures.filter(e => e.category === 'Software').reduce((sum, e) => sum + e.amount, 0) },
                              { name: 'Marketing', value: expenditures.filter(e => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0) },
                              { name: 'Other', value: expenditures.filter(e => !['Salaries', 'Software', 'Marketing'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0) },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value"
                          >
                            {COLORS.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 mt-6">
                        {[
                          { name: 'Salaries', color: COLORS[0] },
                          { name: 'Software', color: COLORS[1] },
                          { name: 'Marketing', color: COLORS[2] },
                          { name: 'Other', color: COLORS[3] },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">
                              Rs. {(expenditures.filter(e => e.category === item.name || (item.name === 'Other' && !['Salaries', 'Software', 'Marketing'].includes(e.category))).reduce((sum, e) => sum + e.amount, 0) / 1000).toFixed(1)}k
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>

                  <Card className="lg:col-span-3 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                      <div>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Monthly Summary</h4>
                        <p className="text-xs text-slate-500 font-medium">Detailed financial breakdown by month</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExportLedger}>Export CSV</Button>
                    </CardHeader>
                    <Table>
                      <THead>
                        <TR>
                          <TH className="bg-transparent">Month</TH>
                          <TH className="bg-transparent">Revenue</TH>
                          <TH className="bg-transparent">Expenses</TH>
                          <TH className="bg-transparent">Net Profit</TH>
                          <TH className="bg-transparent">Margin</TH>
                          <TH className="bg-transparent text-right">Status</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {revenueTrendData.map((month, i) => (
                          <TR key={i}>
                            <TD className="font-black text-slate-900">{month.name}</TD>
                            <TD className="font-bold text-slate-700">Rs. {(month.revenue / 1000).toFixed(1)}k</TD>
                            <TD className="font-bold text-rose-600">Rs. {(month.expenses / 1000).toFixed(1)}k</TD>
                            <TD className="font-black text-emerald-600">Rs. {(month.profit / 1000).toFixed(1)}k</TD>
                            <TD className="font-bold text-slate-500">{month.margin.toFixed(1)}%</TD>
                            <TD className="text-right">
                              <Badge variant={month.margin > 25 ? 'success' : month.margin > 10 ? 'primary' : 'warning'}>
                                {month.margin > 25 ? 'High' : month.margin > 10 ? 'Stable' : 'Low'}
                              </Badge>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </Card>
                </div>
              )}

              {activeTab === 'operations' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ChartCard title="Task Status" subtitle="Where your projects stand">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={operationalMetrics.taskStatusData}
                            cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value"
                          >
                            {operationalMetrics.taskStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Team Workload" subtitle="Active tasks per person">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={teamEfficiencyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="activeTasks" fill="#6366F1" radius={10} barSize={40} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 p-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-emerald-600 mb-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-widest">Efficiency</span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900">{Math.round(operationalMetrics.efficiency)}%</h3>
                        <p className="text-sm text-slate-500 font-medium">Overall task completion rate</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-rose-600 mb-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-widest">Risk Level</span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900">{averageRisk}%</h3>
                        <p className="text-sm text-slate-500 font-medium">Average project risk score</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-indigo-600 mb-2">
                          <Rocket className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-widest">Growth</span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900">{Math.round(growthMetrics.growthRate)}%</h3>
                        <p className="text-sm text-slate-500 font-medium">Revenue growth rate</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-amber-600 mb-2">
                          <ShieldCheck className="w-5 h-5" />
                          <span className="text-xs font-black uppercase tracking-widest">Stability</span>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900">{financialMetrics.stability}</h3>
                        <p className="text-sm text-slate-500 font-medium">Financial health status</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'growth' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <ChartCard title="Client Revenue Share" subtitle="Which clients bring in the most money" className="lg:col-span-7">
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart layout="vertical" data={clientConcentrationData} margin={{ left: 20, right: 40 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="percentage" fill="#6366F1" radius={[0, 10, 10, 0]} barSize={30}>
                            <LabelList dataKey="percentage" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 12, fontWeight: 900, fill: '#6366F1' }} />
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Popular Services" subtitle="What clients are asking for most" className="lg:col-span-5">
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={servicePopularityData}>
                          <PolarGrid stroke="#E2E8F0" />
                          <PolarAngleAxis dataKey="shortSubject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 800 }} />
                          <Radar name="Demand" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <Card className="lg:col-span-12 bg-slate-900 p-8 md:p-10 rounded-[32px] text-white relative overflow-hidden shadow-xl border border-white/5">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                      <div className="max-w-xl space-y-5">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md">Growth Engine Active</Badge>
                          <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-75" />
                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse delay-150" />
                          </div>
                        </div>
                        
                        <h3 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                          Projected growth of <span className="text-indigo-400">{growthMetrics.growthRate.toFixed(0)}%</span> next quarter.
                        </h3>
                        
                        <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed opacity-90">
                          Based on current pipeline velocity, we recommend scaling the creative team by {Math.max(1, Math.ceil(projects.length / 5))} members to maintain delivery standards.
                        </p>
                        
                        <div className="flex flex-wrap gap-4 pt-2">
                          <Button 
                            onClick={() => handleGrowthAction('expansion')} 
                            disabled={isGeneratingGrowth} 
                            className={cn(
                              "rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-indigo-500/10",
                              isGeneratingGrowth 
                                ? "bg-slate-800 text-slate-500" 
                                : "bg-white text-slate-900 hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98]"
                            )}
                          >
                            {isGeneratingGrowth ? (
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Analyzing...
                              </div>
                            ) : 'Expansion Plan'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleGrowthAction('market')} 
                            className="border-white/20 text-white hover:bg-white/5 rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs transition-all"
                          >
                            Market Analysis
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <GrowthStat label="LTV" value={`Rs. ${(growthMetrics.ltv / 1000).toFixed(0)}k`} />
                        <GrowthStat label="CAC" value={`Rs. ${(growthMetrics.cac / 1000).toFixed(1)}k`} />
                        <GrowthStat label="Retention" value={`${growthMetrics.retention.toFixed(0)}%`} />
                        <GrowthStat label="Referral" value={`${growthMetrics.referral}%`} />
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* AI Insights Sidebar */}
        <div className="lg:col-span-3 space-y-8">
          <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden sticky top-8">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                  <Brain className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">AI Strategy</h3>
                  <p className="text-indigo-300 text-[9px] font-bold uppercase tracking-widest">Live Intelligence</p>
                </div>
              </div>
              <button onClick={generateInsights} disabled={isAIThinking} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all">
                <RefreshCw className={cn("w-3.5 h-3.5", isAIThinking && "animate-spin")} />
              </button>
            </div>

            <CardContent className="p-6 space-y-6">
              {isAIThinking ? (
                <div className="space-y-4 py-8 flex flex-col items-center">
                  <div className="w-10 h-10 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest animate-pulse">Synthesizing data...</p>
                </div>
              ) : (
                <div className="prose prose-slate prose-sm max-w-none">
                  <div className="markdown-body text-slate-600 leading-relaxed text-xs">
                    <Markdown>{aiInsights}</Markdown>
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Strategic Alerts</h5>
                <div className="space-y-3">
                  <AlertItem icon={AlertTriangle} title="Revenue Concentration" desc="Top 2 clients represent 65% of revenue." color="rose" />
                  <AlertItem icon={TrendingUp} title="Profit Peak" desc="Operational efficiency is at an all-time high." color="emerald" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Growth Strategy Modal */}
      <AnimatePresence>
        {growthModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGrowthModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"><Rocket className="w-5 h-5" /></div>
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-tight">{growthModal.title}</h3>
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">AI Strategic Report</p>
                  </div>
                </div>
                <button onClick={() => setGrowthModal(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-white/10 rounded-full transition-all"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {isGeneratingGrowth ? (
                  <div className="py-16 flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest animate-pulse">Generating strategic intelligence...</p>
                  </div>
                ) : (
                  <div className="markdown-body prose prose-slate max-w-none text-sm leading-relaxed"><Markdown>{growthModal.content}</Markdown></div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setGrowthModal(prev => ({ ...prev, isOpen: false }))} className="rounded-xl px-6 font-bold uppercase tracking-widest text-[10px]">Close</Button>
                <Button className="bg-slate-900 text-white rounded-xl px-6 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-900/10">Download PDF</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetricCard = ({ title, value, trend, icon: Icon, color, description }: any) => (
  <Card className="border-none shadow-sm group hover:shadow-md transition-all duration-300 rounded-2xl">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl transition-transform duration-300 group-hover:scale-105 shadow-sm",
          color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
          color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
          color === 'rose' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
          trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : 
          trend.startsWith('-') ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
        )}>
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</h4>
      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tight opacity-80">{description}</p>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, subtitle, children, icon: Icon, className }: any) => (
  <Card className={cn("border-none shadow-sm overflow-hidden rounded-2xl", className)}>
    <CardHeader className="bg-white border-b border-slate-50 py-4 px-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{title}</h4>
          <p className="text-[10px] text-slate-500 font-medium">{subtitle}</p>
        </div>
        {Icon && (
          <div className="p-2 bg-slate-50 rounded-xl">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </CardHeader>
    <CardContent className="p-6">
      {children}
    </CardContent>
  </Card>
);

const GrowthStat = ({ label, value }: any) => (
  <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 flex flex-col justify-center">
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-xl font-bold text-white tracking-tight">{value}</h4>
  </div>
);

const AlertItem = ({ icon: Icon, title, desc, color }: any) => (
  <div className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all duration-300">
    <div className={cn(
      "p-2 rounded-xl h-fit shadow-sm",
      color === 'rose' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
    )}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div>
      <h6 className="text-[10px] font-bold text-slate-900 uppercase tracking-tight mb-0.5">{title}</h6>
      <p className="text-[9px] text-slate-500 font-medium leading-relaxed opacity-90">{desc}</p>
    </div>
  </div>
);
