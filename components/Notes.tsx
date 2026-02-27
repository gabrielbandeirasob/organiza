
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Folder, FolderOpen, Trash2, Pencil, Check, X, FileText, StickyNote, ChevronRight, Download } from 'lucide-react';
import { NoteFolder, Note } from '../types';
import { supabase } from '../lib/supabase';

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const STORAGE_KEY_PREFIX = 'organiza_notes_';

function loadData(userId: string): { folders: NoteFolder[]; notes: Note[] } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { folders: [], notes: [] };
}

function saveData(userId: string, data: { folders: NoteFolder[]; notes: Note[] }) {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(data));
}

const Notes: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

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

    // Load user and data
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.id) {
                const uid = session.user.id;
                let data = loadData(uid);

                setFolders(data.folders);
                setNotes(data.notes);
                // setUserId triggers the persistence useEffect, so we do it last
                setUserId(uid);
            } else {
                console.warn('[NOTES] No session found');
            }
        });
    }, []);

    // Persist whenever folders or notes change
    useEffect(() => {
        if (userId) saveData(userId, { folders, notes });
    }, [folders, notes, userId]);

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

    // Debounced auto-save for note content
    const scheduleNoteSave = useCallback((title: string, content: string) => {
        if (!selectedNoteId) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            setNotes(prev =>
                prev.map(n =>
                    n.id === selectedNoteId
                        ? { ...n, title, content, updatedAt: new Date().toISOString() }
                        : n
                )
            );
        }, 500);
    }, [selectedNoteId]);

    // ── Folder actions ──────────────────────────────────────────────

    const handleCreateFolder = () => {
        const name = newFolderName.trim();
        if (!name) { setIsCreatingFolder(false); return; }
        const folder: NoteFolder = { id: generateId(), name, createdAt: new Date().toISOString() };
        setFolders(prev => [...prev, folder]);
        setSelectedFolderId(folder.id);
        setSelectedNoteId(null);
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const handleRenameFolder = (id: string) => {
        const name = editingFolderName.trim();
        if (!name) { setEditingFolderId(null); return; }
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
        setEditingFolderId(null);
    };

    const handleDeleteFolder = (id: string) => {
        if (!confirm('Excluir esta pasta e todas as suas notas?')) return;
        setFolders(prev => prev.filter(f => f.id !== id));
        setNotes(prev => prev.filter(n => n.folderId !== id));
        if (selectedFolderId === id) {
            setSelectedFolderId(null);
            setSelectedNoteId(null);
        }
    };

    const startEditFolder = (folder: NoteFolder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    // ── Note actions ────────────────────────────────────────────────

    const handleCreateNote = () => {
        if (!selectedFolderId) return;
        const title = newNoteTitle.trim() || 'Nova Nota';
        const note: Note = {
            id: generateId(),
            folderId: selectedFolderId,
            title,
            content: '',
            updatedAt: new Date().toISOString(),
        };
        setNotes(prev => [...prev, note]);
        setSelectedNoteId(note.id);
        setNewNoteTitle('');
        setIsCreatingNote(false);
    };

    const handleDeleteNote = (id: string) => {
        if (!confirm('Excluir esta nota?')) return;
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNoteId === id) setSelectedNoteId(null);
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

    const folderNotes = notes.filter(n => n.folderId === selectedFolderId);
    const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;
    const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null;

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex h-full gap-0 min-h-[calc(100vh-4rem)]">

            {/* ── Left panel: Folders ── */}
            <div className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-[#0d0d0d] rounded-xl mr-4">
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
            <div className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-[#0d0d0d] rounded-xl mr-4">
                {selectedFolder ? (
                    <>
                        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{selectedFolder.name}</span>
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
            <div className="flex-1 flex flex-col bg-[#0d0d0d] rounded-xl border border-zinc-800 overflow-hidden">
                {selectedNote ? (
                    <>
                        {/* Editor header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121420]/40">
                            <input
                                value={editingNoteTitle}
                                onChange={e => {
                                    setEditingNoteTitle(e.target.value);
                                    scheduleNoteSave(e.target.value, editingNoteContent);
                                }}
                                placeholder="Título da nota..."
                                className="flex-1 bg-transparent text-lg font-bold text-white focus:outline-none placeholder:text-zinc-700 mr-4"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600 hidden sm:block">
                                    {formatDate(selectedNote.updatedAt)}
                                </span>
                                <button
                                    onClick={handleDownloadNote}
                                    className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                    title="Baixar como texto"
                                >
                                    <Download size={15} />
                                </button>
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
