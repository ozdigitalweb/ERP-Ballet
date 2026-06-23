import React, { useState, useEffect } from 'react';
import { Contato, Pessoa, Turma, PlanoAula, Aula, UserRole } from './types';

// Module Components
import Dashboard from './components/Dashboard';
import ContatoModule from './components/ContatoModule';
import PessoaModule from './components/PessoaModule';
import TurmaModule from './components/TurmaModule';
import AulaModule from './components/AulaModule';
import PlanoAulaModule from './components/PlanoAulaModule';
import LoginPage from './components/LoginPage';

import {
  Sparkles,
  LayoutDashboard,
  MessageCircle,
  Users,
  Calendar,
  ClipboardList,
  BookOpen,
  UserCheck,
  RotateCcw,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function App() {
  // Session Authentication State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_ballet_token'));
  const [currentUser, setCurrentUser] = useState<Pessoa | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('diretor');
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  // Current active simulation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contatos' | 'pessoas' | 'turmas' | 'aulas' | 'planos'>('dashboard');

  // Core Persistent State synced with backend
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [planos, setPlanos] = useState<PlanoAula[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);

  // 1. Verify token & get user profile on mount
  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }

    const savedRole = localStorage.getItem('erp_ballet_active_role') || '';

    fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-user-role': savedRole
      }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setCurrentUser(data.user);
        setCurrentRole(data.activeRole);
        setRoles(data.roles);
        setAuthChecked(true);
      })
      .catch(() => {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('erp_ballet_token');
        localStorage.removeItem('erp_ballet_active_role');
        setAuthChecked(true);
      });
  }, [token]);

  // 2. Fetch lists from backend, dynamically reacting to token/user/activeRole shifts
  useEffect(() => {
    if (!token || !currentUser) return;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-user-role': currentRole
    };

    // Contacts
    fetch('/api/contatos', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setContatos(data))
      .catch(console.error);

    // Pessoas
    fetch('/api/pessoas', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setPessoas(data))
      .catch(console.error);

    // Turmas
    fetch('/api/turmas', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setTurmas(data))
      .catch(console.error);

    // Planos
    fetch('/api/planos', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setPlanos(data))
      .catch(console.error);

    // Aulas
    fetch('/api/aulas', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => Array.isArray(data) && setAulas(data))
      .catch(console.error);
  }, [token, currentUser, currentRole]);

  // Auth Callbacks
  const handleLoginSuccess = (newToken: string, user: Pessoa, userRoles: UserRole[]) => {
    localStorage.setItem('erp_ballet_token', newToken);
    const initialRole = userRoles[0] || 'aluno';
    localStorage.setItem('erp_ballet_active_role', initialRole);
    setToken(newToken);
    setCurrentUser(user);
    setRoles(userRoles);
    setCurrentRole(initialRole);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_ballet_token');
    localStorage.removeItem('erp_ballet_active_role');
    setToken(null);
    setCurrentUser(null);
    setRoles([]);
    setContatos([]);
    setPessoas([]);
    setTurmas([]);
    setPlanos([]);
    setAulas([]);
  };

  // Switch between authorized roles of the logged in user
  const handleSwitchActiveRole = (role: UserRole) => {
    localStorage.setItem('erp_ballet_active_role', role);
    setCurrentRole(role);
  };

  // Redefine database helper (now triggering backend re-seed)
  const handleResetDatabase = async () => {
    if (confirm('Deseja redefinir os dados cadastrais escolares de volta ao padrão inicial de seed no backend?')) {
      try {
        const res = await fetch('/api/reset-database', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Banco de dados restaurado!');
        // Refresh values
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Erro ao restaurar banco de dados.');
      }
    }
  };

  // --- State Mutators backed by API calls ---

  const handleAddContato = async (newC: Omit<Contato, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/contatos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(newC)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar dados do lead.');
      }
      const saved = await res.json();
      setContatos([saved, ...contatos]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditContato = async (updatedC: Contato) => {
    try {
      const res = await fetch(`/api/contatos/${updatedC.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(updatedC)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar alterações no lead.');
      }
      const saved = await res.json();
      setContatos(contatos.map(c => c.id === saved.id ? saved : c));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteContato = async (id: string) => {
    try {
      const res = await fetch(`/api/contatos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao remover lead.');
      }
      setContatos(contatos.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConvertContato = async (contato: Contato, extra: { cpf: string; email: string; perfis: UserRole[] }) => {
    try {
      const res = await fetch(`/api/contatos/${contato.id}/converter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(extra)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro na conversão.');
      }
      const data = await res.json();
      setPessoas([data.pessoa, ...pessoas]);
      setContatos(contatos.map(c => c.id === contato.id ? data.contato : c));
      alert(`Sucesso! Lead "${contato.nome}" convertido oficialmente em Pessoa no sistema.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPessoa = async (newP: Omit<Pessoa, 'id'>) => {
    try {
      const res = await fetch('/api/pessoas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(newP)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar cadastro.');
      }
      const saved = await res.json();
      setPessoas([saved, ...pessoas]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPessoa = async (updatedP: Pessoa) => {
    try {
      const res = await fetch(`/api/pessoas/${updatedP.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(updatedP)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao editar ficha cadastral.');
      }
      const saved = await res.json();
      setPessoas(pessoas.map(p => p.id === saved.id ? saved : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePessoa = async (id: string) => {
    try {
      const res = await fetch(`/api/pessoas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir pessoa.');
      }
      setPessoas(pessoas.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTurma = async (newT: Omit<Turma, 'id'>) => {
    try {
      const res = await fetch('/api/turmas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(newT)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar modelagem de turma.');
      }
      const saved = await res.json();
      setTurmas([saved, ...turmas]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditTurma = async (updatedT: Turma) => {
    try {
      const res = await fetch(`/api/turmas/${updatedT.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(updatedT)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar turma.');
      }
      const saved = await res.json();
      setTurmas(turmas.map(t => t.id === saved.id ? saved : t));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTurma = async (id: string) => {
    try {
      const res = await fetch(`/api/turmas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao remover turma.');
      }
      setTurmas(turmas.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPlano = async (newPL: Omit<PlanoAula, 'id' | 'status' | 'versao'>) => {
    try {
      const res = await fetch('/api/planos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(newPL)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao criar plano.');
      }
      const saved = await res.json();
      setPlanos([saved, ...planos]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditPlano = async (updatedPL: PlanoAula) => {
    try {
      const res = await fetch(`/api/planos/${updatedPL.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(updatedPL)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar alterações no plano.');
      }
      const saved = await res.json();
      setPlanos(planos.map(p => p.id === saved.id ? saved : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveRejectPlano = async (id: string, statusDecision: 'aprovado' | 'rejeitado', feedback?: string) => {
    try {
      const res = await fetch(`/api/planos/${id}/aprovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify({ status: statusDecision, sugestoesMelhoria: feedback })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao homologar plano de aula.');
      }
      const saved = await res.json();
      setPlanos(planos.map(p => p.id === saved.id ? saved : p));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAula = async (newAU: Omit<Aula, 'id' | 'auditLogs'>) => {
    try {
      const res = await fetch('/api/aulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(newAU)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao instanciar aula no sistema.');
      }
      const saved = await res.json();
      setAulas([saved, ...aulas]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditAula = async (updatedAU: Aula) => {
    try {
      const res = await fetch(`/api/aulas/${updatedAU.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-role': currentRole
        },
        body: JSON.stringify(updatedAU)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao arquivar alterações na chamada.');
      }
      const saved = await res.json();
      setAulas(aulas.map(a => a.id === saved.id ? saved : a));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Wait for token check
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <Sparkles className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <p className="font-mono text-xs animate-pulse">Estabelecendo conexão segura com o ERP Ballet...</p>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!token || !currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7FD] flex flex-col font-sans text-slate-800" id="app-root-shell">
      {/* Top Banner with session switch & database setup */}
      <div className="bg-[#2e0854] text-white border-b-2 border-yellow-400 py-3 px-4 text-xs font-medium flex flex-col lg:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-emerald-600 text-white rounded-lg text-[10px] uppercase font-mono font-extrabold tracking-wider shadow-sm">Auditado</span>
          <span className="text-purple-100">
            Você está logado de forma segura! Se possuir múltiplos papéis, use o comutador ao lado:
          </span>
        </div>
        
        {/* Switch Roles block */}
        <div className="flex items-center gap-3">
          {roles.length > 1 ? (
            <>
              <label className="text-[11px] text-fuchsia-200 font-mono">Papel Ativo:</label>
              <select
                value={currentRole}
                onChange={e => handleSwitchActiveRole(e.target.value as UserRole)}
                className="text-xs bg-purple-900 border-2 border-yellow-400 text-yellow-300 font-extrabold p-1.5 px-3 rounded-lg focus:outline-none cursor-pointer focus:ring-2 focus:ring-rose-400 transition-all shadow-inner"
              >
                {roles.map(r => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="bg-purple-900 border border-purple-800 text-purple-200 p-1.5 px-3 rounded-lg text-xs font-bold uppercase font-mono">
              Papel Único: {currentRole}
            </span>
          )}

          <button
            onClick={handleResetDatabase}
            title="Sincronizar e Resetar Banco"
            className="p-1 px-2.5 bg-[#4c1d95] hover:bg-[#5b21b6] border border-fuchsia-400 text-yellow-300 hover:text-yellow-200 rounded-lg text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Redefinir CRM
          </button>
        </div>
      </div>

      {/* Main ERP Layout Header */}
      <header className="bg-white border-b-2 border-purple-100 py-4 px-6 shadow-3xs flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#8b5cf6] text-white rounded-2xl shadow-sm ring-2 ring-yellow-400">
            <Sparkles className="w-5.5 h-5.5 fill-current" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-fuchsia-600 uppercase font-black">Escola de Dança</span>
            <h1 className="text-xl font-sans font-black tracking-tight text-purple-950 leading-none">ERP Ballet</h1>
          </div>
        </div>

        {/* Informações Atuais */}
        <div className="flex items-center gap-4">
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-2 px-4 shadow-3xs text-xs flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
            <div className="text-right">
              <p className="text-slate-500 text-[11px] leading-normal">
                Usuário: <strong className="text-purple-900 font-bold">{currentUser.nomeCompleto}</strong>
              </p>
              <p className="text-[9px] font-mono text-fuchsia-600 uppercase font-black tracking-wider">
                Perfil: {currentRole}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 p-2 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-3xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Inner body */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6">
        {/* Navigation Sidebar */}
        <nav className="md:w-64 bg-white border border-purple-100 rounded-2xl p-4 py-5 space-y-1.5 shrink-0 shadow-md">
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 block px-3 mb-3 font-bold select-none border-b border-fuchsia-50 pb-2">Módulos Escolares</span>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Painel Operacional</span>
          </button>

          <button
            onClick={() => setActiveTab('contatos')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'contatos'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Contatos CRM (Leads)</span>
          </button>

          <button
            onClick={() => setActiveTab('pessoas')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'pessoas'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Pessoas (Secretaria)</span>
          </button>

          <button
            onClick={() => setActiveTab('turmas')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'turmas'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Turmas & Matrículas</span>
          </button>

          <button
            onClick={() => setActiveTab('aulas')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'aulas'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Diário Escolar (Chamada)</span>
          </button>

          <button
            onClick={() => setActiveTab('planos')}
            className={`w-full text-left p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'planos'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'text-purple-950 hover:bg-fuchsia-50 hover:text-purple-900'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Biblioteca de Planos</span>
          </button>

          {/* Quick Informational block */}
          <div className="pt-4 border-t border-purple-100 mt-6 select-none p-3 bg-yellow-400/10 border-2 border-yellow-400 rounded-2xl">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-purple-950 font-black flex items-center gap-1.5 mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Nível Escolar Ativo
            </h4>
            <p className="text-[11px] text-purple-950/80 font-medium leading-normal">
              {currentRole === 'diretor' && 'Diretor possui nível 9 de acesso master irrestrito, podendo homologar e gerenciar qualquer módulo.'}
              {currentRole === 'coordenador' && 'Coordenador possui nível 7 completo para gerenciar toda a grade pedagógica de Turmas, Aulas e homologar Planos.'}
              {currentRole === 'professor' && 'Professor possui nível 5 focado na criação de planos pedagogicos e chamadas de aulas de suas turmas.'}
              {currentRole === 'atendimento' && 'Atendimento possui nível 3 focado no acolhimento de leads rápidos (CRM) e secretaria geral.'}
              {currentRole === 'administrativo' && 'Administrativo possui nível 8 focado no financeiro master, faturamento de mensalidades de clientes e contratos comerciais.'}
              {currentRole === 'funcionario' && 'Funcionário possui nível 2 com foco em rotinas de suporte operacional mestre.'}
              {['cliente', 'aluno', 'responsavel'].includes(currentRole) && 'Acesso Portal (Modo Visualização Básica do Aluno - Painéis Administrativos bloqueados).'}
            </p>
          </div>
        </nav>

        {/* Central Component Panel */}
        <main className="flex-1 bg-white border border-purple-100 p-4 md:p-6 rounded-2xl shadow-md min-w-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              contatos={contatos}
              pessoas={pessoas}
              turmas={turmas}
              planos={planos}
              aulas={aulas}
              simulatedRole={currentRole}
            />
          )}

          {activeTab === 'contatos' && (
            <ContatoModule
              contatos={contatos}
              pessoas={pessoas}
              onAddContato={handleAddContato}
              onEditContato={handleEditContato}
              onDeleteContato={handleDeleteContato}
              onConvertContato={handleConvertContato}
              simulatedRole={currentRole}
              currentUserName={currentUser.nomeCompleto}
            />
          )}

          {activeTab === 'pessoas' && (
            <PessoaModule
              pessoas={pessoas}
              onAddPessoa={handleAddPessoa}
              onEditPessoa={handleEditPessoa}
              onDeletePessoa={handleDeletePessoa}
              simulatedRole={currentRole}
            />
          )}

          {activeTab === 'turmas' && (
            <TurmaModule
              turmas={turmas}
              pessoas={pessoas}
              onAddTurma={handleAddTurma}
              onEditTurma={handleEditTurma}
              onDeleteTurma={handleDeleteTurma}
              simulatedRole={currentRole}
              currentUserId={currentUser.id}
            />
          )}

          {activeTab === 'aulas' && (
            <AulaModule
              aulas={aulas}
              turmas={turmas}
              planos={planos}
              pessoas={pessoas}
              onAddAula={handleAddAula}
              onEditAula={handleEditAula}
              simulatedRole={currentRole}
              currentUserId={currentUser.id}
              currentUserName={currentUser.nomeCompleto}
            />
          )}

          {activeTab === 'planos' && (
            <PlanoAulaModule
              planos={planos}
              pessoas={pessoas}
              onAddPlano={handleAddPlano}
              onEditPlano={handleEditPlano}
              onApproveRejectPlano={handleApproveRejectPlano}
              simulatedRole={currentRole}
              currentUserId={currentUser.id}
              currentUserName={currentUser.nomeCompleto}
            />
          )}
        </main>
      </div>

      {/* Humildade & Arquitetura Honesta Footer */}
      <footer className="bg-purple-50 border-t-2 border-purple-200/60 py-4 px-6 text-center text-xs text-purple-900 font-mono flex flex-col md:flex-row justify-between items-center gap-3 rounded-b-2xl mt-4">
        <span className="font-semibold">Corporeidade, Arte e Rigor Pedagógico • ERP Ballet MVP 1.0</span>
        <span className="text-purple-750 font-bold bg-yellow-400/20 px-2.5 py-1 rounded-lg border border-yellow-400">Aplicações Acadêmicas Integradas © 2026</span>
      </footer>
    </div>
  );
}
