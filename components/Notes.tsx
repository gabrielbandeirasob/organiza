
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Folder, FolderOpen, Trash2, Pencil, Check, X, FileText, StickyNote, ChevronRight, ChevronLeft, Download, Loader2, Search } from 'lucide-react';
import { NoteFolder, Note } from '../types';
import { supabase } from '../lib/supabase';
import { noteService } from '../services/noteService';

const STORAGE_KEY_PREFIX = 'organiza_notes_';

const Notes: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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
    const [mobileView, setMobileView] = useState<'folders' | 'notes' | 'editor'>('folders');

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const newNoteInputRef = useRef<HTMLInputElement>(null);
    const folderEditInputRef = useRef<HTMLInputElement>(null);

    // Load user and data
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const uid = session.user.id;
                setUserId(uid);

                try {
                    let { folders: dbFolders, notes: dbNotes } = await noteService.fetchAll();

                    // Migration Logic
                    const localKey = STORAGE_KEY_PREFIX + uid;
                    const localRaw = localStorage.getItem(localKey);

                    if (localRaw && dbFolders.length === 0 && dbNotes.length === 0) {
                        console.log('[MIGRATION] Local notes found, migrating to Supabase...');
                        const localData = JSON.parse(localRaw);
                        const localFolders = localData.folders || [];
                        const localNotes = localData.notes || [];

                        if (localFolders.length > 0) {
                            // Create folders and map IDs
                            const idMapping: Record<string, string> = {};
                            for (const f of localFolders) {
                                const created = await noteService.createFolder(f.name);
                                idMapping[f.id] = created.id;
                            }

                            // Create notes with mapped folder IDs
                            if (localNotes.length > 0) {
                                const notesToMigrate = localNotes.map((n: any) => ({
                                    ...n,
                                    folderId: idMapping[n.folderId] || null
                                }));
                                await noteService.createManyNotes(notesToMigrate);
                            }

                            // Reload from DB
                            const reloaded = await noteService.fetchAll();
                            dbFolders = reloaded.folders;
                            dbNotes = reloaded.notes;
                        }

                        // Clear localStorage
                        localStorage.removeItem(localKey);
                    }

                    setFolders(dbFolders);
                    setNotes(dbNotes);
                } catch (error) {
                    console.error('[NOTES] Error loading data:', error);
                }
            }
            setIsLoading(false);
        };

        init();
    }, []);

    // Selection management
    useEffect(() => {
        const note = notes.find(n => n.id === selectedNoteId);
        if (note) {
            setEditingNoteTitle(note.title);
            setEditingNoteContent(note.content);
        } else {
            setEditingNoteTitle('');
            setEditingNoteContent('');
        }
    }, [selectedNoteId, notes]);

    // Debounced auto-save for note content
    const scheduleNoteSave = useCallback((title: string, content: string) => {
        if (!selectedNoteId) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            try {
                const updated = await noteService.updateNote(selectedNoteId, { title, content });
                setNotes(prev => prev.map(n => n.id === selectedNoteId ? updated : n));
            } catch (error) {
                console.error('Error auto-saving note:', error);
            }
        }, 1000);
    }, [selectedNoteId]);

    // ── Folder actions ──────────────────────────────────────────────

    const handleCreateFolder = async () => {
        const name = newFolderName.trim();
        if (!name) { setIsCreatingFolder(false); return; }
        try {
            const folder = await noteService.createFolder(name);
            setFolders(prev => [...prev, folder]);
            setSelectedFolderId(folder.id);
            setSelectedNoteId(null);
            setNewFolderName('');
            setIsCreatingFolder(false);
        } catch (error: any) {
            console.error('Error creating folder:', error);
            alert('Erro ao criar pasta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleRenameFolder = async (id: string) => {
        const name = editingFolderName.trim();
        if (!name) { setEditingFolderId(null); return; }
        try {
            const updated = await noteService.updateFolder(id, name);
            setFolders(prev => prev.map(f => f.id === id ? updated : f));
            setEditingFolderId(null);
        } catch (error: any) {
            console.error('Error renaming folder:', error);
            alert('Erro ao renomear pasta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Excluir esta pasta e todas as suas notas?')) return;
        try {
            await noteService.deleteFolder(id);
            setFolders(prev => prev.filter(f => f.id !== id));
            setNotes(prev => prev.filter(n => n.folderId !== id));
            if (selectedFolderId === id) {
                setSelectedFolderId(null);
                setSelectedNoteId(null);
            }
        } catch (error: any) {
            console.error('Error deleting folder:', error);
            alert('Erro ao excluir pasta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const startEditFolder = (folder: NoteFolder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    // ── Note actions ────────────────────────────────────────────────

    const handleCreateNote = async () => {
        if (!selectedFolderId) return;
        const title = newNoteTitle.trim() || 'Nova Nota';
        try {
            const note = await noteService.createNote(selectedFolderId, title);
            setNotes(prev => [note, ...prev]);
            setSelectedNoteId(note.id);
            setNewNoteTitle('');
            setIsCreatingNote(false);
            setMobileView('editor');
        } catch (error: any) {
            console.error('Error creating note:', error);
            alert(`Erro ao criar nota!\n\nID da Pasta: ${selectedFolderId}\nErro: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!confirm('Excluir esta nota?')) return;
        try {
            await noteService.deleteNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (selectedNoteId === id) setSelectedNoteId(null);
        } catch (error: any) {
            console.error('Error deleting note:', error);
            alert('Erro ao excluir nota: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleDownloadNote = () => {
        if (!selectedNote) return;

        const content = `${selectedNote.title}\n\n${selectedNote.content}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedNote.title || 'nota'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const folderNotes = notes.filter(n => {
        const folderMatch = n.folderId === selectedFolderId;
        const searchMatch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content.toLowerCase().includes(searchQuery.toLowerCase());
        return folderMatch && searchMatch;
    });
    const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;
    const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null;

    const formatDate = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#0d0d0d] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Carregando notas...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-3 min-h-[calc(100vh-4rem)] relative overflow-hidden bg-[#0d0d0d] p-4 sm:p-5">

            {/* ── Left panel: Folders ── */}
            <aside className={`
                w-full sm:w-64 flex-shrink-0 flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                ${mobileView === 'folders' ? 'flex' : 'hidden sm:flex'}
            `}>
                <div className="p-5 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/20 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Pastas</span>
                        </div>
                        <button
                            onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                            className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95"
                            title="Nova pasta"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/30 transition-all"
                        />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    {isCreatingFolder && (
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20 mb-2 animate-in slide-in-from-top-2 duration-200">
                            <input
                                ref={newFolderInputRef}
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                                autoFocus
                                placeholder="Nome..."
                                className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <button onClick={handleCreateFolder} className="text-emerald-400 p-1 hover:bg-emerald-500/10 rounded"><Check size={14} /></button>
                            <button onClick={() => setIsCreatingFolder(false)} className="text-zinc-500 p-1 hover:bg-zinc-800 rounded"><X size={14} /></button>
                        </div>
                    )}

                    {folders.length === 0 && !isCreatingFolder && (
                        <div className="px-6 py-12 text-center">
                            <div className="w-12 h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700/30">
                                <Folder size={20} className="text-zinc-600" />
                            </div>
                            <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">Vazio</p>
                        </div>
                    )}

                    {folders.map(folder => (
                        <div key={folder.id} className="group relative">
                            {editingFolderId === folder.id ? (
                                <div className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                                    <input
                                        ref={folderEditInputRef}
                                        value={editingFolderName}
                                        onChange={e => setEditingFolderName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRenameFolder(folder.id);
                                            if (e.key === 'Escape') setEditingFolderId(null);
                                        }}
                                        autoFocus
                                        className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <button onClick={() => handleRenameFolder(folder.id)} className="text-emerald-400 p-1 hover:bg-emerald-500/10 rounded"><Check size={14} /></button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setSelectedFolderId(folder.id);
                                        setSelectedNoteId(null);
                                        setMobileView('notes');
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group text-left ${selectedFolderId === folder.id
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-md transition-colors ${selectedFolderId === folder.id ? 'bg-emerald-500/20' : 'bg-zinc-800/50 group-hover:bg-zinc-800'}`}>
                                        {selectedFolderId === folder.id
                                            ? <FolderOpen size={14} />
                                            : <Folder size={14} />
                                        }
                                    </div>
                                    <span className="flex-1 truncate text-[11px] font-bold tracking-tight">{folder.name}</span>

                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); startEditFolder(folder); }}
                                            className="p-1 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                                        >
                                            <Pencil size={11} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                            className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </button>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* ── Middle panel: Notes list ── */}
            <aside className={`
                w-full sm:w-64 flex-shrink-0 flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                ${mobileView === 'notes' ? 'flex translate-x-0' : 'hidden sm:flex translate-x-0'}
            `}>
                {selectedFolder ? (
                    <>
                        <div className="p-5 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/20 to-transparent">
                            <div className="flex items-center justify-between mb-4 sm:hidden">
                                <button
                                    onClick={() => setMobileView('folders')}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    Pastas
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Notas em</span>
                                    <h3 className="text-xs font-bold text-white truncate max-w-[140px]">{selectedFolder.name}</h3>
                                </div>
                                <button
                                    onClick={() => { setIsCreatingNote(true); setNewNoteTitle(''); }}
                                    className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-90"
                                    title="Nova nota"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
                            {isCreatingNote && (
                                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 animate-in slide-in-from-top-2 duration-200">
                                    <input
                                        ref={newNoteInputRef}
                                        value={newNoteTitle}
                                        onChange={e => setNewNoteTitle(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleCreateNote();
                                            if (e.key === 'Escape') setIsCreatingNote(false);
                                        }}
                                        autoFocus
                                        placeholder="Título..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                                    />
                                    <div className="flex gap-1 mt-2">
                                        <button onClick={handleCreateNote} className="flex-1 bg-emerald-500 text-black text-[10px] font-black py-1.5 rounded-lg uppercase tracking-wider">Criar</button>
                                        <button onClick={() => setIsCreatingNote(false)} className="px-3 bg-zinc-800 text-zinc-500 text-[10px] font-black py-1.5 rounded-lg text-center">X</button>
                                    </div>
                                </div>
                            )}

                            {folderNotes.length === 0 && !isCreatingNote && (
                                <div className="px-6 py-12 text-center opacity-50">
                                    <StickyNote size={24} className="text-zinc-700 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sem notas aqui</p>
                                </div>
                            )}

                            {folderNotes.map(note => (
                                <div key={note.id} className="group relative">
                                    <button
                                        onClick={() => {
                                            setSelectedNoteId(note.id);
                                            setMobileView('editor');
                                        }}
                                        className={`w-full text-left p-3.5 rounded-lg transition-all duration-300 border ${selectedNoteId === note.id
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                            : 'bg-zinc-800/20 text-zinc-400 border-transparent hover:bg-zinc-800/40 hover:text-zinc-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <FileText size={16} className={`mt-0.5 flex-shrink-0 ${selectedNoteId === note.id ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[11px] font-bold truncate tracking-tight">{note.title || 'Sem título'}</h4>
                                                <p className={`text-[10px] mt-1.5 line-clamp-2 leading-relaxed ${selectedNoteId === note.id ? 'text-emerald-400/60' : 'text-zinc-600'}`}>
                                                    {note.content ? note.content.slice(0, 60) : 'Nenhum conteúdo ainda...'}
                                                </p>
                                                <span className="text-[8px] font-black uppercase tracking-wider mt-2.5 block opacity-40">{formatDate(note.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all translate-x-1 group-hover:translate-x-0"
                                        title="Excluir nota"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/20">
                        <div className="p-6 bg-zinc-900/50 rounded-full mb-6 border border-zinc-800/50 shadow-inner">
                            <Folder size={32} className="text-zinc-800" />
                        </div>
                        <h4 className="text-zinc-400 text-sm font-bold tracking-tight">Expandir Categoria</h4>
                        <p className="text-zinc-600 text-[10px] mt-2 font-medium uppercase tracking-widest leading-relaxed">Selecione uma pasta para ver suas notas</p>
                    </div>
                )}
            </aside>

            {/* ── Right panel: Note editor ── */}
            <main className={`
                flex-1 flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                ${mobileView === 'editor' ? 'flex' : 'hidden sm:flex'}
            `}>
                {selectedNote ? (
                    <>
                        {/* Editor header */}
                        <header className="px-6 py-4 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/20 to-transparent">
                            <div className="flex items-center justify-between mb-4 sm:hidden">
                                <button
                                    onClick={() => setMobileView('notes')}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                    Notas
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg hidden lg:block">
                                        <StickyNote size={18} className="text-emerald-400" />
                                    </div>
                                    <input
                                        value={editingNoteTitle}
                                        onChange={e => {
                                            setEditingNoteTitle(e.target.value);
                                            scheduleNoteSave(e.target.value, editingNoteContent);
                                        }}
                                        placeholder="Título da nota..."
                                        className="flex-1 bg-transparent text-lg font-black text-white focus:outline-none placeholder:text-zinc-800 tracking-tight"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="hidden lg:flex flex-col items-end mr-1">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Editado</span>
                                        <span className="text-[10px] font-bold text-zinc-500">{formatDate(selectedNote.updatedAt)}</span>
                                    </div>
                                    <button
                                        onClick={handleDownloadNote}
                                        className="p-2 bg-zinc-800/50 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all border border-zinc-700/30 active:scale-90"
                                        title="Baixar Nota"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNote(selectedNote.id)}
                                        className="p-2 bg-zinc-800/50 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-zinc-700/30 active:scale-90"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Editor body */}
                        <div className="flex-1 relative p-2">
                            <textarea
                                value={editingNoteContent}
                                onChange={e => {
                                    setEditingNoteContent(e.target.value);
                                    scheduleNoteSave(editingNoteTitle, e.target.value);
                                }}
                                placeholder="O que você está pensando?..."
                                className="w-full h-full bg-transparent text-sm text-zinc-300 px-6 py-6 focus:outline-none resize-none leading-[1.8] placeholder:text-zinc-800 custom-scrollbar"
                            />
                            {/* Visual garnish: line numbers/indicator */}
                            <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent"></div>
                        </div>

                        {/* Footer status bar */}
                        <footer className="px-6 py-3 bg-zinc-950/30 border-t border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{editingNoteContent.length} Caracteres</span>
                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{editingNoteContent.split(/\s+/).filter(Boolean).length} Palavras</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Sincronizado</span>
                            </div>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl relative group">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <StickyNote size={36} className="text-zinc-800 relative z-10" />
                        </div>
                        <h3 className="text-lg font-black text-zinc-300 tracking-tight mb-2">Editor de Ideias</h3>
                        <p className="text-xs text-zinc-600 max-w-[280px] font-medium leading-relaxed">
                            {selectedFolder
                                ? 'Selecione uma nota na lista ao lado ou crie uma nova para começar a escrever.'
                                : 'Escolha uma pasta no menu lateral para visualizar e gerenciar suas notas.'}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notes;
