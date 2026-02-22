
import React, { useState } from 'react';
import { Shield, Bell, User, Mail, CreditCard, ChevronRight } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

const Settings: React.FC = () => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setNewName(session.user.user_metadata.full_name);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.full_name) {
        setNewName(session.user.user_metadata.full_name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateName = async () => {
    if (!newName.trim()) return;

    const { error } = await supabase.auth.updateUser({
      data: { full_name: newName }
    });

    if (error) {
      alert('Erro ao atualizar nome');
    } else {
      setIsEditingName(false);
      // Force refresh session to update UI immediately in other components if needed
      window.location.reload();
    }
  };

  const userEmail = session?.user?.email || 'Carregando...';
  // Use metadata name if available, otherwise fall back to email prefix
  const displayName = session?.user?.user_metadata?.full_name || (userEmail !== 'Carregando...' ? userEmail.split('@')[0] : '...');

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-700">
      <header className="mb-8 pl-16 md:pl-0">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Meu Perfil</h2>
        <p className="text-zinc-500 text-xs md:text-sm">Gerencie seu perfil e detalhes da conta.</p>
      </header>

      <div className="space-y-8">
        <div>
          <h4 className="text-lg font-bold text-white mb-6">Detalhes da Conta</h4>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/10 transition-colors group gap-3">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-950 text-zinc-500 group-hover:text-zinc-200 transition-colors rounded-xl border border-zinc-800">
                  <User size={18} />
                </div>
                <span className="text-sm font-medium text-zinc-400">Nome de Exibição</span>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full sm:w-auto bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <button onClick={handleUpdateName} className="text-emerald-500 text-xs font-bold hover:underline">Salvar</button>
                    <button onClick={() => setIsEditingName(false)} className="text-zinc-500 text-xs hover:text-white">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-zinc-100 truncate max-w-[150px] sm:max-w-none">{displayName}</span>
                    <button onClick={() => { setNewName(displayName); setIsEditingName(true); }} className="text-xs text-indigo-400 hover:text-indigo-300">Editar</button>
                  </>
                )}
              </div>
            </div>

            {[
              { label: 'Endereço de E-mail', value: userEmail, icon: Mail },
              { label: 'Plano Atual', value: 'OrganizaFin Premium', icon: CreditCard, badge: 'Pro' },
            ].map((item, i) => (
              <div key={i} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/10 transition-colors group gap-3">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-zinc-950 text-zinc-500 group-hover:text-zinc-200 transition-colors rounded-xl border border-zinc-800">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-zinc-400">{item.label}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <span className="text-sm font-bold text-zinc-100 break-all sm:break-normal text-right">{item.value}</span>
                  <ChevronRight size={14} className="text-zinc-700 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Bell size={18} /> Notificações</h4>
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">Alertas por E-mail</p>
              <button onClick={() => setEmailAlerts(!emailAlerts)} className={`w-10 h-6 rounded-full relative transition-colors ${emailAlerts ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${emailAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
            <h4 className="text-lg font-bold text-white flex items-center gap-2"><Shield size={18} /> Segurança</h4>
            <button className="text-xs font-bold text-emerald-500">Configurar 2FA</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
