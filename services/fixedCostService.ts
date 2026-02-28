
import { supabase } from '../lib/supabase';
import { FixedCost } from '../types';
import { Database } from '../lib/database.types';

type FixedCostRow = Database['public']['Tables']['fixed_costs']['Row'];
type FixedCostInsert = Database['public']['Tables']['fixed_costs']['Insert'];

const mapRowToFixedCost = (row: FixedCostRow): FixedCost => ({
    id: row.id,
    baseId: row.base_id || undefined,
    month: row.month || undefined,
    name: row.name,
    dueDate: row.due_date || '',
    value: typeof row.value === 'number' ? row.value : Number(row.value || 0),
    isPaid: row.is_paid,
});

const mapFixedCostToInsert = (fc: FixedCost, userId: string): FixedCostInsert => ({
    user_id: userId,
    base_id: fc.baseId || null,
    month: fc.month || null,
    name: fc.name,
    due_date: fc.dueDate || null,
    value: fc.value,
    is_paid: fc.isPaid,
});

export const fixedCostService = {
    async fetchAll(): Promise<FixedCost[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('fixed_costs')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapRowToFixedCost);
    },

    async create(fc: FixedCost): Promise<FixedCost> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('fixed_costs')
            .insert(mapFixedCostToInsert(fc, user.id))
            .select()
            .single();

        if (error) throw error;
        return mapRowToFixedCost(data);
    },

    async createMany(fcs: FixedCost[]): Promise<FixedCost[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('fixed_costs')
            .insert(fcs.map(fc => mapFixedCostToInsert(fc, user.id)))
            .select();

        if (error) throw error;
        return (data || []).map(mapRowToFixedCost);
    },

    async update(id: string, fc: Partial<FixedCost>): Promise<FixedCost> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const updateData: any = {};
        if (fc.name !== undefined) updateData.name = fc.name;
        if (fc.value !== undefined) updateData.value = fc.value;
        if (fc.dueDate !== undefined) updateData.due_date = fc.dueDate;
        if (fc.isPaid !== undefined) updateData.is_paid = fc.isPaid;
        if (fc.month !== undefined) updateData.month = fc.month;
        if (fc.baseId !== undefined) updateData.base_id = fc.baseId;

        const { data, error } = await supabase
            .from('fixed_costs')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapRowToFixedCost(data);
    },

    async delete(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('fixed_costs')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async deleteFuture(baseId: string, fromMonth: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('fixed_costs')
            .delete()
            .eq('user_id', user.id)
            .eq('base_id', baseId)
            .gte('month', fromMonth);

        if (error) throw error;
    }
};
