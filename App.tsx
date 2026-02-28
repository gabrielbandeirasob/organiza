
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Records from './components/Records';
import Settings from './components/Settings';
import { Auth } from './components/Auth';
import Notes from './components/Notes';
import FixedCosts from './components/FixedCosts';
import { Transaction, TransactionType, Category, View, AIInsight, DEFAULT_CATEGORIES } from './types';
import { transactionService } from './services/transactionService';
import { categoryService } from './services/categoryService';
import { generateFinancialInsights } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { X, Sliders, Plus, Trash2, Loader2, Menu, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Category management state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [tempCatName, setTempCatName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal form state
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newCategory, setNewCategory] = useState<Category>(categories[0]);
  // Default to Local Today instead of UTC to avoid timezone shifts
  const [newDate, setNewDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Safety timeout: If auth doesn't resolve in 5 seconds, stop loading
    const timeoutId = setTimeout(() => {
      if (isAuthLoading) {
        console.warn('Auth loading timeout: Proceeding as unauthenticated');
        setIsAuthLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      clearTimeout(timeoutId);
    }).catch(err => {
      console.error('Auth error:', err);
      setIsAuthLoading(false);
      clearTimeout(timeoutId);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadTransactions(),
        loadCategories()
      ]);
    } catch (error) {
      console.error('Error in loadData:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await transactionService.fetchAll();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.fetchAll();
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        // If user has no categories, seed them for a better first experience
        console.log('No categories found, seeding defaults...');
        await Promise.all(DEFAULT_CATEGORIES.map(cat => categoryService.create(cat).catch(() => { })));
        const refreshed = await categoryService.fetchAll();
        if (refreshed.length > 0) setCategories(refreshed);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // AI Insights temporarily disabled
  // useEffect(() => {
  //   if (transactions.length > 0) {
  //     const fetchInsights = async () => {
  //       setIsInsightsLoading(true);
  //       const data = await generateFinancialInsights(transactions);
  //       setInsights(data);
  //       setIsInsightsLoading(false);
  //     };
  //     fetchInsights();
  //   }
  // }, [transactions.length]);

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewDesc(transaction.description);
    setNewAmount(transaction.amount.toString());
    setNewType(transaction.type);
    setNewCategory(transaction.category);
    setNewDate(transaction.date);
    setIsManagingCategories(false);
    setShowAddModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount) return;

    try {
      const transactionData = {
        description: newDesc,
        amount: parseFloat(newAmount),
        type: newType,
        category: newCategory,
        date: newDate
      };

      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, {
          ...transactionData,
          ...transactionData,
          // date: editingTransaction.date // Removed in favor of user editable date below
        });
      } else {
        await transactionService.create({
          ...transactionData
          // date field already in transactionData
        });
      }

      await loadTransactions(); // Reload from server to be sure
      setShowAddModal(false);
      resetForm();
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error saving transaction', error);
      alert('Erro ao salvar transação');
    }
  };

  const resetForm = () => {
    setNewDesc('');
    setNewAmount('');
    setNewType(TransactionType.EXPENSE);
    setNewCategory(categories[0]);
    // Reset to Local Today
    const today = new Date();
    setNewDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setIsManagingCategories(false);
    setTempCatName('');
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await transactionService.delete(id);
      await loadTransactions();
    }
  };

  const handleAddCategory = async () => {
    const trimmed = tempCatName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      try {
        await categoryService.create(trimmed);
        setCategories([...categories, trimmed]);
        setTempCatName('');
      } catch (error) {
        console.error('Error adding category:', error);
        alert('Erro ao adicionar categoria');
      }
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    if (categories.length > 1) {
      try {
        if (confirm(`Deseja excluir a categoria "${cat}"? Transações existentes NÃO serão excluídas, mas ficarão sem uma categoria válida na lista.`)) {
          await categoryService.delete(cat);
          const updated = categories.filter(c => c !== cat);
          setCategories(updated);
          if (newCategory === cat) {
            setNewCategory(updated[0]);
          }
        }
      } catch (error) {
        console.error('Error removing category:', error);
        alert('Erro ao remover categoria. Verifique se existem transações usando esta categoria.');
      }
    }
  };

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#0d0d0d] text-white"><Loader2 className="animate-spin" /></div>;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-white p-4">
        <div className="w-full max-w-md space-y-6 bg-[#121420] p-8 rounded-2xl border border-zinc-800 text-center">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-amber-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold">Configuração Necessária</h2>
          <p className="text-zinc-400">
            Para usar o <strong>OrganizaFin</strong>, você precisa configurar as variáveis de ambiente do Supabase.
          </p>
          <div className="bg-[#0a0b14] p-4 rounded-xl text-left border border-zinc-800/50 space-y-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Passos para configurar:</p>
            <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
              <li>Crie um projeto no <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">Supabase</a></li>
              <li>Abra o arquivo <code>.env.local</code> na raiz do projeto</li>
              <li>Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code></li>
              <li>Reinicie o servidor de desenvolvimento</li>
            </ol>
          </div>
          <p className="text-xs text-zinc-500 italic">
            A tela preta ocorria porque o sistema tentava conectar a um banco de dados inexistente.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onLogin={() => { }} />;
  }

  return (
    <div className="flex h-screen bg-[#0d0d0d] overflow-hidden">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onAddTransaction={handleOpenAddModal}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0d0d0d] border-b border-zinc-800 z-40 flex items-center px-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white hover:bg-zinc-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1 flex justify-center pr-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-black font-bold">
              <LayoutDashboard size={16} />
            </div>
            <span className="text-white font-bold tracking-tight text-sm">OrganizaFin</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto mt-16 md:mt-0">
        <div className="px-2 py-4 md:p-8">
          {currentView === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              categories={categories}
              insights={insights}
              isInsightsLoading={isInsightsLoading}
            />
          )}
          {currentView === 'records' && (
            <Records
              transactions={transactions}
              categories={categories}
              onAddTransaction={handleOpenAddModal}
              onEditTransaction={handleOpenEditModal}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}
          {currentView === 'settings' && (
            <Settings />
          )}
          {currentView === 'notes' && (
            <Notes />
          )}
          {currentView === 'fixed-costs' && (
            <FixedCosts />
          )}
        </div>
      </main>

      {/* Transaction Modal (Add/Edit) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#121420] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-[#121420]/50">
              <h3 className="text-lg font-bold text-white">
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditingTransaction(null); }} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Descrição</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    placeholder="Ex: Assinatura Mensal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Data</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Tipo</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as TransactionType)}
                      className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                    >
                      <option value={TransactionType.EXPENSE}>Saída</option>
                      <option value={TransactionType.INCOME}>Entrada</option>
                    </select>
                  </div>
                </div>

                {/* Category Management Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setIsManagingCategories(!isManagingCategories)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
                    >
                      <Sliders size={12} />
                      {isManagingCategories ? 'Fechar' : 'Gerenciar'}
                    </button>
                  </div>

                  {isManagingCategories ? (
                    <div className="bg-[#0a0b14] border border-zinc-800 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tempCatName}
                          onChange={(e) => setTempCatName(e.target.value)}
                          placeholder="Nova categoria..."
                          className="flex-1 bg-[#121420] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/10"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {categories.map((cat) => (
                          <div key={cat} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/30 group transition-colors">
                            <span className="text-xs text-zinc-300">{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              className="text-zinc-600 hover:text-rose-500 p-1 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer transition-all"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <Plus size={14} className="rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isManagingCategories}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  {editingTransaction ? 'Atualizar Registro' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
