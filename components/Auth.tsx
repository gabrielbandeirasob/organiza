
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export const Auth: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getFriendlyErrorMessage = (errorMsg: string) => {
        if (errorMsg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
        if (errorMsg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
        if (errorMsg.includes('Email not confirmed')) return 'Por favor, confirme seu e-mail antes de entrar.';
        if (errorMsg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
        return 'Ocorreu um erro. Tente novamente.';
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = isSignUp
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setError(getFriendlyErrorMessage(error.message));
            } else {
                if (!isSignUp) {
                    onLogin();
                } else {
                    // Check if session was created immediately (meaning email confirmation disabled) or not
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        onLogin();
                    } else {
                        setError('Se você já tem conta, faça Login. Caso contrário, verifique seu email.');
                        // Optional: switch to login mode visually or just show functionality
                    }
                }
            }
        } catch (err) {
            setError('Erro de conexão inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-white p-4">
            <div className="w-full max-w-sm space-y-8 bg-[#121420] p-8 rounded-2xl border border-zinc-800">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">OrganizaFin</h2>
                    <p className="text-zinc-500 mt-2">{isSignUp ? 'Crie sua conta' : 'Acesse seus dados'}</p>
                </div>

                {error && (
                    <div className={`p-3 text-sm rounded-lg border ${error.includes('Conta criada')
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                        : 'text-red-400 bg-red-400/10 border-red-400/20'
                        }`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full bg-[#0a0b14] border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500/50 outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold py-3 rounded-xl transition-all flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
                    </button>
                </form>

                <button
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                    className="w-full text-zinc-500 text-xs hover:text-white transition-colors"
                >
                    {isSignUp ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
                </button>
            </div>
        </div>
    );
};
