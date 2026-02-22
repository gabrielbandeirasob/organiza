
import React, { useMemo } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calendar, Search } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories }) => {
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = React.useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [categoryFilter, setCategoryFilter] = React.useState('all');

  // Helper to deal with local date strings (YYYY-MM-DD) without timezone shifts
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredTransactions = useMemo(() => {
    // Parse filter dates (YYYY-MM-DD interpreted as local)
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);

    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);
    end.setHours(23, 59, 59, 999);

    return transactions.filter(t => {
      const [year, month, day] = t.date.split('-').map(Number);
      const transactionDate = new Date(year, month - 1, day);

      const matchesDate = transactionDate >= start && transactionDate <= end;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesDate && matchesCategory;
    });
  }, [transactions, startDate, endDate, categoryFilter]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const catStats: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        catStats[t.category] = (catStats[t.category] || 0) + t.amount;
      }
    });

    const topCategory = Object.entries(catStats).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    const dailyAvg = expense / (filteredTransactions.length || 1);

    return { income, expense, topCategory, dailyAvg };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    // Parse filter dates (YYYY-MM-DD interpreted as local)
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay);

    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay);

    const diffTime = end.getTime() - start.getTime();
    const daysToGenerate = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // Limit days to generate to prevent performance issues (e.g., 2 years max)
    const MAX_DAYS = 730;
    const finalDays = Math.min(daysToGenerate, MAX_DAYS);

    // Group expenses by date
    const dailyExpenses: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        const tDate = t.date;
        if (dailyExpenses[tDate] === undefined) dailyExpenses[tDate] = 0;
        dailyExpenses[tDate] += t.amount;
      }
    });

    const dataPoints = [];
    const currentIterDate = new Date(start);

    // If we have too many points, use a step to avoid UI lag
    const MAX_POINTS = 366;
    const step = finalDays > MAX_POINTS ? Math.ceil(finalDays / MAX_POINTS) : 1;

    for (let i = 0; i < finalDays; i += step) {
      const dateStr = getLocalDateString(currentIterDate);

      // Match standard DD/MM format
      const day = String(currentIterDate.getDate()).padStart(2, '0');
      const month = String(currentIterDate.getMonth() + 1).padStart(2, '0');
      const label = `${day}/${month}`;

      dataPoints.push({
        name: label,
        fullDate: dateStr,
        value: dailyExpenses[dateStr] || 0
      });

      currentIterDate.setDate(currentIterDate.getDate() + 1);
    }

    return dataPoints;
  }, [filteredTransactions, startDate, endDate]);

  const categoryData = useMemo(() => {
    // Aggregate expenses by category directly from transactions
    // This ensures even "orphaned" categories (not in the main list) are displayed
    const catTotals: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        // Normalize category name: trim whitespace and ensure consistent casing if needed
        // Assuming categories are stored consistently, but "Moradia " vs "Moradia" happens.
        const normalizedCat = t.category.trim();
        catTotals[normalizedCat] = (catTotals[normalizedCat] || 0) + t.amount;
      }
    });

    return Object.entries(catTotals)
      .map(([catName, value]) => ({
        name: catName.length > 10 ? catName.substring(0, 8) + '..' : catName, // Truncate consistently
        fullName: catName, // Store full name for tooltip if needed
        value
      }))
      .sort((a, b) => b.value - a.value) // Sort by highest expense
      .filter(item => item.value > 0);
  }, [filteredTransactions]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pl-16 md:pl-0">
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">Visão Geral</h2>
          <p className="text-zinc-500 text-xs md:text-sm">Bem-vindo de volta, aqui está o resumo das suas finanças.</p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">

          {/* Custom Date Filters */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 bg-[#0a0b14] border border-zinc-800 rounded-xl px-2.5 py-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-[9px] text-zinc-500 font-bold uppercase">De</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none focus:ring-0 w-[110px]"
              />
              <span className="text-[9px] text-zinc-500 font-bold uppercase ml-1">Até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none focus:ring-0 w-[110px]"
              />
            </div>

            <div className="relative w-full sm:w-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none bg-[#0a0b14] border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer hover:bg-zinc-900 transition-colors"
              >
                <option value="all">Todas categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'TOTAL DE ENTRADAS', value: stats.income, trend: '+0%', trendType: 'up', icon: TrendingUp },
          { label: 'TOTAL DE SAÍDAS', value: stats.expense, trend: '-0%', trendType: 'down', icon: TrendingDown },
          { label: 'GASTO MÉDIO DIÁRIO', value: stats.dailyAvg, trend: '+0%', trendType: 'up', icon: DollarSign },
          { label: 'CATEGORIA MAIOR GASTO', value: stats.topCategory[0], detail: `R$ ${Number(stats.topCategory[1]).toLocaleString('pt-BR')}`, icon: PieChart },
        ].map((stat, i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 md:p-6 rounded-2xl hover:border-zinc-700 transition-all group">
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider md:tracking-widest">{stat.label}</p>
              <div className="p-1.5 md:p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-emerald-500 transition-colors">
                <stat.icon size={14} className="md:w-4 md:h-4" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold text-white mb-1">
                {typeof stat.value === 'number' ? `R$${stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stat.value}
              </span>
              {stat.trend && (
                <span className={`text-[10px] md:text-xs font-semibold flex items-center gap-1 ${stat.trendType === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span className="text-zinc-500 font-normal">Período selecionado</span>
                </span>
              )}
              {stat.detail && <span className="text-[10px] md:text-xs text-zinc-500 truncate">{stat.detail}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Gastos por Dia</h3>
              {/* <p className="text-xs text-zinc-500">Fluxo de caixa ({dateFilter === '7d' ? 'Semanal' : dateFilter === '30d' ? 'Mensal' : dateFilter === '90d' ? 'Trimestral' : 'Período'})</p> */}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  dy={10}
                  minTickGap={30}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(value) => `R$ ${value}`}
                  width={60}
                />
                <Tooltip
                  cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#121420] border border-zinc-800 p-3 rounded-xl shadow-xl">
                          <p className="text-zinc-400 text-xs font-semibold mb-1">{label}</p>
                          <p className="text-emerald-500 text-sm font-bold">
                            R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#121420', strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Despesas por Categoria</h3>
              <p className="text-xs text-zinc-500">Distribuição atual</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#10b991'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Dashboard;
