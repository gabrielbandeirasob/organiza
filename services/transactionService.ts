
import { supabase } from '../lib/supabase';
import { Transaction, TransactionType, Category } from '../types';
import { Database } from '../lib/database.types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

// Mapping helpers
const mapRowToTransaction = (row: TransactionRow): Transaction => ({
    id: row.id,
    date: row.date || '',
    description: row.description || '',
    amount: Number(row.amount),
    category: (row.category || 'Outros') as Category,
    type: row.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
});

const mapTransactionToInsert = (t: Omit<Transaction, 'id'>, userId: string): TransactionInsert => ({
    description: t.description,
    amount: t.amount,
    date: t.date,
    category: t.category,
    type: t.type === TransactionType.INCOME ? 'income' : 'expense',
    user_id: userId,
});

export const transactionService = {
    async fetchAll() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapRowToTransaction);
    },

    async create(transaction: Omit<Transaction, 'id'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('transactions')
            .insert(mapTransactionToInsert(transaction, user.id))
            .select()
            .single();

        if (error) throw error;
        return mapRowToTransaction(data);
    },

    async update(id: string, transaction: Omit<Transaction, 'id'>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('transactions')
            .update(mapTransactionToInsert(transaction, user.id))
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapRowToTransaction(data);
    },

    async delete(id: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },
};
