import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Folder, FolderOpen, Trash2, Pencil, Check, X, FileText, StickyNote, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { NoteFolder, Note } from '../types';
import { supabase } from '../lib/supabase';

// Helper to map Supabase snake_case to our app's camelCase Note type
const mapNote = (n: any): Note => ({
    id: n.id,
    folderId: n.folder_id,
    title: n.title,
    content: n.content,
    updatedAt: n.updated_at
});

// Helper to map Supabase snake_case to our app's camelCase NoteFolder type
const mapFolder = (f: any): NoteFolder => ({
    id: f.id,
    name: f.name,
    createdAt: f.created_at
});

const Notes: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Folder editing state
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Note editing state
    const [editingNoteTitle, setEditingNoteTitle] = useState('');
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const newNoteInputRef = useRef<HTMLInputElement>(null);
    const folderEditInputRef = useRef<HTMLInputElement>(null);

    // Load user and fetch real data from Supabase
    useEffect(() => {
        let isMounted = true;

        async function fetchNotesData() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) {
                    if (isMounted) setIsLoading(false);
                    return;
                }

                const uid = session.user.id;
                if (isMounted) setUserId(uid);

                // Fetch Folders
                const { data: foldersData, error: foldersError } = await supabase
                    .from('folders')
                    .select('*')
                    .eq('user_id', uid)
                    .order('created_at', { ascending: true });

                if (foldersError) throw foldersError;

                // Fetch Notes
                const { data: notesData, error: notesError } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', uid)
                    .order('updated_at', { ascending: false });

                if (notesError) throw notesError;

                if (isMounted) {
                    setFolders((foldersData || []).map(mapFolder));
                    setNotes((notesData || []).map(mapNote));
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error loading notes:", error);
                if (isMounted) setIsLoading(false);
            }
        }

        fetchNotesData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Auto-focus new folder input
    useEffect(() => {
        if (isCreatingFolder) newFolderInputRef.current?.focus();
    }, [isCreatingFolder]);

    // Auto-focus new note input
    useEffect(() => {
        if (isCreatingNote) newNoteInputRef.current?.focus();
    }, [isCreatingNote]);

    // Auto-focus folder rename input
    useEffect(() => {
        if (editingFolderId) folderEditInputRef.current?.focus();
    }, [editingFolderId]);

    // Sync editor fields when selected note changes
    useEffect(() => {
        const note = notes.find(n => n.id === selectedNoteId);
        if (note) {
            setEditingNoteTitle(note.title);
            setEditingNoteContent(note.content);
        } else {
            setEditingNoteTitle('');
            setEditingNoteContent('');
        }
    }, [selectedNoteId]);

    // Debounced auto-save for note content to Supabase
    const scheduleNoteSave = useCallback((title: string, content: string) => {
        if (!selectedNoteId || !userId) return;

        // Optimistic UI update
        const updatedTime = new Date().toISOString();
        setNotes(prev =>
            prev.map(n =>
                n.id === selectedNoteId
                    ? { ...n, title, content, updatedAt: updatedTime }
                    : n
            )
        );

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('notes')
                    .update({
                        title,
                        content,
                        updated_at: updatedTime
                    })
                    .eq('id', selectedNoteId)
                    .eq('user_id', userId);

                if (error) throw error;
            } catch (error) {
                console.error("Error automatically saving note:", error);
                // Ideally, show a toast notification here to warn the user that the save failed
            }
        }, 1000); // 1s debounce to avoid spamming the DB
    }, [selectedNoteId, userId]);

    // ── Folder actions ──────────────────────────────────────────────

    const handleCreateFolder = async () => {
        const name = newFolderName.trim();
        if (!name || !userId) { setIsCreatingFolder(false); return; }

        try {
            const { data, error } = await supabase
                .from('folders')
                .insert({ name, user_id: userId })
                .select()
                .single();

            if (error) throw error;

            const folder = mapFolder(data);
            setFolders(prev => [...prev, folder]);
            setSelectedFolderId(folder.id);
            setSelectedNoteId(null);
            setNewFolderName('');
            setIsCreatingFolder(false);
        } catch (error) {
            console.error("Error creating folder:", error);
            alert("Ocorreu um erro ao criar a pasta no banco de dados.");
        }
    };

    const handleRenameFolder = async (id: string) => {
        const name = editingFolderName.trim();
        if (!name || !userId) { setEditingFolderId(null); return; }

        // Optimistic UI update
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
        setEditingFolderId(null);

        try {
            const { error } = await supabase
                .from('folders')
                .update({ name })
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error("Error renaming folder:", error);
            // Revert state if we want, currently keeping it simple
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!userId || !confirm('Excluir esta pasta e todas as suas notas definitivamente da conta?')) return;

        // Due to "ON DELETE CASCADE" in SQL, deleting the folder clears its notes in the DB
        try {
            const { error } = await supabase
                .from('folders')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            setFolders(prev => prev.filter(f => f.id !== id));
            setNotes(prev => prev.filter(n => n.folderId !== id));

            if (selectedFolderId === id) {
                setSelectedFolderId(null);
                setSelectedNoteId(null);
            }
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert("Não foi possível excluir a pasta.");
        }
    };

    const startEditFolder = (folder: NoteFolder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    // ── Note actions ────────────────────────────────────────────────

    const handleCreateNote = async () => {
        if (!selectedFolderId || !userId) return;

        const title = newNoteTitle.trim() || 'Nova Nota';

        try {
            const { data, error } = await supabase
                .from('notes')
                .insert({
                    title,
                    content: '',
                    folder_id: selectedFolderId,
                    user_id: userId
                })
                .select()
                .single();

            if (error) throw error;

            const note = mapNote(data);
            setNotes(prev => [note, ...prev]);
            setSelectedNoteId(note.id);
            setNewNoteTitle('');
            setIsCreatingNote(false);
        } catch (error) {
            console.error("Error creating note:", error);
            alert("Falha ao criar nota no banco.");
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!userId || !confirm('Excluir esta nota permanentemente?')) return;

        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            setNotes(prev => prev.filter(n => n.id !== id));
            if (selectedNoteId === id) setSelectedNoteId(null);
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    };

    const folderNotes = notes.filter(n => n.folderId === selectedFolderId);
    const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;
    const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null;

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
            </div>
        );
    }

    return (
        <div className="flex h-full gap-0 min-h-[calc(100vh-4rem)]">

            {/* ── Left panel: Folders ── */}
            <div className={`flex-shrink-0 md:border-r border-zinc-800 flex-col bg-[#0d0d0d] rounded-xl md:mr-4 w-full md:w-56 ${!selectedFolderId && !selectedNoteId ? 'flex' : 'hidden md:flex'}`}>
                <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pastas</span>
                    <button
                        onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                        className="p-1 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        title="Nova pasta"
                    >
                        <Plus size={15} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
                    {/* New folder input */}
                    {isCreatingFolder && (
                        <div className="flex items-center gap-1 px-2 py-1.5">
                            <input
                                ref={newFolderInputRef}
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                                placeholder="Nome da pasta..."
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
                            />
                            <button onClick={handleCreateFolder} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check size={13} /></button>
                            <button onClick={() => setIsCreatingFolder(false)} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X size={13} /></button>
                        </div>
                    )}

                    {folders.length === 0 && !isCreatingFolder && (
                        <div className="px-4 py-8 text-center">
                            <Folder size={28} className="text-zinc-700 mx-auto mb-2" />
                            <p className="text-xs text-zinc-600">Nenhuma pasta ainda</p>
                        </div>
                    )}

                    {folders.map(folder => (
                        <div key={folder.id} className="group relative">
                            {editingFolderId === folder.id ? (
                                <div className="flex items-center gap-1 px-2 py-1.5">
                                    <input
                                        ref={folderEditInputRef}
                                        value={editingFolderName}
                                        onChange={e => setEditingFolderName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRenameFolder(folder.id);
                                            if (e.key === 'Escape') setEditingFolderId(null);
                                        }}
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <button onClick={() => handleRenameFolder(folder.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check size={13} /></button>
                                    <button onClick={() => setEditingFolderId(null)} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X size={13} /></button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setSelectedFolderId(folder.id); setSelectedNoteId(null); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left group ${selectedFolderId === folder.id
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                        }`}
                                >
                                    {selectedFolderId === folder.id
                                        ? <FolderOpen size={15} className="flex-shrink-0" />
                                        : <Folder size={15} className="flex-shrink-0" />
                                    }
                                    <span className="flex-1 truncate text-xs font-medium">{folder.name}</span>
                                    <ChevronRight size={12} className={`flex-shrink-0 transition-transform ${selectedFolderId === folder.id ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                                </button>
                            )}

                            {/* Hover actions */}
                            {editingFolderId !== folder.id && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-zinc-900 rounded-md p-0.5 border border-zinc-800">
                                    <button
                                        onClick={e => { e.stopPropagation(); startEditFolder(folder); }}
                                        className="p-1 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
                                        title="Renomear"
                                    >
                                        <Pencil size={11} />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                        className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Middle panel: Notes list ── */}
            <div className={`flex-shrink-0 md:border-r border-zinc-800 flex-col bg-[#0d0d0d] rounded-xl md:mr-4 w-full md:w-56 ${selectedFolderId && !selectedNoteId ? 'flex' : 'hidden md:flex'}`}>
                {selectedFolder ? (
                    <>
                        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <button
                                    onClick={() => setSelectedFolderId(null)}
                                    className="md:hidden p-1 -ml-1 text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                                    title="Voltar"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{selectedFolder.name}</span>
                            </div>
                            <button
                                onClick={() => { setIsCreatingNote(true); setNewNoteTitle(''); }}
                                className="p-1 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors flex-shrink-0"
                                title="Nova nota"
                            >
                                <Plus size={15} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
                            {/* New note input */}
                            {isCreatingNote && (
                                <div className="flex items-center gap-1 px-2 py-1.5">
                                    <input
                                        ref={newNoteInputRef}
                                        value={newNoteTitle}
                                        onChange={e => setNewNoteTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleCreateNote();
                                            if (e.key === 'Escape') setIsCreatingNote(false);
                                        }}
                                        placeholder="Título da nota..."
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
                                    />
                                    <button onClick={handleCreateNote} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check size={13} /></button>
                                    <button onClick={() => setIsCreatingNote(false)} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X size={13} /></button>
                                </div>
                            )}

                            {folderNotes.length === 0 && !isCreatingNote && (
                                <div className="px-4 py-8 text-center">
                                    <StickyNote size={28} className="text-zinc-700 mx-auto mb-2" />
                                    <p className="text-xs text-zinc-600">Nenhuma nota ainda</p>
                                    <button
                                        onClick={() => { setIsCreatingNote(true); setNewNoteTitle(''); }}
                                        className="mt-3 text-[11px] text-emerald-500 hover:text-emerald-400 transition-colors"
                                    >
                                        + Criar nota
                                    </button>
                                </div>
                            )}

                            {folderNotes.map(note => (
                                <div key={note.id} className="group relative">
                                    <button
                                        onClick={() => setSelectedNoteId(note.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selectedNoteId === note.id
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={13} className="flex-shrink-0 mt-0.5" />
                                            <span className="text-xs font-medium truncate">{note.title || 'Sem título'}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-600 mt-0.5 ml-5 truncate">
                                            {note.content ? note.content.slice(0, 40) : 'Nota vazia'}
                                        </p>
                                    </button>

                                    {/* Delete button on hover */}
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex p-1 text-zinc-600 hover:text-red-400 rounded transition-colors bg-zinc-900 border border-zinc-800"
                                        title="Excluir nota"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                        <FolderOpen size={32} className="text-zinc-700 mb-3" />
                        <p className="text-xs text-zinc-600">Selecione uma pasta</p>
                    </div>
                )}
            </div>

            {/* ── Right panel: Note editor ── */}
            <div className={`flex-1 flex-col bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden ${selectedNoteId ? 'flex' : 'hidden md:flex'}`}>
                {selectedNote ? (
                    <>
                        {/* Editor header */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-[#121420]/40">
                            <div className="flex items-center flex-1 overflow-hidden mr-4">
                                <button
                                    onClick={() => setSelectedNoteId(null)}
                                    className="md:hidden p-1 mr-2 -ml-1 text-zinc-500 hover:text-zinc-300 flex-shrink-0"
                                    title="Voltar"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <input
                                    value={editingNoteTitle}
                                    onChange={e => {
                                        setEditingNoteTitle(e.target.value);
                                        scheduleNoteSave(e.target.value, editingNoteContent);
                                    }}
                                    placeholder="Título da nota..."
                                    className="flex-1 bg-transparent text-lg font-bold text-white focus:outline-none placeholder:text-zinc-700 min-w-0 w-full"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-600 hidden sm:block">
                                    {formatDate(selectedNote.updatedAt)}
                                </span>
                                <button
                                    onClick={() => handleDeleteNote(selectedNote.id)}
                                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Excluir nota"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Editor body */}
                        <textarea
                            value={editingNoteContent}
                            onChange={e => {
                                setEditingNoteContent(e.target.value);
                                scheduleNoteSave(editingNoteTitle, e.target.value);
                            }}
                            placeholder="Comece a escrever sua nota aqui..."
                            className="flex-1 bg-transparent text-sm text-zinc-300 px-6 py-5 focus:outline-none resize-none leading-relaxed placeholder:text-zinc-700"
                        />
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                            <StickyNote size={28} className="text-zinc-700" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-400 mb-1">Nenhuma nota selecionada</h3>
                        <p className="text-xs text-zinc-600 max-w-xs">
                            {selectedFolder
                                ? 'Selecione uma nota à esquerda ou crie uma nova.'
                                : 'Selecione ou crie uma pasta para começar.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notes;
