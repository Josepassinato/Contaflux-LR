import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: any, isDemo: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('demo@contaflux.com');
  const [password, setPassword] = useState('123456');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLoginSuccess(data.session, false);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    // Sinaliza para o App.tsx que é modo demo, sem passar uma sessão real.
    // O App.tsx será responsável por carregar os dados mockados.
    onLoginSuccess(null, true);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-white text-3xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ContaFlux LR</h1>
          <p className="text-slate-400 mt-2">Plataforma de Inteligência Fiscal B2B</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Lock className="text-blue-600" size={20} />
              Acesso ao Sistema
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                <ShieldCheck size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400"><Mail size={18} /></span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="voce@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400"><Lock size={18} /></span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-70 mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar na Plataforma'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <button
                onClick={handleDemoLogin}
                className="w-full group bg-blue-50 text-blue-700 py-3 rounded-lg font-medium hover:bg-blue-100 transition-colors flex justify-center items-center gap-2"
              >
                Modo Demonstração (Sem Login) <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                Ambiente seguro com criptografia ponta a ponta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};