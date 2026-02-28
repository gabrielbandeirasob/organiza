
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, User, Settings, Plus, LogOut, ChevronDown, HelpCircle, ShieldCheck, X, NotebookPen, CalendarClock } from 'lucide-react';
import { View } from '../types';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onAddTransaction: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onAddTransaction, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'records', label: 'Registros', icon: FileText },
    { id: 'fixed-costs', label: 'Custos Fixos', icon: CalendarClock },
    { id: 'notes', label: 'Notas', icon: NotebookPen },
    { id: 'settings', label: 'Meu Perfil', icon: User },
  ];

  const userEmail = session?.user?.email || 'Visitante';
  const userName = session?.user?.user_metadata?.full_name || (userEmail.split('@')[0] || 'Usuário');

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 flex flex-col border-r border-zinc-800 bg-[#0d0d0d] h-screen overflow-y-auto z-50
        fixed md:sticky top-0 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="p-6 flex flex-col items-center text-center gap-2 border-b border-zinc-800/50">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black font-bold shadow-lg shadow-emerald-500/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight text-lg">OrganizaFin</h1>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Premium Plan</p>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === item.id
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          <div className="pt-8 pb-4">
            <p className="px-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Suporte</p>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <HelpCircle size={18} />
              Central de Ajuda
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <ShieldCheck size={18} />
              Privacidade
            </button>
          </div>
        </nav>

        <div className="p-4 space-y-4">
          <button
            onClick={onAddTransaction}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-emerald-500/10"
          >
            <Plus size={20} />
            Adicionar Transação
          </button>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between p-2 hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border border-zinc-700">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left w-32">
                <p className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate" title={userName}>{userName}</p>
                <p className="text-[11px] text-zinc-500 truncate" title={userEmail}>{userEmail}</p>
              </div>
            </div>
            <ChevronDown size={14} className="text-zinc-500" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-100 hover:bg-red-500/10 hover:text-red-400 text-xs py-2 transition-colors rounded-lg"
          >
            <LogOut size={14} />
            Sair do Aplicativo
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
