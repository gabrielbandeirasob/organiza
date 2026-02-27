
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { Search, Filter, Calendar, Eye, FileEdit, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface RecordsProps {
  transactions: Transaction[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const Records: React.FC<RecordsProps> = ({ transactions, categories, onAddTransaction, onEditTransaction, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' means all
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default to last 30 days
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Slightly more items per page

  // Helper to parse "YYYY-MM-DD" as local date
  const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
    return new Date(year, month - 1, day);
  };

  const filteredTransactions = useMemo(() => {
    // Parse filter dates
    const start = parseDateLocal(startDate);
    const end = parseDateLocal(endDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !categoryFilter || t.category === categoryFilter;
      const matchesType = !typeFilter || t.type === typeFilter;

      const transactionDate = parseDateLocal(t.date);
      const matchesDate = transactionDate >= start && transactionDate <= end;

      return matchesSearch && matchesCategory && matchesType && matchesDate;
    });
  }, [transactions, searchTerm, categoryFilter, typeFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1">Meus Registros</h2>
          <p className="text-zinc-500 text-sm">Acompanhe suas transações dinâmicas.</p>
        </div>
        <button
          onClick={onAddTransaction}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
        >
          <Plus size={18} />
          Adicionar Registro
        </button>
      </header>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Pesquisar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-zinc-950/50 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors focus:outline-none focus:border-emerald-500/30"
            >
              <option value="">Todas Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-zinc-950/50 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white transition-colors focus:outline-none focus:border-emerald-500/30"
            >
              <option value="">Todos Tipos</option>
              <option value={TransactionType.INCOME}>Entradas</option>
              <option value={TransactionType.EXPENSE}>Saídas</option>
            </select>
            <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">De</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none focus:ring-0"
              />
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-emerald-500/5 text-zinc-500 text-[11px] font-bold uppercase tracking-widest border-b border-zinc-800">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginatedTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="px-6 py-5 text-sm text-zinc-300">
                    {parseDateLocal(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-sm text-white font-semibold">{t.description}</td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-[10px] font-bold border border-zinc-700">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${t.type === TransactionType.INCOME
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                      }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-5 text-sm font-bold text-right ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-zinc-100'}`}>
                    R${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                        title="Editar"
                      >
                        <FileEdit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <p>Página {currentPage} de {totalPages || 1}</p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border border-zinc-800 rounded-lg disabled:opacity-30">Anterior</button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Records;
