import React, { useState, useMemo } from 'react';
import { 
  DollarSign, TrendingDown, Calendar, Filter, Download, 
  Plus, Search, MoreVertical, Trash2, Edit2, CheckCircle, 
  Clock, AlertCircle, PieChart as PieChartIcon, ArrowDownRight,
  CreditCard, Wallet, Landmark, Receipt, Target, Zap, Users, Rocket, Activity, Briefcase
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useApp } from '../AppContext';
import { Card, CardHeader, CardContent, Badge, Button, Input, Select, Table, THead, TBody, TR, TH, TD, Modal, cn } from '../components/UI';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { Expenditure, ExpenditureCategory } from '../types';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export const ExpenditurePage: React.FC = () => {
  const { expenditures, monthlyBudget, addExpenditure, updateExpenditure, deleteExpenditure, updateMonthlyBudget } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const [newExpenditure, setNewExpenditure] = useState<Omit<Expenditure, 'id'>>({
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'Other',
    description: '',
    paymentMethod: 'Credit Card',
    status: 'Paid'
  });

  const [editingExpenditure, setEditingExpenditure] = useState<Expenditure | null>(null);
  const [tempBudget, setTempBudget] = useState((monthlyBudget || 0).toString());

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');

  const filteredExpenditures = useMemo(() => {
    return expenditures.filter(ex => {
      const matchesSearch = (ex.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (ex.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || ex.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenditures, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const total = expenditures.reduce((sum, ex) => sum + ex.amount, 0);
    const thisMonth = expenditures.filter(ex => {
      if (!ex.date) return false;
      const date = parseISO(ex.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, ex) => sum + ex.amount, 0);
    
    const lastMonth = expenditures.filter(ex => {
      if (!ex.date) return false;
      const date = parseISO(ex.date);
      const now = new Date();
      const lastMonthDate = subMonths(now, 1);
      return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
    }).reduce((sum, ex) => sum + ex.amount, 0);

    const trend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    
    const pending = expenditures.filter(ex => ex.status === 'Pending').reduce((sum, ex) => sum + ex.amount, 0);
    
    // Find highest category
    const catMap: Record<string, number> = {};
    expenditures.forEach(ex => {
      catMap[ex.category] = (catMap[ex.category] || 0) + ex.amount;
    });
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
    
    const monthlyBudgetAmount = monthlyBudget;
    const budgetUsed = (thisMonth / monthlyBudgetAmount) * 100;

    return [
      { label: 'Total Expenses', value: `Rs. ${(total || 0).toLocaleString()}`, icon: Wallet, color: 'indigo', trend: `${trend > 0 ? '+' : ''}${trend.toFixed(1)}% MoM` },
      { label: 'This Month', value: `Rs. ${(thisMonth || 0).toLocaleString()}`, icon: Calendar, color: 'emerald', trend: `${budgetUsed.toFixed(1)}% of budget` },
      { label: 'Pending Clear', value: `Rs. ${(pending || 0).toLocaleString()}`, icon: Clock, color: 'amber', trend: 'Awaiting payment' },
      { label: 'Top Category', value: topCat[0], icon: PieChartIcon, color: 'rose', trend: `Rs. ${Number(topCat[1] || 0).toLocaleString()}` },
    ];
  }, [expenditures, monthlyBudget]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    expenditures.forEach(ex => {
      data[ex.category] = (data[ex.category] || 0) + ex.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenditures]);

  const paymentMethodData = useMemo(() => {
    const data: Record<string, number> = {};
    expenditures.forEach(ex => {
      data[ex.paymentMethod] = (data[ex.paymentMethod] || 0) + ex.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenditures]);

  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIdx = (currentMonth - i + 12) % 12;
      const amount = expenditures.filter(ex => ex.date && parseISO(ex.date).getMonth() === monthIdx)
                                .reduce((sum, ex) => sum + ex.amount, 0);
      data.push({ name: months[monthIdx], amount });
    }
    return data;
  }, [expenditures]);

  const categoryIcons: Record<string, any> = {
    'Salaries': Users,
    'Software': Zap,
    'Marketing': Rocket,
    'Rent': Landmark,
    'Utilities': Activity,
    'Equipment': Briefcase,
    'Other': Receipt
  };

  const [quickAdd, setQuickAdd] = useState({ title: '', amount: '', category: 'Other' as ExpenditureCategory });

  const handleQuickAdd = async () => {
    if (!quickAdd.title || !quickAdd.amount) return;
    await addExpenditure({
      title: quickAdd.title,
      amount: Number(quickAdd.amount),
      category: quickAdd.category,
      date: new Date().toISOString().split('T')[0],
      description: 'Quick added expense',
      paymentMethod: 'Other',
      status: 'Paid'
    });
    setQuickAdd({ title: '', amount: '', category: 'Other' });
  };

  const handleAddExpenditure = async () => {
    await addExpenditure(newExpenditure);
    setIsAddModalOpen(false);
    setNewExpenditure({
      title: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Other',
      description: '',
      paymentMethod: 'Credit Card',
      status: 'Paid'
    });
  };

  const handleUpdateExpenditure = async () => {
    if (!editingExpenditure) return;
    await updateExpenditure(editingExpenditure.id, editingExpenditure);
    setIsEditModalOpen(false);
    setEditingExpenditure(null);
  };

  const handleUpdateBudget = async () => {
    await updateMonthlyBudget(Number(tempBudget));
    setIsBudgetModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Expenditure Management</h2>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 font-medium">
            <Receipt className="w-4 h-4 text-rose-500" />
            Track and optimize agency spending and operational costs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center mr-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                activeTab === 'dashboard' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                activeTab === 'transactions' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Transactions
            </button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="shadow-lg shadow-rose-100 bg-rose-600 hover:bg-rose-700 rounded-xl px-6">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Quick Add Bar & Budget Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-slate-50 border-dashed border-slate-200 rounded-[2rem]">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Add Title</label>
                    <Input 
                      placeholder="e.g. Office Coffee" 
                      value={quickAdd.title}
                      onChange={(e) => setQuickAdd({...quickAdd, title: e.target.value})}
                      className="bg-white rounded-xl border-slate-200 focus:ring-rose-500"
                    />
                  </div>
                  <div className="w-full md:w-32 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={quickAdd.amount}
                      onChange={(e) => setQuickAdd({...quickAdd, amount: e.target.value})}
                      className="bg-white rounded-xl border-slate-200 focus:ring-rose-500"
                    />
                  </div>
                  <div className="w-full md:w-44 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                    <Select 
                      value={quickAdd.category}
                      onChange={(e) => setQuickAdd({...quickAdd, category: e.target.value as ExpenditureCategory})}
                      className="bg-white rounded-xl border-slate-200 focus:ring-rose-500"
                    >
                      <option value="Salaries">Salaries</option>
                      <option value="Software">Software</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Rent">Rent</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>
                  <Button onClick={handleQuickAdd} className="w-full md:w-auto bg-slate-900 hover:bg-black text-white rounded-xl px-8 h-11">
                    <Zap className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400" /> Quick Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-rose-600 text-white overflow-hidden relative rounded-[2rem] shadow-xl shadow-rose-100 border-none">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Target className="w-32 h-32" />
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest">Monthly Budget</p>
                    <div className="flex items-center gap-3 mt-1">
                      <h4 className="text-3xl font-black">Rs. {(monthlyBudget || 0).toLocaleString()}</h4>
                      <button 
                        onClick={() => {
                          setTempBudget((monthlyBudget || 0).toString());
                          setIsBudgetModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-none px-3 py-1 rounded-lg font-bold">Active</Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-rose-100">Budget Utilization</span>
                    <span>{((expenditures.filter(ex => {
                      if (!ex.date) return false;
                      const date = parseISO(ex.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).reduce((sum, ex) => sum + ex.amount, 0) / monthlyBudget) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min(100, (expenditures.filter(ex => {
                        if (!ex.date) return false;
                        const date = parseISO(ex.date);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).reduce((sum, ex) => sum + ex.amount, 0) / monthlyBudget) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-rose-100 font-bold uppercase tracking-wider">Remaining: Rs. {(monthlyBudget - expenditures.filter(ex => {
                      if (!ex.date) return false;
                      const date = parseISO(ex.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).reduce((sum, ex) => sum + ex.amount, 0) || 0).toLocaleString()}</p>
                    {monthlyBudget - expenditures.filter(ex => {
                      if (!ex.date) return false;
                      const date = parseISO(ex.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).reduce((sum, ex) => sum + ex.amount, 0) < 0 && (
                      <Badge className="bg-white text-rose-600 border-none text-[8px] font-black">OVER BUDGET</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <Card key={i} className="hover:shadow-xl transition-all duration-500 border-none rounded-[2rem] group overflow-hidden bg-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className={cn(
                      "p-4 rounded-2xl transition-transform group-hover:scale-110 duration-500",
                      stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : 
                      stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : 
                      stat.color === 'amber' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                    )}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
                      stat.trend.includes('+') ? "bg-rose-50 text-rose-600" : 
                      stat.trend.includes('% of budget') ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {stat.trend}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-8 rounded-[2.5rem] border-none shadow-sm bg-white p-2">
              <CardHeader className="flex flex-row items-center justify-between px-6 pt-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Monthly Expense Trend</h4>
                  <p className="text-slate-500 text-xs font-medium">Tracking operational costs over time</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Expenses</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px] px-6 pb-6">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                    <BarChart data={monthlyTrendData}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} 
                      tickFormatter={(value) => `Rs. ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F8FAFC' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="amount" fill="url(#colorExpense)" radius={[10, 10, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-4 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-2">
                <CardHeader className="px-6 pt-6">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Category Mix</h4>
                  <p className="text-slate-500 text-xs font-medium">Spending distribution</p>
                </CardHeader>
                <CardContent className="h-[300px] px-6 pb-6">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                      <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
                <h4 className="text-sm font-black text-slate-900 tracking-tight mb-4 uppercase tracking-widest">Payment Methods</h4>
                <div className="space-y-4">
                  {paymentMethodData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          {item.name === 'Credit Card' ? <CreditCard className="w-4 h-4 text-blue-500" /> : 
                           item.name === 'Bank Transfer' ? <Landmark className="w-4 h-4 text-emerald-500" /> : <Wallet className="w-4 h-4 text-amber-500" />}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">Rs. {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Table Section */}
          <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 p-8">
              <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Recent Expenditures</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Showing {filteredExpenditures.length} transactions</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search expenses..." 
                    className="pl-9 w-64 h-10 text-sm rounded-xl border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select 
                  className="w-44 h-10 text-sm rounded-xl border-slate-200"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Software">Software</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR className="bg-slate-50/50">
                    <TH className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Expense Details</TH>
                    <TH className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</TH>
                    <TH className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</TH>
                    <TH className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</TH>
                    <TH className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Method</TH>
                    <TH className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TH>
                    <TH className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredExpenditures.map((ex) => {
                    const Icon = categoryIcons[ex.category] || Receipt;
                    return (
                      <TR key={ex.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TD className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all duration-300 group-hover:scale-110">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{ex.title}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px] font-medium">{ex.description}</span>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <Badge variant="primary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold rounded-lg px-2.5 py-0.5">
                            {ex.category}
                          </Badge>
                        </TD>
                        <TD className="text-slate-600 text-xs font-bold">{ex.date ? format(parseISO(ex.date), 'MMM dd, yyyy') : 'No date'}</TD>
                        <TD className="font-black text-slate-900 text-sm">Rs. {(ex.amount || 0).toLocaleString()}</TD>
                        <TD>
                          <div className="flex items-center gap-2 text-slate-600">
                            <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                              {ex.paymentMethod === 'Credit Card' ? <CreditCard className="w-3 h-3 text-blue-500" /> : 
                               ex.paymentMethod === 'Bank Transfer' ? <Landmark className="w-3 h-3 text-emerald-500" /> : <Wallet className="w-3 h-3 text-amber-500" />}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{ex.paymentMethod}</span>
                          </div>
                        </TD>
                        <TD>
                          <Badge variant={ex.status === 'Paid' ? 'success' : 'warning'} className="rounded-full px-3 py-0.5 text-[10px] font-bold">
                            {ex.status}
                          </Badge>
                        </TD>
                        <TD className="px-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 hover:bg-white hover:shadow-sm rounded-xl"
                              onClick={() => {
                                setEditingExpenditure(ex);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl"
                              onClick={() => deleteExpenditure(ex.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          </Card>
        </div>
      )}


      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Expenditure">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Title</label>
              <Input 
                value={newExpenditure.title}
                onChange={(e) => setNewExpenditure({...newExpenditure, title: e.target.value})}
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Amount (Rs.)</label>
              <Input 
                type="number"
                value={newExpenditure.amount}
                onChange={(e) => setNewExpenditure({...newExpenditure, amount: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Category</label>
              <Select 
                value={newExpenditure.category}
                onChange={(e) => setNewExpenditure({...newExpenditure, category: e.target.value as ExpenditureCategory})}
              >
                <option value="Salaries">Salaries</option>
                <option value="Software">Software</option>
                <option value="Marketing">Marketing</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <Input 
                type="date"
                value={newExpenditure.date}
                onChange={(e) => setNewExpenditure({...newExpenditure, date: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Payment Method</label>
              <Select 
                value={newExpenditure.paymentMethod}
                onChange={(e) => setNewExpenditure({...newExpenditure, paymentMethod: e.target.value})}
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <Select 
                value={newExpenditure.status}
                onChange={(e) => setNewExpenditure({...newExpenditure, status: e.target.value as 'Paid' | 'Pending'})}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input 
              value={newExpenditure.description}
              onChange={(e) => setNewExpenditure({...newExpenditure, description: e.target.value})}
              placeholder="Brief description of the expense"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpenditure}>Save Expenditure</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Expenditure Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Expenditure">
        {editingExpenditure && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <Input 
                  value={editingExpenditure.title}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, title: e.target.value})}
                  placeholder="e.g. Office Supplies"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Amount (Rs.)</label>
                <Input 
                  type="number"
                  value={editingExpenditure.amount}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, amount: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <Select 
                  value={editingExpenditure.category}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, category: e.target.value as ExpenditureCategory})}
                >
                  <option value="Salaries">Salaries</option>
                  <option value="Software">Software</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date</label>
                <Input 
                  type="date"
                  value={editingExpenditure.date}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, date: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Payment Method</label>
                <Select 
                  value={editingExpenditure.paymentMethod}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, paymentMethod: e.target.value})}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <Select 
                  value={editingExpenditure.status}
                  onChange={(e) => setEditingExpenditure({...editingExpenditure, status: e.target.value as 'Paid' | 'Pending'})}
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Input 
                value={editingExpenditure.description}
                onChange={(e) => setEditingExpenditure({...editingExpenditure, description: e.target.value})}
                placeholder="Brief description of the expense"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateExpenditure}>Update Expenditure</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Budget Modal */}
      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Update Monthly Budget">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Monthly Budget Amount (Rs.)</label>
            <Input 
              type="number"
              value={tempBudget}
              onChange={(e) => setTempBudget(e.target.value)}
              placeholder="Enter new budget amount"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsBudgetModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateBudget}>Update Budget</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
