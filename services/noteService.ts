
import { supabase } from '../lib/supabase';
import { NoteFolder, Note } from '../types';
import { Database } from '../lib/database.types';

type FolderRow = Database['public']['Tables']['note_folders']['Row'];
type NoteRow = Database['public']['Tables']['notes']['Row'];

const mapFolderRowToModel = (row: FolderRow): NoteFolder => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
});

const mapNoteRowToModel = (row: NoteRow): Note => ({
    id: row.id,
    folderId: row.folder_id || '',
    title: row.title,
    content: row.content || '',
    updatedAt: row.updated_at,
});

export const noteService = {
    async fetchAll(): Promise<{ folders: NoteFolder[]; notes: Note[] }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const [foldersRes, notesRes] = await Promise.all([
            supabase.from('note_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
        ]);

        if (foldersRes.error) throw foldersRes.error;
        if (notesRes.error) throw notesRes.error;

        return {
            folders: (foldersRes.data || []).map(mapFolderRowToModel),
            notes: (notesRes.data || []).map(mapNoteRowToModel)
        };
    },

    async createFolder(name: string): Promise<NoteFolder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('note_folders')
            .insert({ user_id: user.id, name })
            .select()
            .single();

        if (error) throw error;
        return mapFolderRowToModel(data);
    },

    async updateFolder(id: string, name: string): Promise<NoteFolder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('note_folders')
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

        const { error } = await supabase
            .from('note_folders')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async createNote(folderId: string, title: string): Promise<Note> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .insert({ user_id: user.id, folder_id: folderId, title })
            .select()
            .single();

        if (error) throw error;
        return mapNoteRowToModel(data);
    },

    async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('notes')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapNoteRowToModel(data);
    },

    async deleteNote(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    },

    async createManyFolders(folders: Omit<NoteFolder, 'id'>[]): Promise<NoteFolder[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('note_folders')
            .insert(folders.map(f => ({ user_id: user.id, name: f.name, created_at: f.createdAt })))
            .select();

        if (error) throw error;
        return (data || []).map(mapFolderRowToModel);
    },

    async createManyNotes(notes: (Omit<Note, 'id'> & { id?: string })[]): Promise<Note[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('notes')
            .insert(notes.map(n => ({
                user_id: user.id,
                folder_id: n.folderId,
                title: n.title,
                content: n.content,
                updated_at: n.updatedAt
            })))
            .select();

        if (error) throw error;
        return (data || []).map(mapNoteRowToModel);
    }
};
