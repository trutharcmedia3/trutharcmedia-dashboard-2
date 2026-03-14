import React, { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Calendar, PieChart as PieChartIcon, Target, Zap, Activity,
  Briefcase, Landmark, Receipt, Wallet, BarChart3, Info
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, ComposedChart, Line, PieChart, Pie
} from 'recharts';
import { useApp } from '../AppContext';
import { Card, CardHeader, CardContent, Badge, cn } from '../components/UI';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#06B6D4'];

export const NetProfit: React.FC = () => {
  const { payments, expenditures, projects } = useApp();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalExpenses = expenditures.reduce((sum, ex) => sum + (ex.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const pendingRevenue = payments.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.paidAmount || 0)), 0);

    // Calculate MoM trends (simplified for demo)
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    
    const currentMonthRevenue = payments
      .filter(p => p.invoiceDate && isSameMonth(parseISO(p.invoiceDate), now))
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
    const lastMonthRevenue = payments
      .filter(p => p.invoiceDate && isSameMonth(parseISO(p.invoiceDate), lastMonth))
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
    const revenueTrend = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : '+0';

    const currentMonthExpenses = expenditures
      .filter(ex => ex.date && isSameMonth(parseISO(ex.date), now))
      .reduce((sum, ex) => sum + (ex.amount || 0), 0);
      
    const lastMonthExpenses = expenditures
      .filter(ex => ex.date && isSameMonth(parseISO(ex.date), lastMonth))
      .reduce((sum, ex) => sum + (ex.amount || 0), 0);
      
    const expenseTrend = lastMonthExpenses > 0 
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)
      : '+0';

    const currentMonthProfit = currentMonthRevenue - currentMonthExpenses;
    const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;
    const profitTrend = lastMonthProfit !== 0
      ? ((currentMonthProfit - lastMonthProfit) / Math.abs(lastMonthProfit) * 100).toFixed(1)
      : '+0';

    return [
      { 
        label: 'Total Revenue', 
        value: `Rs. ${totalRevenue.toLocaleString()}`, 
        subValue: `Rs. ${pendingRevenue.toLocaleString()} pending`,
        icon: DollarSign, 
        color: 'indigo', 
        trend: `${revenueTrend.startsWith('-') ? '' : '+'}${revenueTrend}%` 
      },
      { 
        label: 'Total Expenses', 
        value: `Rs. ${totalExpenses.toLocaleString()}`, 
        subValue: `${expenditures.length} transactions`,
        icon: Wallet, 
        color: 'rose', 
        trend: `${expenseTrend.startsWith('-') ? '' : '+'}${expenseTrend}%` 
      },
      { 
        label: 'Net Profit', 
        value: `Rs. ${netProfit.toLocaleString()}`, 
        subValue: 'Lifetime earnings',
        icon: TrendingUp, 
        color: 'emerald', 
        trend: `${profitTrend.startsWith('-') ? '' : '+'}${profitTrend}%` 
      },
      { 
        label: 'Profit Margin', 
        value: `${profitMargin.toFixed(1)}%`, 
        subValue: 'Efficiency rate',
        icon: Target, 
        color: 'amber', 
        trend: '+2.4%' 
      },
    ];
  }, [payments, expenditures]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = subMonths(now, i);
      const monthIdx = targetDate.getMonth();
      const year = targetDate.getFullYear();
      
      const revenue = payments
        .filter(p => {
          if (!p.invoiceDate) return false;
          const date = parseISO(p.invoiceDate);
          return date.getMonth() === monthIdx && date.getFullYear() === year;
        })
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        
      const expenses = expenditures
        .filter(ex => {
          if (!ex.date) return false;
          const date = parseISO(ex.date);
          return date.getMonth() === monthIdx && date.getFullYear() === year;
        })
        .reduce((sum, ex) => sum + (ex.amount || 0), 0);
        
      const profit = revenue - expenses;
      
      data.push({ 
        name: months[monthIdx], 
        revenue, 
        expenses, 
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0
      });
    }
    return data;
  }, [payments, expenditures]);

  const serviceTypeRevenue = useMemo(() => {
    const data: Record<string, number> = {};
    
    payments.forEach(p => {
      const project = projects.find(proj => proj.id === p.projectId);
      const type = project?.serviceType || 'Other';
      data[type] = (data[type] || 0) + (p.paidAmount || 0);
    });
    
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [payments, projects]);

  const efficiencyMetrics = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalExpenses = expenditures.reduce((sum, ex) => sum + (ex.amount || 0), 0);
    
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    
    // Growth calculation
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    
    const currentMonthRevenue = payments
      .filter(p => p.invoiceDate && isSameMonth(parseISO(p.invoiceDate), now))
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
    const lastMonthRevenue = payments
      .filter(p => p.invoiceDate && isSameMonth(parseISO(p.invoiceDate), lastMonth))
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      
    const growth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
      : 0;

    return {
      expenseRatio,
      profitMargin,
      growth
    };
  }, [payments, expenditures]);

  const insights = useMemo(() => {
    const list = [];
    const { profitMargin, growth, expenseRatio } = efficiencyMetrics;
    
    if (profitMargin > 50) {
      list.push({
        title: 'High Profitability',
        text: `Your net profit margin is excellent at ${profitMargin.toFixed(1)}%. This indicates strong pricing power.`,
        type: 'success'
      });
    } else if (profitMargin < 20) {
      list.push({
        title: 'Margin Squeeze',
        text: `Profit margin is below 20%. Consider reviewing your operational costs or adjusting project rates.`,
        type: 'warning'
      });
    }
    
    if (growth > 10) {
      list.push({
        title: 'Strong Growth',
        text: `Revenue grew by ${growth.toFixed(1)}% this month. Your acquisition strategy is working well.`,
        type: 'info'
      });
    }
    
    if (expenseRatio > 40) {
      const topCategory = expenditures.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
      
      const highest = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];
      if (highest) {
        list.push({
          title: 'Expense Alert',
          text: `${highest[0]} is your highest expense category. Optimizing this could boost margins.`,
          type: 'warning'
        });
      }
    }

    if (list.length === 0) {
      list.push({
        title: 'Stable Performance',
        text: 'Your financial metrics are within normal ranges. Keep monitoring for any significant shifts.',
        type: 'info'
      });
    }
    
    return list;
  }, [efficiencyMetrics, expenditures]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Net Profit Analysis</h2>
          <p className="text-slate-500 text-sm mt-1">Comprehensive overview of agency profitability and financial health</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg">Last 6 Months</button>
          <button className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">Year to Date</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "p-2.5 rounded-xl shadow-sm",
                    stat.color === 'indigo' ? "bg-indigo-500 text-white" : 
                    stat.color === 'emerald' ? "bg-emerald-500 text-white" : 
                    stat.color === 'amber' ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                  )}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={cn(
                    "flex items-center text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider",
                    stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {stat.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {stat.trend}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
                  <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">{stat.subValue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Profit Chart */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100 p-6">
          <div>
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Revenue vs Expenditure
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Monthly comparison of income and operational costs</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Net Profit</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 h-[400px]">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(value) => `Rs.${(value / 1000)}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 700, padding: '2px 0' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em' }}
                />
                <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={32} />
                <Bar dataKey="expenses" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={32} />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10B981" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }} 
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue by Service */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="p-6 pb-0">
            <h4 className="font-bold text-slate-900">Revenue by Service Type</h4>
            <p className="text-xs text-slate-500 mt-0.5">Distribution of income across different offerings</p>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 h-[250px]">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceTypeRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {serviceTypeRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {serviceTypeRevenue.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">Rs. {item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card className="border-none shadow-sm">
          <CardHeader className="p-6">
            <h4 className="font-bold text-slate-900">Financial Efficiency</h4>
            <p className="text-xs text-slate-500 mt-0.5">Key performance indicators for financial health</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] uppercase font-black tracking-wider">
                <span className="text-slate-400">Operating Expense Ratio</span>
                <span className="text-rose-600">{efficiencyMetrics.expenseRatio.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${efficiencyMetrics.expenseRatio}%` }} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] uppercase font-black tracking-wider">
                <span className="text-slate-400">Net Profit Margin</span>
                <span className="text-emerald-600">{efficiencyMetrics.profitMargin.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${efficiencyMetrics.profitMargin}%` }} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] uppercase font-black tracking-wider">
                <span className="text-slate-400">Revenue Growth (MoM)</span>
                <span className={cn(
                  efficiencyMetrics.growth >= 0 ? "text-indigo-600" : "text-rose-600"
                )}>
                  {efficiencyMetrics.growth >= 0 ? '+' : ''}{efficiencyMetrics.growth.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    efficiencyMetrics.growth >= 0 ? "bg-indigo-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min(Math.abs(efficiencyMetrics.growth), 100)}%` }} 
                />
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">AI Business Insights</h5>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02]",
                    insight.type === 'success' ? "bg-emerald-50 border-emerald-100" :
                    insight.type === 'warning' ? "bg-amber-50 border-amber-100" :
                    "bg-indigo-50 border-indigo-100"
                  )}>
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      insight.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                      insight.type === 'warning' ? "bg-amber-100 text-amber-600" :
                      "bg-indigo-100 text-indigo-600"
                    )}>
                      {insight.type === 'warning' ? <Info className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                    </div>
                    <div>
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        insight.type === 'success' ? "text-emerald-900" :
                        insight.type === 'warning' ? "text-amber-900" :
                        "text-indigo-900"
                      )}>{insight.title}</p>
                      <p className={cn(
                        "text-[11px] mt-0.5 leading-relaxed font-medium",
                        insight.type === 'success' ? "text-emerald-700" :
                        insight.type === 'warning' ? "text-amber-700" :
                        "text-indigo-700"
                      )}>{insight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
