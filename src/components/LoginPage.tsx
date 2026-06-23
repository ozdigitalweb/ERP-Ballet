import React, { useState } from 'react';
import { ShieldCheck, Info, UserCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any, roles: UserRole[]) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Predefined users for quick and helpful testing of permissions
  const demoUsers = [
    { email: 'diretor@escolaballet.com.br', name: 'Arthur Lima', role: 'Diretor (Direção)' },
    { email: 'marcia@escolaballet.com.br', name: 'Márcia Mendes', role: 'Coordenadora (Pedagógico)' },
    { email: 'camila@escolaballet.com.br', name: 'Camila Soares', role: 'Professor (Aulas)' },
    { email: 'patricia@escolaballet.com.br', name: 'Patrícia Silva', role: 'Administrativo' },
    { email: 'beatriz@escolaballet.com.br', name: 'Beatriz Souza', role: 'Atendimento' },
    { email: 'clara.antunes@email.com', name: 'Clara Antunes', role: 'Aluna/Cliente' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'senha123' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      // Success
      onLoginSuccess(data.token, data.user, data.roles);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('senha123');
    setError(null);
    // Auto submit in next tick
    setTimeout(() => {
      const btn = document.getElementById('submit-login-btn');
      if (btn) btn.click();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" id="login-module">
      <div className="max-w-4xl w-full bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Brand info and rules */}
        <div className="p-8 bg-purple-950 flex flex-col justify-between text-white border-b md:border-b-0 md:border-r border-slate-700/50">
          <div className="space-y-4">
            <div className="inline-flex p-3 bg-purple-900 border border-purple-800 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#9c27b0] font-black block">Sistema ERP de Dança</span>
              <h1 className="text-2xl font-sans font-black text-slate-100">Ballet Corpo & Arte</h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Ambiente acadêmico integrado de controles de captação de leads, controle financeiro de matrículas, registros imutáveis de frequência e homologação pedagógica dos planos de aula.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-purple-900 text-xs text-slate-400 space-y-2">
            <span className="font-semibold text-yellow-300 block">Regras de Acesso e Segurança (RBAC):</span>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
              <li>Nível 9 (Diretor): Acesso total irrestrito</li>
              <li>Nível 7 (Coordenador): Turmas e aprovações</li>
              <li>Nível 5 (Professor): Diários de aula e chamadas</li>
              <li>Nível 3 (Atendimento): CRM e cadastros básicos</li>
              <li>Nível 1 (Cliente/Aluno): Portal simplificado</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Login form & Demo buttons */}
        <div className="p-8 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Controles de Autenticação</h2>
            <p className="text-slate-400 text-xs mt-1">Insira suas credenciais ou use o painel de acesso rápido para testes.</p>
          </div>

          {error && (
            <div className="bg-red-950/80 border border-red-800 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">E-mail Cadastrado</label>
              <input
                type="email"
                required
                placeholder="exemplo@escolaballet.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">Senha de Acesso</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Insera a senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none pr-10 transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">A senha default dos usuários do seed é <code className="bg-slate-900 text-slate-300 px-1 py-0.5 rounded">senha123</code></span>
            </div>

            <button
              type="submit"
              id="submit-login-btn"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-900 text-white font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md text-xs hover:shadow-lg disabled:cursor-not-allowed"
            >
              {loading ? 'Validando Acesso...' : 'Efetuar Login Seguro'}
            </button>
          </form>

          {/* Quick simulation accounts for testing */}
          <div className="pt-4 border-t border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-yellow-400" /> Atalhos de Perfis (Simulador Integrado)
            </span>
            <div className="grid grid-cols-2 gap-2 text-left">
              {demoUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => handleQuickLogin(u.email)}
                  className="bg-[#121824] hover:bg-[#1a2335] text-slate-300 border border-slate-700 p-2 rounded-lg text-left transition-all cursor-pointer group"
                >
                  <p className="text-[11px] font-bold text-slate-200 group-hover:text-purple-400 transition-colors truncate">{u.name}</p>
                  <p className="text-[9px] text-slate-400 truncate">{u.role}</p>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-1.5 p-2 bg-[#2d1b42]/30 border border-purple-900/40 rounded-lg">
              <Info className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-slate-400 leading-normal">
                Ao clicar em um perfil rápido, o backend validará a autenticação e reconfigurará dinamicamente as permissões reais da interface.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
