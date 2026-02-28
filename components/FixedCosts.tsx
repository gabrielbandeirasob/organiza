import React, { useState, useEffect, useMemo } from 'react';
import { FixedCost } from '../types';
import { supabase } from '../lib/supabase';
import { fixedCostService } from '../services/fixedCostService';
import { Plus, Trash2, DollarSign, Calendar, Home, Check, ChevronLeft, ChevronRight, Copy, FileEdit, Loader2 } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'organiza_fixed_costs_';

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Helper to get YYYY-MM
const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Format YYYY-MM to localized string like "Setembro 2026"
const formatMonthStr = (monthStr: string) => {
    if (!monthStr || monthStr.length !== 7) return monthStr;
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    const text = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// Increment YYYY-MM by one month
const getNextMonthStr = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Increment a YYYY-MM-DD date by X months safely
const addMonthsToDateStr = (dateStr: string, monthsToAdd: number) => {
    if (!dateStr) return dateStr;
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    date.setMonth(date.getMonth() + monthsToAdd);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const FixedCosts: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [costs, setCosts] = useState<FixedCost[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Determine available months
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        costs.forEach(c => {
            if (c.month) months.add(c.month);
        });
        if (months.size === 0) months.add(getCurrentMonthStr());
        return Array.from(months).sort();
    }, [costs]);

    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());

    // Ensure selected month is initialized correctly if it's missing but we have data
    useEffect(() => {
        if (!availableMonths.includes(selectedMonth) && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[availableMonths.length - 1]);
        }
    }, [availableMonths, selectedMonth]);

    // Form State
    const [newName, setNewName] = useState('');
    const [newDueDate, setNewDueDate] = useState('');
    const [newValue, setNewValue] = useState('');

    // Load user and data
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const uid = session.user.id;
                setUserId(uid);

                try {
                    let dbCosts = await fixedCostService.fetchAll();

                    // Migration Logic
                    const localKey = STORAGE_KEY_PREFIX + uid;
                    const localRaw = localStorage.getItem(localKey);

                    if (localRaw) {
                        console.log('[MIGRATION] Local data found, migrating to Supabase...');
                        const localData = JSON.parse(localRaw);
                        if (Array.isArray(localData) && localData.length > 0) {
                            // Filter data that doesn't exist in Supabase (by some heuristic or just all if db is empty)
                            // To be safe, if DB is empty, migrate everything.
                            if (dbCosts.length === 0) {
                                const costsToMigrate = localData.map((c: any) => ({
                                    ...c,
                                    baseId: c.baseId || c.id,
                                    month: c.month || getCurrentMonthStr()
                                }));
                                await fixedCostService.createMany(costsToMigrate);
                                dbCosts = await fixedCostService.fetchAll();
                            }
                        }
                        // Clear localStorage after migration
                        localStorage.removeItem(localKey);

                        // Also clear legacy keys
                        Object.keys(localStorage).forEach(key => {
                            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                                localStorage.removeItem(key);
                            }
                        });
                    }

                    setCosts(dbCosts);

                    // If loaded data has months, select the most recent one by default
                    const loadedMonths = Array.from(new Set(dbCosts.map(c => c.month).filter(Boolean)));
                    if (loadedMonths.length > 0) {
                        loadedMonths.sort();
                        setSelectedMonth(loadedMonths[loadedMonths.length - 1] as string);
                    } else {
                        setSelectedMonth(getCurrentMonthStr());
                    }
                } catch (error) {
                    console.error('[FIXED COSTS] Error loading data:', error);
                }
            }
            setIsLoading(false);
        };

        init();
    }, []);

    // Derived state for the selected month
    const currentCosts = useMemo(() => {
        return costs.filter(c => c.month === selectedMonth);
    }, [costs, selectedMonth]);

    const handleAddCost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newValue) return;

        const baseId = generateId();
        const futureMonths = availableMonths.filter(m => m >= selectedMonth);

        const newCostsData: FixedCost[] = futureMonths.map(month => {
            const monthDiff = (parseInt(month.split('-')[0]) - parseInt(selectedMonth.split('-')[0])) * 12 +
                (parseInt(month.split('-')[1]) - parseInt(selectedMonth.split('-')[1]));

            return {
                id: '', // Will be generated by DB
                baseId: baseId,
                month: month,
                name: newName.trim(),
                dueDate: addMonthsToDateStr(newDueDate, monthDiff),
                value: parseFloat(newValue),
                isPaid: false
            };
        });

        if (futureMonths.length === 0) {
            newCostsData.push({
                id: '',
                baseId: baseId,
                month: selectedMonth,
                name: newName.trim(),
                dueDate: newDueDate,
                value: parseFloat(newValue),
                isPaid: false
            });
        }

        try {
            const created = await fixedCostService.createMany(newCostsData);
            setCosts(prev => [...prev, ...created]);
            setNewName('');
            setNewDueDate('');
            setNewValue('');
        } catch (error) {
            console.error('Error adding cost:', error);
            alert('Erro ao adicionar custo');
        }
    };

    const togglePaid = async (cost: FixedCost) => {
        try {
            const updated = await fixedCostService.update(cost.id, { isPaid: !cost.isPaid });
            setCosts(prev => prev.map(c => c.id === cost.id ? updated : c));
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleEditCost = async (id: string, field: keyof FixedCost, value: string | number) => {
        // Optimistic update in state first for smooth typing if we want, 
        // but here we wait for the "Check" or Blur to save.
        // For now, let's keep it in state and save when editingId is set to null (Check button)
        setCosts(prev => prev.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    const saveEdit = async (id: string) => {
        const cost = costs.find(c => c.id === id);
        if (!cost) return;
        try {
            await fixedCostService.update(id, cost);
            setEditingId(null);
        } catch (error) {
            console.error('Error saving edit:', error);
            alert('Erro ao salvar alterações');
        }
    };

    const handleDelete = async (id: string, baseId?: string) => {
        const isFutureDelete = confirm('Deseja excluir este custo apenas deste mês ou de todos os meses futuros?\n\n[OK] para Todos Futuros\n[Cancelar] Apenas deste mês');

        try {
            if (isFutureDelete && baseId) {
                await fixedCostService.deleteFuture(baseId, selectedMonth);
                setCosts(prev => prev.filter(c => {
                    if (c.baseId === baseId && c.month && c.month >= selectedMonth) return false;
                    return true;
                }));
            } else {
                await fixedCostService.delete(id);
                setCosts(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Error deleting cost:', error);
            alert('Erro ao excluir custo');
        }
    };

    const createNextMonth = async () => {
        const nextMonth = getNextMonthStr(selectedMonth);
        if (availableMonths.includes(nextMonth)) {
            setSelectedMonth(nextMonth);
            return;
        }

        const newCostsData: FixedCost[] = currentCosts.map(c => ({
            id: '',
            baseId: c.baseId || generateId(),
            month: nextMonth,
            name: c.name,
            dueDate: addMonthsToDateStr(c.dueDate, 1),
            value: c.value,
            isPaid: false
        }));

        try {
            const created = await fixedCostService.createMany(newCostsData);
            setCosts(prev => [...prev, ...created]);
            setSelectedMonth(nextMonth);
        } catch (error) {
            console.error('Error creating next month:', error);
            alert('Erro ao gerar próximo mês');
        }
    };

    const totalFormatado = currentCosts.reduce((acc, curr) => acc + curr.value, 0);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0d0d0d] text-white">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="px-3 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Custos Fixos</h2>
                    <p className="text-zinc-500 text-xs sm:text-sm">Controle suas contas mensais e verifique o que já foi pago.</p>
                </div>

                {/* Month Selector */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#0a0b14] p-1.5 rounded-xl border border-zinc-800 w-full sm:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-zinc-900 sm:bg-transparent text-white font-bold py-2 px-4 focus:outline-none cursor-pointer appearance-none text-center min-w-[140px] rounded-lg"
                    >
                        {availableMonths.map(m => (
                            <option key={m} value={m} className="bg-zinc-900">{formatMonthStr(m)}</option>
                        ))}
                    </select>
                    <div className="hidden sm:block w-[1px] h-6 bg-zinc-800 mx-1"></div>
                    <button
                        onClick={createNextMonth}
                        title="Criar próximo mês copiando as contas"
                        className="flex items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 sm:py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Copy size={14} />
                        Gerar Próximo Mês
                    </button>
                </div>
            </header>

            {/* Add New Cost Form */}
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl mb-8">
                <h3 className="text-lg font-bold text-white mb-4">Adicionar Conta em {formatMonthStr(selectedMonth)}</h3>
                <form onSubmit={handleAddCost} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Conta</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ex: Água, Condomínio..."
                            className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                            required
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Vencimento Inicial</label>
                        <input
                            type="date"
                            value={newDueDate}
                            onChange={e => setNewDueDate(e.target.value)}
                            className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-black font-bold h-[46px] px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Adicionar
                    </button>
                </form>
                <p className="text-xs text-zinc-500 mt-3">* O custo será replicado para todos os meses futuros já gerados.</p>
            </div>

            {/* Table mimicking Minimalist Dark Theme */}
            <div className="bg-[#111113] rounded-xl overflow-hidden shadow-2xl border border-zinc-800/80 mt-6 font-medium">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-[#151518] text-xs font-bold tracking-widest uppercase border-b border-zinc-800/80">
                                <th className="px-5 py-4 border-r border-zinc-800/80 w-[35%]">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Home size={14} className="text-[#e87a3f]" />
                                        <span>Conta</span>
                                    </div>
                                </th>
                                <th className="px-5 py-4 border-r border-zinc-800/80 w-[20%] text-center">
                                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                                        <Calendar size={14} className="text-[#db4c4c]" />
                                        <span>Vencimento</span>
                                    </div>
                                </th>
                                <th className="px-5 py-4 border-r border-zinc-800/80 w-[25%]">
                                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                                        <DollarSign size={14} className="text-[#34d399]" />
                                        <span>Valor</span>
                                    </div>
                                </th>
                                <th className="px-5 py-4 text-center border-r border-zinc-800/80 w-[15%]">
                                    <div className="flex items-center justify-center gap-2 text-zinc-400">
                                        <Check size={14} />
                                        <span>Pago?</span>
                                    </div>
                                </th>
                                <th className="w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {currentCosts.map((cost) => {
                                const isEditing = editingId === cost.id;
                                return (
                                    <tr key={cost.id} className="bg-[#111113] hover:bg-[#1a1a1e] transition-colors focus-within:bg-[#1a1a1e]">
                                        <td className="border-r border-zinc-800/80 p-0">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={cost.name}
                                                    onChange={(e) => handleEditCost(cost.id, 'name', e.target.value)}
                                                    autoFocus
                                                    className="w-full bg-[#1a1a1e] px-5 py-4 text-white focus:outline-none uppercase font-semibold text-sm transition-colors border-l-2 border-[#34d399]"
                                                />
                                            ) : (
                                                <div className="w-full px-5 py-4 text-white uppercase font-semibold text-sm cursor-pointer" onDoubleClick={() => setEditingId(cost.id)}>
                                                    {cost.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border-r border-zinc-800/80 p-0">
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={cost.dueDate}
                                                    onChange={(e) => handleEditCost(cost.id, 'dueDate', e.target.value)}
                                                    className="w-full bg-[#1a1a1e] text-center px-5 py-4 text-emerald-100/90 focus:outline-none text-sm transition-colors [color-scheme:dark]"
                                                />
                                            ) : (
                                                <div className="w-full text-center px-5 py-4 text-emerald-100/90 text-sm cursor-pointer" onDoubleClick={() => setEditingId(cost.id)}>
                                                    {cost.dueDate ? new Date(cost.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border-r border-zinc-800/80 p-0">
                                            <div className={`flex items-center px-5 flex-1 transition-colors h-full ${isEditing ? 'bg-[#1a1a1e]' : 'hover:bg-white/5 cursor-pointer'}`} onDoubleClick={() => !isEditing && setEditingId(cost.id)}>
                                                <span className="text-zinc-500 mr-2 text-sm select-none">R$</span>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={cost.value || ''}
                                                        onChange={(e) => handleEditCost(cost.id, 'value', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-transparent py-4 text-right text-white font-semibold focus:outline-none text-sm"
                                                    />
                                                ) : (
                                                    <div className="w-full py-4 text-right text-white font-semibold text-sm">
                                                        {cost.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center border-r border-zinc-800/80">
                                            <button
                                                onClick={() => togglePaid(cost)}
                                                className={`w-full py-2.5 rounded text-xs font-bold tracking-widest transition-colors border ${cost.isPaid ? 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20 hover:bg-[#34d399]/20' : 'bg-[#151518] text-zinc-600 border-zinc-800 hover:text-zinc-300 hover:bg-[#1a1a1e]'}`}
                                            >
                                                {cost.isPaid ? 'PAGO' : '-'}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-4">
                                                {isEditing ? (
                                                    <button
                                                        onClick={() => saveEdit(cost.id)}
                                                        className="text-[#34d399] hover:text-[#34d399]/70 transition-colors"
                                                        title="Salvar"
                                                    >
                                                        <Check size={18} strokeWidth={2} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingId(cost.id)}
                                                        className="text-[#34d399] hover:text-[#34d399]/70 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <FileEdit size={18} strokeWidth={2} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(cost.id, cost.baseId)}
                                                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {currentCosts.length === 0 && (
                                <tr className="bg-[#111113]">
                                    <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        Nenhum custo fixo cadastrado para {formatMonthStr(selectedMonth)}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#151518] text-white text-sm border-t border-zinc-800/80">
                                <td colSpan={2} className="px-5 py-4 border-r border-zinc-800/80 text-right font-bold text-zinc-400 tracking-wider">
                                    VALOR TOTAL =
                                </td>
                                <td className="px-5 py-4 border-r border-zinc-800/80 bg-transparent">
                                    <div className="flex items-center justify-between text-[#34d399] font-bold text-base">
                                        <span>R$</span>
                                        <span>{totalFormatado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </td>
                                <td className="bg-[#151518] border-none"></td>
                                <td className="bg-[#151518] border-none"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FixedCosts;
