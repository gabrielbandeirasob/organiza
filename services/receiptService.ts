
import { supabase } from '../lib/supabase';
import { ReceiptFolder, Receipt } from '../types';
import { Database } from '../lib/database.types';

type FolderRow = Database['public']['Tables']['receipt_folders']['Row'];
type ReceiptRow = Database['public']['Tables']['receipts']['Row'];

const mapFolderRowToModel = (row: FolderRow): ReceiptFolder => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    createdAt: row.created_at,
});

const mapReceiptRowToModel = (row: ReceiptRow): Receipt => ({
    id: row.id,
    folderId: row.folder_id,
    name: row.name,
    fileUrl: row.file_url,
    filePath: row.file_path,
    createdAt: row.created_at,
});

export const receiptService = {
    async fetchAll(): Promise<{ folders: ReceiptFolder[]; receipts: Receipt[] }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const [foldersRes, receiptsRes] = await Promise.all([
            supabase.from('receipt_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            supabase.from('receipts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        ]);

        if (foldersRes.error) throw foldersRes.error;
        if (receiptsRes.error) throw receiptsRes.error;

        return {
            folders: (foldersRes.data || []).map(mapFolderRowToModel),
            receipts: (receiptsRes.data || []).map(mapReceiptRowToModel)
        };
    },

    async createFolder(name: string, parentId: string | null = null): Promise<ReceiptFolder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('receipt_folders')
            .insert({ user_id: user.id, name, parent_id: parentId })
            .select()
            .single();

        if (error) throw error;
        return mapFolderRowToModel(data);
    },

    async updateFolder(id: string, name: string): Promise<ReceiptFolder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('receipt_folders')
            .update({ name })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapFolderRowToModel(data);
    },

    async deleteFolder(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Note: 'on delete cascade' in DB handles the relationship if configured,
        // but storage files must be deleted manually.
        const { data: receipts } = await supabase
            .from('receipts')
            .select('file_path')
            .eq('folder_id', id)
            .eq('user_id', user.id);

        if (receipts && receipts.length > 0) {
            const paths = receipts.map(r => r.file_path);
            await supabase.storage.from('receipts').remove(paths);
            await supabase.from('receipts').delete().eq('folder_id', id).eq('user_id', user.id);
        }

        const { error } = await supabase
            .from('receipt_folders')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async uploadReceipt(file: File, folderId: string | null): Promise<Receipt> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        const { data, error: dbError } = await supabase
            .from('receipts')
            .insert({
                user_id: user.id,
                folder_id: folderId,
                name: file.name,
                file_url: publicUrl,
                file_path: filePath
            })
            .select()
            .single();

        if (dbError) {
            // Cleanup storage if DB insert fails
            await supabase.storage.from('receipts').remove([filePath]);
            throw dbError;
        }

        return mapReceiptRowToModel(data);
    },

    async updateReceiptName(id: string, name: string): Promise<Receipt> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('receipts')
            .update({ name })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapReceiptRowToModel(data);
    },

    async moveReceipt(id: string, folderId: string | null): Promise<Receipt> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('receipts')
            .update({ folder_id: folderId })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapReceiptRowToModel(data);
    },

    async deleteReceipt(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: receipt } = await supabase
            .from('receipts')
            .select('file_path')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (receipt) {
            await supabase.storage.from('receipts').remove([receipt.file_path]);
        }

        const { error } = await supabase
            .from('receipts')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    }
};
