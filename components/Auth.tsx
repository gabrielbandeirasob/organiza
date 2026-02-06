
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

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) setError(getFriendlyErrorMessage(error.message));
        } catch (err) {
            setError('Erro ao iniciar login com Google.');
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

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#121420] px-2 text-zinc-500">Ou continue com</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                </button>

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
