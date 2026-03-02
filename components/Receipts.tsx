
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Folder, FolderOpen, Trash2, Pencil, Check, X, File, ChevronRight, ChevronLeft, Download, Loader2, Upload, Move, Eye, Image as ImageIcon, FileText, MoreVertical, Search, Filter } from 'lucide-react';
import { ReceiptFolder, Receipt } from '../types';
import { supabase } from '../lib/supabase';
import { receiptService } from '../services/receiptService';

const Receipts: React.FC = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [folders, setFolders] = useState<ReceiptFolder[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Folder editing state
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Receipt editing state
    const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
    const [editingReceiptName, setEditingReceiptName] = useState('');
    const [movingReceiptId, setMovingReceiptId] = useState<string | null>(null);

    const [mobileView, setMobileView] = useState<'folders' | 'files'>('folders');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const folderEditInputRef = useRef<HTMLInputElement>(null);
    const receiptEditInputRef = useRef<HTMLInputElement>(null);

    // Load user and data
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                setUserId(session.user.id);
                try {
                    const { folders: dbFolders, receipts: dbReceipts } = await receiptService.fetchAll();
                    setFolders(dbFolders);
                    setReceipts(dbReceipts);
                } catch (error) {
                    console.error('[RECEIPTS] Error loading data:', error);
                }
            }
            setIsLoading(false);
        };
        init();
    }, []);

    // ── Navigation & Breadcrumbs ────────────────────────────────────

    const getBreadcrumbs = () => {
        if (!selectedFolderId) return [];
        const breadcrumbs = [];
        let current: ReceiptFolder | undefined = folders.find(f => f.id === selectedFolderId);
        while (current) {
            breadcrumbs.unshift(current);
            current = folders.find(f => f.id === current?.parentId);
        }
        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    // ── Folder actions ──────────────────────────────────────────────

    const handleCreateFolder = async () => {
        const name = newFolderName.trim();
        if (!name) { setIsCreatingFolder(false); return; }
        try {
            const folder = await receiptService.createFolder(name, selectedFolderId);
            setFolders(prev => [...prev, folder]);
            setSelectedFolderId(folder.id);
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
            const updated = await receiptService.updateFolder(id, name);
            setFolders(prev => prev.map(f => f.id === id ? updated : f));
            setEditingFolderId(null);
        } catch (error: any) {
            console.error('Error renaming folder:', error);
            alert('Erro ao renomear pasta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Excluir esta pasta, todas as suas subpastas e comprovantes?')) return;
        try {
            await receiptService.deleteFolder(id);
            const reloaded = await receiptService.fetchAll();
            setFolders(reloaded.folders);
            setReceipts(reloaded.receipts);
            if (selectedFolderId === id) setSelectedFolderId(null);
        } catch (error: any) {
            console.error('Error deleting folder:', error);
            alert('Erro ao excluir pasta: ' + (error.message || 'Erro desconhecido'));
        }
    };

    // ── Receipt actions ──────────────────────────────────────────────

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const receipt = await receiptService.uploadReceipt(file, selectedFolderId);
            setReceipts(prev => [receipt, ...prev]);
        } catch (error: any) {
            console.error('Error uploading receipt:', error);
            alert('Erro ao fazer upload: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRenameReceipt = async (id: string) => {
        const name = editingReceiptName.trim();
        if (!name) { setEditingReceiptId(null); return; }
        try {
            const updated = await receiptService.updateReceiptName(id, name);
            setReceipts(prev => prev.map(r => r.id === id ? updated : r));
            setEditingReceiptId(null);
        } catch (error: any) {
            console.error('Error renaming receipt:', error);
            alert('Erro ao renomear comprovante: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleMoveReceipt = async (receiptId: string, folderId: string | null) => {
        try {
            const updated = await receiptService.moveReceipt(receiptId, folderId);
            setReceipts(prev => prev.map(r => r.id === receiptId ? updated : r));
            setMovingReceiptId(null);
        } catch (error: any) {
            console.error('Error moving receipt:', error);
            alert('Erro ao mover comprovante: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleDeleteReceipt = async (id: string) => {
        if (!confirm('Excluir este comprovante?')) return;
        try {
            await receiptService.deleteReceipt(id);
            setReceipts(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            console.error('Error deleting receipt:', error);
            alert('Erro ao excluir comprovante: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const subFolders = folders.filter(f => f.parentId === selectedFolderId);
    const selectedFolderReceipts = receipts.filter(r => {
        const folderMatch = r.folderId === selectedFolderId;
        const searchMatch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
        return folderMatch && searchMatch;
    });
    const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null;

    const getFileIcon = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={20} className="text-amber-400" />;
        if (['pdf'].includes(ext || '')) return <FileText size={20} className="text-rose-400" />;
        return <File size={20} className="text-zinc-400" />;
    };

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
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Carregando arquivos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-3 min-h-[calc(100vh-4rem)] relative overflow-hidden bg-[#0d0d0d] p-4 sm:p-5">

            {/* ── Left panel: Sidebar ── */}
            <aside className={`
                w-full sm:w-72 flex-shrink-0 flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                ${mobileView === 'folders' ? 'flex translate-x-0' : 'hidden sm:flex translate-x-0'}
            `}>
                <div className="p-5 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/20 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Meus Arquivos</span>
                        </div>
                        <button
                            onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                            className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95"
                            title="Nova pasta"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar nas pastas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/30 transition-all"
                        />
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-3 custom-scrollbar">
                    <button
                        onClick={() => { setSelectedFolderId(null); setMobileView('files'); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group text-left ${selectedFolderId === null
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                            }`}
                    >
                        <div className={`p-1.5 rounded-md ${selectedFolderId === null ? 'bg-emerald-500/20' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
                            <Folder size={14} className={selectedFolderId === null ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                        </div>
                        <span className="flex-1 text-[11px] font-bold tracking-tight">Arquivos Raiz</span>
                    </button>

                    <div className="h-4"></div>
                    <span className="px-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">Categorias</span>

                    {folders.filter(f => !f.parentId).map(folder => (
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
                                    onClick={() => { setSelectedFolderId(folder.id); setMobileView('files'); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group text-left ${selectedFolderId === folder.id || breadcrumbs.some(b => b.id === folder.id)
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-md transition-colors ${selectedFolderId === folder.id || breadcrumbs.some(b => b.id === folder.id) ? 'bg-emerald-500/20' : 'bg-zinc-800/50 group-hover:bg-zinc-800'}`}>
                                        {(selectedFolderId === folder.id || breadcrumbs.some(b => b.id === folder.id))
                                            ? <FolderOpen size={14} />
                                            : <Folder size={14} />
                                        }
                                    </div>
                                    <span className="flex-1 truncate text-[11px] font-bold tracking-tight">{folder.name}</span>

                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
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

                                    {folders.some(f => f.parentId === folder.id) && <ChevronRight size={12} className={`ml-2 transition-all ${selectedFolderId === folder.id ? 'rotate-90 text-emerald-400' : 'opacity-40'}`} />}
                                </button>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* ── Right panel: Content ── */}
            <main className={`
                flex-1 flex flex-col bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all duration-300
                ${mobileView === 'files' ? 'flex' : 'hidden sm:flex'}
            `}>
                <header className="p-5 border-b border-zinc-800/50 bg-gradient-to-br from-zinc-800/20 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMobileView('folders')}
                                className="sm:hidden p-2 bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight">
                                    {selectedFolder ? selectedFolder.name : 'Arquivos'}
                                </h2>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                    {selectedFolderReceipts.length} Arquivos • {subFolders.length} Pastas
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept="image/*,application/pdf"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)] active:scale-95"
                            >
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                <span>Upload</span>
                            </button>
                            <button
                                onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border border-zinc-700/50 active:scale-95"
                            >
                                <Plus size={14} />
                                <span>Nova Pasta</span>
                            </button>
                        </div>
                    </div>

                    {/* Styled Breadcrumbs */}
                    {selectedFolderId && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <button
                                onClick={() => setSelectedFolderId(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-[10px] font-bold text-zinc-400 rounded-full transition-all border border-zinc-700/30 whitespace-nowrap"
                            >
                                <Folder size={12} className="text-zinc-500" />
                                Home
                            </button>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={crumb.id}>
                                    <ChevronRight size={12} className="text-zinc-700 flex-shrink-0" />
                                    <button
                                        onClick={() => setSelectedFolderId(crumb.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 transition-all text-[10px] font-bold rounded-full border whitespace-nowrap ${idx === breadcrumbs.length - 1
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 border-zinc-700/30'}`}
                                        disabled={idx === breadcrumbs.length - 1}
                                    >
                                        <Folder size={12} className={idx === breadcrumbs.length - 1 ? 'text-emerald-400' : 'text-zinc-500'} />
                                        {crumb.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 custom-scrollbar pb-32">

                    {/* Section: Folders */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Pastas Locais</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/50 via-zinc-800/10 to-transparent ml-4"></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {isCreatingFolder && (
                                <div className="bg-emerald-500/5 border-2 border-dashed border-emerald-500/30 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in duration-300">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg w-fit">
                                        <Folder size={20} className="text-emerald-400" />
                                    </div>
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
                                        className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleCreateFolder} className="flex-1 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider py-2 rounded-lg">Criar</button>
                                        <button onClick={() => setIsCreatingFolder(false)} className="px-2 bg-zinc-800 text-zinc-500 text-[10px] font-black py-2 rounded-lg">X</button>
                                    </div>
                                </div>
                            )}

                            {subFolders.map(folder => (
                                <div
                                    key={folder.id}
                                    className="group relative bg-[#141414] border border-zinc-800/50 rounded-xl p-4 hover:border-emerald-500/40 hover:bg-zinc-800/30 transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
                                    onClick={() => setSelectedFolderId(folder.id)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2.5 bg-zinc-800/80 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all shadow-inner">
                                            <FolderOpen size={20} className="text-zinc-400 group-hover:text-emerald-400" />
                                        </div>
                                        {editingFolderId !== folder.id && (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {editingFolderId === folder.id ? (
                                        <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
                                            <input
                                                ref={folderEditInputRef}
                                                value={editingFolderName}
                                                onChange={e => setEditingFolderName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleRenameFolder(folder.id);
                                                    if (e.key === 'Escape') setEditingFolderId(null);
                                                }}
                                                autoFocus
                                                className="w-full bg-zinc-950 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                                            />
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleRenameFolder(folder.id)} className="flex-1 bg-emerald-500 text-black text-[10px] font-bold py-1.5 rounded-md">Salvar</button>
                                                <button onClick={() => setEditingFolderId(null)} className="px-2.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold py-1.5 rounded-md text-center">X</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors tracking-tight">{folder.name}</h4>
                                                <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-zinc-200"><Pencil size={11} /></button>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-2 flex items-center gap-2">
                                                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                                {receipts.filter(r => r.folderId === folder.id).length} arquivos
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {!isCreatingFolder && subFolders.length === 0 && (
                                <button
                                    onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                                    className="border-2 border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2.5 text-zinc-600 hover:text-emerald-500 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                                >
                                    <div className="p-2.5 bg-zinc-900 rounded-lg group-hover:bg-emerald-500/10">
                                        <Plus size={20} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Nova Pasta</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Section: Files */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Arquivos</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800/50 via-zinc-800/10 to-transparent ml-4"></div>
                        </div>

                        {selectedFolderReceipts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800/50">
                                <div className="p-4 bg-zinc-900/50 rounded-full mb-4">
                                    <Upload size={24} className="text-zinc-700" />
                                </div>
                                <h5 className="text-zinc-400 text-xs font-bold tracking-tight">Nenhum arquivo por aqui</h5>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-750 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                >
                                    Fazer Upload
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {selectedFolderReceipts.map(receipt => (
                                    <div key={receipt.id} className="group relative bg-[#141414] border border-zinc-800/50 rounded-xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 shadow-lg">

                                        {/* Action Bar Overlay */}
                                        <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 z-10">
                                            <button
                                                onClick={() => { setEditingReceiptId(receipt.id); setEditingReceiptName(receipt.name); }}
                                                className="p-1.5 bg-zinc-900/95 backdrop-blur-md text-zinc-400 hover:text-emerald-400 rounded-lg border border-white/5 transition-colors"
                                                title="Renomear"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            <button
                                                onClick={() => setMovingReceiptId(receipt.id)}
                                                className="p-1.5 bg-zinc-900/95 backdrop-blur-md text-zinc-400 hover:text-emerald-400 rounded-lg border border-white/5 transition-colors"
                                                title="Mover"
                                            >
                                                <Move size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReceipt(receipt.id)}
                                                className="p-1.5 bg-zinc-900/95 backdrop-blur-md text-zinc-400 hover:text-rose-400 rounded-lg border border-white/5 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex items-center gap-3.5 mb-4">
                                                <div className="p-3 bg-zinc-950/50 rounded-xl group-hover:bg-emerald-500/10 transition-colors shadow-inner">
                                                    {getFileIcon(receipt.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {editingReceiptId === receipt.id ? (
                                                        <input
                                                            ref={receiptEditInputRef}
                                                            value={editingReceiptName}
                                                            onChange={e => setEditingReceiptName(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleRenameReceipt(receipt.id);
                                                                if (e.key === 'Escape') setEditingReceiptId(null);
                                                            }}
                                                            autoFocus
                                                            className="w-full bg-zinc-950 border border-emerald-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                                        />
                                                    ) : (
                                                        <>
                                                            <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors" title={receipt.name}>
                                                                {receipt.name}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="px-1.5 py-0.5 bg-zinc-800 text-[8px] font-black text-zinc-500 rounded uppercase tracking-widest">{receipt.name.split('.').pop()}</span>
                                                                <span className="text-[9px] text-zinc-600 font-bold">{formatDate(receipt.createdAt)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={receipt.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                                                >
                                                    <Eye size={12} />
                                                    Ver
                                                </a>
                                                <a
                                                    href={receipt.fileUrl}
                                                    download={receipt.name}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                                                >
                                                    <Download size={12} />
                                                    Baixar
                                                </a>
                                            </div>
                                        </div>

                                        {/* Move Modal (Premium Glass Overlay) */}
                                        {movingReceiptId === receipt.id && (
                                            <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md rounded-xl z-20 p-5 flex flex-col border border-emerald-500/20 animate-in fade-in duration-200">
                                                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Mover para:</span>
                                                    <button onClick={() => setMovingReceiptId(null)} className="p-1 text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                                    <button
                                                        onClick={() => handleMoveReceipt(receipt.id, null)}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-bold text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-all border border-transparent hover:border-emerald-500/20"
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
                                                        / Home
                                                    </button>
                                                    {folders.filter(f => f.id !== receipt.folderId).map(f => (
                                                        <button
                                                            key={f.id}
                                                            onClick={() => handleMoveReceipt(receipt.id, f.id)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            / {f.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Receipts;
