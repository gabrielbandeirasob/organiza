import { supabase } from '../lib/supabase';
import { Category } from '../types';

export const categoryService = {
    async fetchAll(): Promise<string[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('name')
            .eq('user_id', user.id)
            .order('name');

        if (error) throw error;
        return (data || []).map(row => row.name);
    },

    async create(name: string): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('categories')
            .insert({ name, user_id: user.id })
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create category');
        return data.name;
    },

    async delete(name: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('name', name)
            .eq('user_id', user.id);

        if (error) throw error;
    }
};
