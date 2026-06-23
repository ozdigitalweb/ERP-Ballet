import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pessoa, UserRole, Relacionamento } from '../types';
import { checkPermission } from '../utils/permissions';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  BookOpen,
  CreditCard,
  Shield,
  ShieldAlert,
  Check,
  X,
  Search,
  Grid,
  List,
  AlertTriangle,
  UserCheck,
  Info,
  DollarSign,
  Briefcase,
  HelpCircle,
  Eye,
  Filter,
  User,
  Heart,
  TrendingUp,
  FileCheck,
  Activity,
  ArrowRight,
  ChevronRight,
  Compass
} from 'lucide-react';

interface PessoaModuleProps {
  pessoas: Pessoa[];
  onAddPessoa: (pessoa: Omit<Pessoa, 'id'>) => void;
  onEditPessoa: (pessoa: Pessoa) => void;
  onDeletePessoa: (id: string) => void;
  simulatedRole: UserRole;
}

export default function PessoaModule({
  pessoas,
  onAddPessoa,
  onEditPessoa,
  onDeletePessoa,
  simulatedRole
}: PessoaModuleProps) {
  // Navigation & View Toggles
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterRole, setFilterRole] = useState<'todos' | UserRole>('todos');
  const [filterCompliance, setFilterCompliance] = useState<'todos' | 'conformes' | 'pendentes'>('todos');
  const [search, setSearch] = useState('');

  // Selected Person for the Detail View Modal
  const [selectedPessoa, setSelectedPessoa] = useState<Pessoa | null>(null);

  // Form Tabs State
  const [formTab, setFormTab] = useState<'basic' | 'roles' | 'relations'>('basic');

  // Form Fields State
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [gSelectedPerfis, setGSelectedPerfis] = useState<UserRole[]>(['aluno']);
  const [contratoAtivo, setContratoAtivo] = useState(true);
  const [saldoCredito, setSaldoCredito] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Form Relationships State
  const [relations, setRelations] = useState<Relacionamento[]>([]);
  const [selRelTipo, setSelRelTipo] = useState<'cliente' | 'responsavel' | 'aluno' | 'visitante'>('cliente');
  const [selRelTarget, setSelRelTarget] = useState('');

  // Notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permWarning, setPermWarning] = useState<string | null>(null);

  // Compute school stats metrics
  const totalInRegistry = pessoas.length;
  const activeStudents = pessoas.filter(p => p.perfis.includes('aluno') && p.contratoAtivo).length;
  const totalPayerClients = pessoas.filter(p => p.perfis.includes('cliente')).length;
  const totalStaff = pessoas.filter(p => 
    p.perfis.includes('professor') || 
    p.perfis.includes('coordenador') || 
    p.perfis.includes('administrativo') || 
    p.perfis.includes('atendimento')
  ).length;

  // Calculate quick compliance indicators
  const complianceStats = pessoas.reduce(
    (acc, p) => {
      if (!p.perfis.includes('aluno')) return acc;
      const hasCliente = p.relacionamentos?.some(r => r.tipo === 'cliente') || p.perfis.includes('cliente');
      const hasResponsavel = p.relacionamentos?.some(r => r.tipo === 'responsavel') || p.perfis.includes('responsavel');
      if (hasCliente && hasResponsavel) {
        acc.conformes += 1;
      } else {
        acc.pendentes += 1;
      }
      return acc;
    },
    { conformes: 0, pendentes: 0 }
  );

  const resetForm = () => {
    setCpf('');
    setEmail('');
    setNomeCompleto('');
    setGSelectedPerfis(['aluno']);
    setContratoAtivo(true);
    setSaldoCredito(0);
    setObservacoes('');
    setRelations([]);
    setEditingId(null);
    setErrorMsg(null);
    setFormTab('basic');
  };

  const verifyAction = (action: 'criar' | 'editar_todos' | 'vincular_perfis' | 'deletar'): boolean => {
    const verdict = checkPermission(simulatedRole, 'pessoa', action);
    if (!verdict.allowed) {
      setPermWarning(verdict.reason || 'Ação restrita no perfil ativo de simulação.');
      setTimeout(() => setPermWarning(null), 5000);
      return false;
    }
    return true;
  };

  const handleAddRelation = () => {
    if (!selRelTarget) return;
    if (relations.some(r => r.targetId === selRelTarget && r.tipo === selRelTipo)) {
      setErrorMsg('Este vínculo com o tipo selecionado já foi adicionado para esta pessoa.');
      return;
    }
    setRelations([...relations, { tipo: selRelTipo, targetId: selRelTarget }]);
    setErrorMsg(null);
  };

  const handleRemoveRelation = (idx: number) => {
    setRelations(relations.filter((_, i) => i !== idx));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeCompleto.trim() || !cpf.trim() || !email.trim()) {
      setErrorMsg('Preencha os campos obrigatórios na aba de Dados Identificadores (Nome Completo, CPF e E-mail mestre).');
      setFormTab('basic');
      return;
    }

    // CPF & E-mail Duplicity checks (RN-PESS-001)
    const duplicateCPF = pessoas.some(p => p.cpf === cpf.trim() && p.id !== editingId);
    const duplicateEmail = pessoas.some(p => p.email.toLowerCase() === email.trim().toLowerCase() && p.id !== editingId);

    if (duplicateCPF) {
      setErrorMsg('RN-PESS-001: Já existe um registro ativo cadastrado com este CPF no banco.');
      setFormTab('basic');
      return;
    }
    if (duplicateEmail) {
      setErrorMsg('RN-PESS-001: Já existe um registro ativo cadastrado com este endereço de E-mail.');
      setFormTab('basic');
      return;
    }

    // Student Constraint check (RN-PESS-003 / RF-PESS-002)
    const hasAlunoProfile = gSelectedPerfis.includes('aluno');
    if (hasAlunoProfile) {
      const hasCliente = relations.some(r => r.tipo === 'cliente') || gSelectedPerfis.includes('cliente');
      const hasResponsavel = relations.some(r => r.tipo === 'responsavel') || gSelectedPerfis.includes('responsavel');
      
      if (!hasCliente) {
        setErrorMsg('RN-PESS-003: Alunos precisam obrigatoriamente de um Cliente/Pagador (financeiro) associado nos Relacionamentos de Matrícula.');
        setFormTab('relations');
        return;
      }
      if (!hasResponsavel) {
        setErrorMsg('RN-PESS-003: Alunos precisam obrigatoriamente de pelo menos um Responsável Legal cadastrado.');
        setFormTab('relations');
        return;
      }
    }

    if (editingId) {
      if (!verifyAction('editar_todos')) return;
      onEditPessoa({
        id: editingId,
        cpf: cpf.trim(),
        email: email.trim(),
        nomeCompleto: nomeCompleto.trim(),
        perfis: gSelectedPerfis,
        relacionamentos: relations,
        contratoAtivo,
        saldoCredito,
        observacoes: observacoes.trim()
      });
    } else {
      if (!verifyAction('criar')) return;
      onAddPessoa({
        cpf: cpf.trim(),
        email: email.trim(),
        nomeCompleto: nomeCompleto.trim(),
        perfis: gSelectedPerfis,
        relacionamentos: relations,
        contratoAtivo,
        saldoCredito,
        observacoes: observacoes.trim()
      });
    }

    setShowForm(false);
    resetForm();
  };

  const handleStartEdit = (pessoa: Pessoa) => {
    const isEditingAllowed = checkPermission(simulatedRole, 'pessoa', 'editar_todos').allowed ||
                             checkPermission(simulatedRole, 'pessoa', 'editar_proprio').allowed;
    if (!isEditingAllowed) {
      setPermWarning('Seu perfil de acesso ativo impede a edição direta das fichas de secretaria (RN-PESS-001).');
      setTimeout(() => setPermWarning(null), 4000);
      return;
    }

    setEditingId(pessoa.id);
    setCpf(pessoa.cpf);
    setEmail(pessoa.email);
    setNomeCompleto(pessoa.nomeCompleto);
    setGSelectedPerfis(pessoa.perfis);
    setContratoAtivo(pessoa.contratoAtivo);
    setSaldoCredito(pessoa.saldoCredito || 0);
    setObservacoes(pessoa.observacoes || '');
    setRelations(pessoa.relacionamentos || []);
    setFormTab('basic');
    setShowForm(true);
    
    // Auto-scroll to form view smoothly
    document.getElementById('pessoa-module-header')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDelete = (id: string, name: string) => {
    if (!verifyAction('deletar')) return;
    if (confirm(`Atenção: A remoção de "${name}" do núcleo de PESSOAS afetará chamadas, convênios, faturamentos e históricos acadêmicos. Confirmar operação?`)) {
      onDeletePessoa(id);
      if (selectedPessoa?.id === id) {
        setSelectedPessoa(null);
      }
    }
  };

  const togglePerfil = (perf: UserRole) => {
    if (gSelectedPerfis.includes(perf)) {
      if (gSelectedPerfis.length > 1) {
        setGSelectedPerfis(gSelectedPerfis.filter(p => p !== perf));
      }
    } else {
      setGSelectedPerfis([...gSelectedPerfis, perf]);
    }
  };

  const getPessoaName = (id: string) => {
    return pessoas.find(p => p.id === id)?.nomeCompleto || 'Membro Não Encontrado';
  };

  // Helper calculation to verify family/financial conformity (RN-PESS-003)
  const checkComplianceStatus = (p: Pessoa) => {
    if (!p.perfis.includes('aluno')) return { ok: true, msg: 'Conforme (Não é Aluno)' };
    
    const hasCliente = p.relacionamentos?.some(r => r.tipo === 'cliente') || p.perfis.includes('cliente');
    const hasResponsavel = p.relacionamentos?.some(r => r.tipo === 'responsavel') || p.perfis.includes('responsavel');
    
    if (hasCliente && hasResponsavel) {
      return { ok: true, msg: 'Matrícula & Vínculos Conformantes' };
    }
    
    const errorsList = [];
    if (!hasCliente) errorsList.push('Falta Cliente Pagador');
    if (!hasResponsavel) errorsList.push('Falta Responsável Legal');
    return { ok: false, msg: errorsList.join(' e ') };
  };

  // Comprehensive sorting & filtering criteria
  const filteredPessoas = pessoas.filter(p => {
    const matchesRole = filterRole === 'todos' || p.perfis.includes(filterRole);
    const matchesSearch = p.nomeCompleto.toLowerCase().includes(search.toLowerCase()) ||
                          p.cpf.includes(search) ||
                          p.email.toLowerCase().includes(search.toLowerCase());
    
    const compliance = checkComplianceStatus(p);
    let matchesCompliance = true;
    if (filterCompliance === 'conformes') {
      matchesCompliance = compliance.ok;
    } else if (filterCompliance === 'pendentes') {
      matchesCompliance = !compliance.ok;
    }

    return matchesRole && matchesSearch && matchesCompliance;
  });

  return (
    <div className="space-y-6" id="pessoa-module">
      
      {/* Visual Header Panel with high-contrast text and premium badge styling */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl" id="pessoa-module-header">
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[20%] w-60 h-60 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-[10px] uppercase font-mono font-extrabold tracking-widest bg-yellow-400 text-purple-950 rounded-lg shadow-sm">
                Secretaria Unificada
              </span>
              <span className="p-1 px-2 text-[10px] uppercase font-mono font-bold tracking-widest bg-white/10 text-purple-200 rounded-lg">
                MVP Escola
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-sans font-black tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-purple-800/80 border border-purple-500/30 text-yellow-300 rounded-2xl shadow-inner">
                <Users className="w-7 h-7" />
              </span>
              Cadastro de Alunos & Secretaria
            </h1>
            <p className="text-purple-250 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Gestão mestre de fichas cadastrais, papéis escolares cumulativos e compliance de relações financeiras de contratos ativos e dependentes do ERP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => {
                if (showForm) {
                  resetForm();
                  setShowForm(false);
                } else {
                  resetForm();
                  setShowForm(true);
                }
              }}
              className={`font-extrabold text-xs px-5 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                showForm 
                  ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-200' 
                  : 'bg-yellow-400 hover:bg-yellow-300 text-purple-950 font-black relative overflow-hidden transition-all duration-300 transform active:scale-95'
              }`}
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4 shrink-0" />
                  <span>Cancelar Formulário</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Cadastrar Nova Pessoa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modern KPI Cards Grid with custom hover scales and premium color markers */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white border border-purple-100 p-4.5 rounded-2xl shadow-3xs flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total no Banco</p>
            <h3 className="text-2xl font-sans font-black text-purple-950 mt-0.5">{totalInRegistry}</h3>
            <p className="text-[9px] text-slate-500 mt-1">Registros únicos</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-4.5 rounded-2xl shadow-3xs flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Alunos Ativos</p>
            <h3 className="text-2xl font-sans font-black text-rose-950 mt-0.5">{activeStudents}</h3>
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">Contrato Vigente</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-4.5 rounded-2xl shadow-3xs flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Clientes Pagadores</p>
            <h3 className="text-2xl font-sans font-black text-indigo-950 mt-0.5">{totalPayerClients}</h3>
            <p className="text-[9px] text-slate-500 mt-1">Fórum Financeiro</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-4.5 rounded-2xl shadow-3xs flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Alunos Conformes</p>
            <h3 className="text-2xl font-sans font-black text-emerald-950 mt-0.5">{complianceStats.conformes}</h3>
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">Vínculos Verificados</p>
          </div>
        </div>

        <div className="bg-white border border-purple-100 p-4.5 rounded-2xl shadow-3xs flex items-center gap-4 transition-all hover:scale-[1.02] hover:shadow-md col-span-2 lg:col-span-1">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Pendências Cadastrais</p>
            <h3 className="text-2xl font-sans font-black text-amber-950 mt-0.5">{complianceStats.pendentes}</h3>
            <p className="text-[9px] text-amber-700 font-semibold mt-1">Requer atenção mestre</p>
          </div>
        </div>

      </div>

      {/* Permission limit warning system */}
      {permWarning && (
        <div className="p-4.5 bg-rose-50 border-2 border-rose-100 text-rose-950 text-xs rounded-2xl flex items-center gap-3 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-extrabold uppercase text-[10px] tracking-wide text-rose-800">Ação Negada (Controle de Níveis)</p>
            <p className="text-rose-900/80 font-medium">{permWarning}</p>
          </div>
        </div>
      )}

      {/* Custom sliding registration/editing portal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="bg-white border-2 border-purple-200 rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Header section with gradient line strip */}
            <div className="bg-[#FAF7FD] px-6 py-5 border-b border-purple-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-800 via-yellow-400 to-indigo-800" />
              <div>
                <span className="text-[9px] font-mono font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded">
                  {editingId ? 'Mudar Dados Registrados' : 'Novo Registro Mestre'}
                </span>
                <h2 className="text-base font-sans font-black text-purple-950 mt-1 flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Edit2 className="w-5 h-5 text-purple-700" />
                      <span>Ficha de Secretaria • {nomeCompleto}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-purple-750" />
                      <span>Novo Cadastro Escolar Unificado</span>
                    </>
                  )}
                </h2>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-1.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                Voltar
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-4 bg-pink-50 border border-pink-200 text-pink-950 text-xs rounded-2xl font-bold flex items-center gap-3 animate-shake">
                <AlertTriangle className="w-5 h-5 text-pink-600 shrink-0" />
                <div className="space-y-0.5">
                  <p className="uppercase text-[9px] font-mono tracking-wider font-black text-pink-700">Impossível Salvar Ficha</p>
                  <p className="font-medium text-pink-900">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              {/* Premium Inline Form tab switch */}
              <div className="flex flex-wrap border-b border-slate-100 pb-px gap-2">
                <button
                  type="button"
                  onClick={() => setFormTab('basic')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    formTab === 'basic' 
                      ? 'border-purple-800 text-purple-950 font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  1. Dados Identificadores
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('roles')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    formTab === 'roles' 
                      ? 'border-purple-800 text-purple-950 font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  2. Atribuição de Perfis e Finanças
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('relations')}
                  className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    formTab === 'relations' 
                      ? 'border-purple-800 text-purple-950 font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  3. Relacionamentos Familiares / Vínculos
                </button>
              </div>

              {/* TAB 1: IDENTIFICADORES */}
              {formTab === 'basic' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome Completo *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400"><User className="w-4 h-4" /></span>
                        <input
                          type="text"
                          required
                          value={nomeCompleto}
                          onChange={e => setNomeCompleto(e.target.value)}
                          placeholder="Nome e Sobrenome"
                          className="w-full text-xs font-semibold pl-10 border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Como constará nos contratos e diários.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Inscrição CPF *</label>
                      <input
                        type="text"
                        required
                        value={cpf}
                        onChange={e => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Validação única contra fraudes no faturamento.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail Principal *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="exemplo@escoladeballet.com"
                        className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Será usado como credencial de acesso.</p>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Contratual Vigente</label>
                      <select
                        value={contratoAtivo ? 'sim' : 'nao'}
                        onChange={e => setContratoAtivo(e.target.value === 'sim')}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                      >
                        <option value="sim">Contrato Vigente Matrícula Ativada / Acesso Disponibilizado</option>
                        <option value="nao">Inativo / Desligado / Sem Contrato Ativo</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Alunos inativos perdem assento nas turmas.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Canal de Origem de Captação (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Google Ads, Instagram Orgânico, Indicação de Aluno"
                        className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Estatística valiosa para o marketing da escola.</p>
                    </div>

                  </div>

                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-3 text-xs text-purple-950">
                    <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-purple-900 text-[11px]">Criação Automática de Acesso do Usuário:</p>
                      <p className="text-purple-950/80 leading-normal">
                        O e-mail preenchido servirá para o aluno ou staff realizar o login no sistema. Por padrão para homologações do MVP, a senha provisória de testes cadastrada para novos e-mails é <code>senha123</code>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATRIBUIÇÕES E FINANÇAS */}
              {formTab === 'roles' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  
                  <div>
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-slate-750">
                        Atribuições de Papéis na Escola (Cumulativo)
                      </label>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Selecione as frentes de atuação acadêmicas e comerciais deste membro no ERP.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {(['aluno', 'cliente', 'responsavel', 'professor', 'coordenador', 'atendimento', 'administrativo', 'funcionario', 'visitante'] as const).map(pRole => {
                        const hasRole = gSelectedPerfis.includes(pRole);
                        return (
                          <button
                            key={pRole}
                            type="button"
                            onClick={() => togglePerfil(pRole)}
                            className={`text-xs px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              hasRole
                                ? 'bg-purple-950 border-purple-950 text-white font-extrabold shadow-md transform translate-y-[-1px]'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                            }`}
                          >
                            <span className="capitalize">{pRole}</span>
                            {hasRole ? (
                              <span className="p-1 bg-yellow-400 text-purple-950 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <div className="w-4.5 h-4.5 rounded-full border border-slate-250 bg-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-[#FAF7FD] border border-purple-100 rounded-3xl">
                    
                    <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-purple-950 mb-1.5 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>Saldo de Crédito Próprio (R$)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          value={saldoCredito}
                          onChange={e => setSaldoCredito(Number(e.target.value))}
                          placeholder="0,00"
                          className="w-full text-xs font-bold border border-purple-200 rounded-xl p-2.5 pl-9 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Disponível para abatimento de mensalidades.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-750 mb-1.5">
                        Laudos de Saúde, Restrições ou Observações Críticas de Acompanhamento
                      </label>
                      <textarea
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        rows={3}
                        placeholder="Ex: Alérgico a látex; histórico de asma severa; necessita uso de sapatilhas ortopédicas de camurça..."
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Este dado será exibido no diário de classe do professor.</p>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: RELACIONAMENTOS */}
              {formTab === 'relations' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="p-5 bg-yellow-400/5 border-2 border-dashed border-yellow-400/30 rounded-3xl space-y-4">
                    
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-purple-800 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="text-xs font-black uppercase text-purple-900 tracking-wider block">
                          Gestão de Compliance Familiar e Faturamento (RN-PESS-003):
                        </strong>
                        <p className="text-slate-600 text-xs leading-normal">
                          Como premissa institucional, todo cadastro mestre rotulado como <strong>Aluno</strong> necessita ter apontados o **Cliente Pagador** (quem assina a adimplência financeira do contrato) e o **Responsável Legal** (quem possui autorização legal e de segurança para retirar a criança).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-purple-100/30">
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">
                          Novo Vínculo Familiar de Papel:
                        </label>
                        <select
                          value={selRelTipo}
                          onChange={e => setSelRelTipo(e.target.value as any)}
                          className="w-full text-xs font-bold border border-slate-200 bg-white rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="cliente">Cliente (Financeiro Pagador)</option>
                          <option value="responsavel">Responsável Legal autorizado</option>
                          <option value="aluno">Aluno dependente deste membro</option>
                          <option value="visitante">Visitante Vinculado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">
                          Membro Cadastrado no ERP:
                        </label>
                        <select
                          value={selRelTarget}
                          onChange={e => setSelRelTarget(e.target.value)}
                          className="w-full text-xs font-medium border border-slate-200 bg-white rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="">-- Escolher pessoa do ERP --</option>
                          {pessoas
                            .filter(p => p.id !== editingId)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nomeCompleto} ({p.cpf} - {p.perfis.join(', ')})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddRelation}
                          className="w-full bg-purple-950 hover:bg-purple-900 text-white text-xs py-2.5 px-4 rounded-xl font-bold cursor-pointer transition-all shadow-sm active:scale-95"
                        >
                          Confirmar Vínculo
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block mb-2">
                        Lista de Vínculos Registrados nesta Ficha:
                      </span>
                      {relations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {relations.map((rel, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs bg-white border border-purple-200 p-2.5 px-4 rounded-2xl text-slate-800 shadow-3xs">
                              <span className="p-1 px-2.5 bg-purple-100 text-purple-950 rounded-lg font-black text-[9px] uppercase tracking-wider">
                                {rel.tipo}
                              </span>
                              <span className="font-extrabold text-slate-700">{getPessoaName(rel.targetId)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRelation(idx)}
                                className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer hover:bg-rose-50 p-1 rounded-full text-xs transition-colors"
                                title="Desvincular relação"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Preencha o formulário acima para associar os responsáveis financeiros e legais necessários.</p>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* SAVING PANEL FOOTER */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-5 border-t border-slate-100 gap-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-bold"
                >
                  Limpar todo o formulário
                </button>
                
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {formTab !== 'relations' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'basic' ? 'roles' : 'relations')}
                      className="border-2 border-purple-100 hover:bg-purple-50 text-purple-900 px-5 py-2.5 rounded-xl cursor-pointer font-bold text-xs w-full sm:w-auto text-center"
                    >
                      Próxima Etapa →
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    className="bg-purple-950 hover:bg-purple-900 text-white font-black px-6 py-2.5 rounded-xl shadow-md cursor-pointer transition-all w-full sm:w-auto text-xs flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 shrink-0 text-yellow-300" />
                    <span>{editingId ? 'Salvar Ficha Atualizada' : 'Confirmar & Criar Ficha'}</span>
                  </button>
                </div>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filter, Search layout, Category Pill selection panel */}
      <div className="p-5 bg-white border border-purple-100/80 rounded-3xl shadow-xs space-y-4">
        
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
          
          {/* List display visualizer comands */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Compass className="w-4 h-4" />
              <span>Layout de Exibição:</span>
            </span>

            <div className="inline-flex bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 px-4 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white text-purple-950 shadow-3xs border border-purple-100' 
                    : 'text-slate-500 opacity-70 hover:opacity-100'
                }`}
                title="Visualização em Grade Mosaico"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Mosaico</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 px-4 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-white text-purple-950 shadow-3xs border border-purple-100' 
                    : 'text-slate-500 opacity-70 hover:opacity-100'
                }`}
                title="Panorâmica Compacta"
              >
                <List className="w-3.5 h-3.5" />
                <span>Panorâmica (Tabela)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 xl:max-w-3xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4.5 h-4.5 text-purple-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Busca rápida por nome, CPF ou correspondência de e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-11 pr-4 py-3.5 border border-purple-100 focus:border-purple-400 rounded-xl focus:outline-none bg-[#FAF7FD] focus:bg-white transition-all font-semibold text-purple-950 shadow-3xs placeholder-purple-300"
              />
            </div>

            {/* Compliance Filter Status */}
            <div className="relative shrink-0 select-none">
              <select
                value={filterCompliance}
                onChange={e => setFilterCompliance(e.target.value as any)}
                className="w-full sm:w-auto text-xs font-bold border border-purple-100 bg-[#FAF7FD] hover:bg-white p-3 px-4 rounded-xl focus:outline-none cursor-pointer transition-all"
              >
                <option value="todos">Todos os Compliance (RN-PESS-003)</option>
                <option value="conformes">Apenas Conformantes</option>
                <option value="pendentes">Apenas com Pendência Familiar</option>
              </select>
            </div>
          </div>

        </div>

        {/* Roles Quick-filter Pill tags with beautiful colored active state */}
        <div className="pt-4 border-t border-purple-50 flex flex-col md:flex-row items-start md:items-center gap-3">
          <span className="text-[10px] font-mono font-black text-purple-950 uppercase tracking-widest flex items-center gap-1.5 py-1">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>Papel Ativo no ERP:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(['todos', 'aluno', 'cliente', 'responsavel', 'professor', 'coordenador', 'administrativo', 'atendimento', 'funcionario'] as const).map(role => {
              const isActive = filterRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`text-[11px] px-3 py-1.5 rounded-xl font-bold capitalize transition-all border cursor-pointer select-none ${
                    isActive
                      ? 'bg-purple-950 border-purple-950 text-yellow-300 font-extrabold shadow-sm'
                      : 'bg-white border-purple-100 text-purple-955 hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  {role === 'todos' ? 'Ver Todos' : role}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Main Container Directory display listing */}
      <AnimatePresence mode="popLayout">
        
        {/* VIEW 1: ADVANCED GRID CARDS LAYOUT */}
        {viewMode === 'grid' ? (
          <motion.div
            key="grid-pane"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredPessoas.length > 0 ? (
              filteredPessoas.map(p => {
                const compliance = checkComplianceStatus(p);
                const hasComplianceError = p.perfis.includes('aluno') && !compliance.ok;
                return (
                  <div
                    key={p.id}
                    className={`bg-white border-2 rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group relative ${
                      hasComplianceError 
                        ? 'border-pink-200/80 bg-pink-50/5 hover:border-pink-300' 
                        : 'border-purple-100 hover:border-purple-300'
                    }`}
                  >
                    <div className="space-y-4">
                      
                      {/* Avatar design and basic identification header */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-950 to-indigo-900 border-2 border-purple-100 flex items-center justify-center text-yellow-300 font-black text-base shrink-0 uppercase select-none shadow-sm">
                          {p.nomeCompleto.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <h3 className="font-sans font-black text-purple-950 text-sm sm:text-base tracking-tight leading-snug group-hover:text-purple-800 transition-colors truncate">
                            {p.nomeCompleto}
                          </h3>
                          <p className="text-[10px] font-bold font-mono text-slate-400 mt-1 uppercase tracking-wider">
                            CPF {p.cpf}
                          </p>
                        </div>
                        
                        {/* Status Toggle badge */}
                        <span className={`text-[9px] uppercase font-mono font-extrabold px-2.5 py-1 rounded-lg border leading-none shrink-0 cursor-default shadow-3xs select-none ${
                          p.contratoAtivo 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {p.contratoAtivo ? 'Matrícula Ativa' : 'Desativado'}
                        </span>
                      </div>

                      {/* Cumulative role badge section */}
                      <div className="flex flex-wrap gap-1">
                        {p.perfis.map(pf => (
                          <span
                            key={pf}
                            className="text-[9px] uppercase tracking-wider font-extrabold bg-[#2e0854]/5 text-[#2e0854] px-2 py-0.8 rounded-lg border border-[#2e0854]/10 flex items-center gap-1 select-none"
                          >
                            {pf === 'aluno' && <UserCheck className="w-3 h-3 text-purple-800" />}
                            {pf === 'professor' && <BookOpen className="w-3 h-3 text-purple-700" />}
                            {pf === 'cliente' && <DollarSign className="w-3 h-3 text-emerald-700" />}
                            {pf === 'coordenador' && <Shield className="w-3 h-3 text-indigo-700" />}
                            {!['aluno', 'professor', 'cliente', 'coordenador'].includes(pf) && <Users className="w-3 h-3 text-slate-500" />}
                            <span>{pf}</span>
                          </span>
                        ))}
                      </div>

                      {/* Info Panel Details */}
                      <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
                        <div>
                          <p className="text-slate-400 font-mono text-[9px] uppercase font-bold tracking-widest mb-0.5">E-mail de Cadastro / Login:</p>
                          <p className="text-purple-950 font-bold select-all truncate">{p.email}</p>
                        </div>

                        {/* financial statistics information */}
                        {p.perfis.includes('cliente') && (
                          <div className="bg-emerald-50/50 border border-emerald-200 text-xs rounded-xl p-2.5 px-3 flex items-center justify-between font-bold text-emerald-950">
                            <span className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-wider text-emerald-800">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Saldo Comercial:</span>
                            </span>
                            <span className="font-mono text-emerald-800 font-extrabold text-sm">
                              R$ {(p.saldoCredito ?? 0).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* List family relationships visually */}
                        {p.relacionamentos && p.relacionamentos.length > 0 ? (
                          <div className="space-y-1 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                            <span className="text-[9px] font-bold font-mono text-purple-800 uppercase tracking-widest block mb-1">
                              Relações Estipuladas:
                            </span>
                            <div className="flex flex-col gap-1.5">
                              {p.relacionamentos.map((rel, idx) => (
                                <div key={idx} className="text-[11px] flex items-center gap-2 text-slate-700 capitalize">
                                  <span className="font-extrabold bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded-md text-[8px] uppercase font-mono select-none">
                                    {rel.tipo}
                                  </span>
                                  <span className="truncate font-bold text-slate-800">{getPessoaName(rel.targetId)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : p.perfis.includes('aluno') ? (
                          <div className="p-3 border border-pink-200 bg-pink-100/30 rounded-2xl text-[10px] text-pink-900 font-semibold flex items-start gap-2 leading-snug">
                            <AlertTriangle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                            <div>
                              <span>Ausência de Vínculos Mandatórios (RN-PESS-003). Por favor, associe responsáveis na aba Relacionamentos.</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Medical or internal specifications */}
                        {p.observacoes && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-500 italic max-h-16 overflow-y-auto leading-normal">
                            "{p.observacoes}"
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Card Actions Footer block */}
                    <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-auto">
                      
                      {/* Academical compliance status label */}
                      {p.perfis.includes('aluno') && (
                        <div className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 font-bold select-none ${
                          compliance.ok 
                            ? 'bg-emerald-50/70 text-emerald-950 border-emerald-250' 
                            : 'bg-rose-50/70 text-rose-955 border-rose-250 animate-pulse'
                        }`}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${compliance.ok ? 'bg-emerald-600' : 'bg-rose-600 animate-ping'}`} />
                          <span className="uppercase text-[9px] font-mono tracking-wider">{compliance.msg}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        <button
                          onClick={() => setSelectedPessoa(p)}
                          className="text-slate-600 hover:text-purple-900 font-bold text-xs p-2 px-3 rounded-xl hover:bg-purple-50 flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ficha</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="bg-purple-100 hover:bg-purple-950 text-purple-900 hover:text-white font-black p-2 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          
                          <button
                            onClick={() => handleDelete(p.id, p.nomeCompleto)}
                            className="text-rose-500 hover:bg-rose-100 border border-slate-100 hover:border-rose-200 p-2 rounded-xl transition-all font-bold cursor-pointer"
                            title="Remover Cadastro Mestre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })
            ) : (
              <div className="col-span-1 md:col-span-3 text-center py-16 text-slate-400 text-xs bg-white border border-slate-100 rounded-3xl p-6">
                <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-550">Nenhum registro localizado no sistema</p>
                <p className="text-slate-400 text-[11px] mt-1">Experimente alterar os critérios de busca ou filtros de papel ativos.</p>
              </div>
            )}
          </motion.div>
        ) : (
          
          /* VIEW 2: PREMIUM HIGH-CONTRAST SPREADSHEET LAYOUT */
          <motion.div
            key="table-pane"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white border border-purple-100 rounded-3xl shadow-xs overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7FD] text-purple-950 font-black uppercase tracking-widest font-mono border-b border-purple-100 text-[10px]">
                    <th className="py-4.5 px-5">Membro / Secretaria</th>
                    <th className="py-4.5 px-5 select-none">Inscrição CPF</th>
                    <th className="py-4.5 px-5 select-none font-sans">E-mail (Login)</th>
                    <th className="py-4.5 px-5">Papéis Cumulativos</th>
                    <th className="py-4.5 px-5">Comercial / Crédito</th>
                    <th className="py-4.5 px-5">Compliance RN-PESS-003</th>
                    <th className="py-4.5 px-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPessoas.length > 0 ? (
                    filteredPessoas.map(p => {
                      const compliance = checkComplianceStatus(p);
                      return (
                        <tr key={p.id} className="hover:bg-[#FAF7FD]/40 transition-colors group">
                          <td className="py-4 px-5">
                            <span className="font-black text-purple-950 block group-hover:text-purple-850 transition-colors">
                              {p.nomeCompleto}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">ID: {p.id}</span>
                          </td>
                          <td className="py-4 px-5 font-mono font-bold text-slate-650">
                            {p.cpf}
                          </td>
                          <td className="py-4 px-5 text-slate-600 font-semibold select-all font-sans">
                            {p.email}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1">
                              {p.perfis.map(pf => (
                                <span key={pf} className="text-[9px] uppercase font-black bg-purple-50 text-purple-950 px-2 py-0.5 rounded-lg border border-purple-100 select-none">
                                  {pf}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {p.perfis.includes('cliente') ? (
                              <span className="font-mono text-emerald-800 font-black text-sm">
                                R$ {(p.saldoCredito ?? 0).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-mono">-</span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            {p.perfis.includes('aluno') ? (
                              <span className={`inline-flex px-2.5 py-1 rounded-full border text-[9px] font-black uppercase shadow-3xs leading-none ${
                                compliance.ok 
                                  ? 'bg-emerald-50 text-emerald-805 border-emerald-150' 
                                  : 'bg-rose-50 text-rose-805 border-rose-150'
                              }`}>
                                {compliance.ok ? '✓ Conforme' : '⚠️ Pendente'}
                              </span>
                            ) : (
                              <span className="text-slate-350 italic text-[11px]">Isento</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPessoa(p)}
                                className="p-1 px-2.5 text-[11px] bg-slate-50 hover:bg-purple-100 text-purple-900 border border-slate-200 hover:border-purple-200 rounded-lg transition-colors font-bold cursor-pointer"
                                title="Visualizar Ficha Completa"
                              >
                                Ficha
                              </button>
                              
                              <button
                                onClick={() => handleStartEdit(p)}
                                className="p-1 px-2.5 text-[11px] bg-purple-100 hover:bg-purple-950 hover:text-white rounded-lg transition-all font-black cursor-pointer text-purple-950"
                                title="Editar Cadastro"
                              >
                                Editar
                              </button>
                              
                              <button
                                onClick={() => handleDelete(p.id, p.nomeCompleto)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Excluir do Núcleo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400 italic">
                        Nenhum registro mestre corresponde aos critérios de busca ativos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        
      </AnimatePresence>

      {/* DETAIL MODAL / SIDEBAR DRAWER VIEW */}
      <AnimatePresence>
        {selectedPessoa && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-950/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-purple-100 max-w-2xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#2e0854] text-white p-6 relative">
                <div className="z-10 relative flex justify-between items-start">
                  <div>
                    <span className="p-1 px-2 text-[9px] uppercase font-mono font-black bg-yellow-400 text-purple-950 rounded-md">
                      Ficha de Registro Completa
                    </span>
                    <h3 className="text-lg sm:text-xl font-sans font-black tracking-tight mt-1.5">
                      {selectedPessoa.nomeCompleto}
                    </h3>
                    <p className="text-purple-200 text-xs mt-0.5 font-mono">ID Sistema: {selectedPessoa.id}</p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedPessoa(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Background ambient badge */}
                <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none select-none">
                  <span className="text-7xl font-sans font-black">ERP</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                
                {/* Visual grid specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Inscrição CPF</span>
                    <p className="font-mono text-purple-950 font-black text-sm">{selectedPessoa.cpf}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Acesso E-mail Principal</span>
                    <p className="font-semibold text-slate-750 text-sm select-all">{selectedPessoa.email}</p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Status de Contrato</span>
                    <div className="pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black uppercase rounded-lg border ${
                        selectedPessoa.contratoAtivo 
                          ? 'bg-emerald-50 text-emerald-805 border-emerald-250' 
                          : 'bg-rose-50 text-rose-805 border-rose-250'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedPessoa.contratoAtivo ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{selectedPessoa.contratoAtivo ? 'Vigente & Ativo' : 'Pendente / Inativo'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Saldo em Conta</span>
                    {selectedPessoa.perfis.includes('cliente') ? (
                      <p className="font-mono text-emerald-850 font-black text-base">R$ {(selectedPessoa.saldoCredito ?? 0).toFixed(2)}</p>
                    ) : (
                      <p className="text-slate-400 italic text-[11px] pt-1">Isento de Crédito Próprio</p>
                    )}
                  </div>
                </div>

                {/* Profiles row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Grupos / Perfis de Atuação:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPessoa.perfis.map(pf => (
                      <span key={pf} className="text-xs font-bold uppercase tracking-wide bg-purple-50 text-purple-950 border border-purple-150 p-2 px-3 rounded-xl select-none">
                        {pf}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Relation listing panel */}
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-purple-950 uppercase tracking-wider block">
                      Compliance de Relações Vinculadas (RN-PESS-003)
                    </span>
                    
                    {selectedPessoa.perfis.includes('aluno') && (
                      <span className={`text-[10px] px-2.5 py-0.5 font-black uppercase border rounded-md ${
                        checkComplianceStatus(selectedPessoa).ok 
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-300' 
                          : 'bg-rose-100 text-rose-955 border-rose-300'
                      }`}>
                        {checkComplianceStatus(selectedPessoa).ok ? 'Conforme' : 'Incompleto'}
                      </span>
                    )}
                  </div>

                  {selectedPessoa.relacionamentos && selectedPessoa.relacionamentos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedPessoa.relacionamentos.map((rel, idx) => (
                        <div key={idx} className="bg-white border border-purple-200 p-2.5 rounded-xl flex items-center gap-2">
                          <span className="p-1 px-2.5 bg-purple-50 text-purple-700 font-extrabold text-[9px] uppercase tracking-wider rounded-md">
                            {rel.tipo}
                          </span>
                          <span className="font-extrabold text-slate-700 truncate">{getPessoaName(rel.targetId)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nenhum relacionamento ou dependente adicionado a esta pessoa no core administrativo.</p>
                  )}
                </div>

                {/* Notes or warnings */}
                {selectedPessoa.observacoes && (
                  <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Restrições e Anotações Internas:</span>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{selectedPessoa.observacoes}"
                    </p>
                  </div>
                )}

              </div>

              {/* Footer commands */}
              <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={() => {
                    handleStartEdit(selectedPessoa);
                    setSelectedPessoa(null);
                  }}
                  className="bg-purple-950 hover:bg-purple-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Cadastro</span>
                </button>
                <button
                  onClick={() => setSelectedPessoa(null)}
                  className="font-black text-xs text-slate-500 hover:text-slate-800 p-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  Fechar Detalhes
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
