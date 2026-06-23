import React, { useState } from 'react';
import { Contato, LeadStatus, UserRole, Pessoa } from '../types';
import { checkPermission } from '../utils/permissions';
import { Plus, Check, Edit2, Trash2, ArrowRightLeft, Sparkles, Filter, UserPlus, Info, Phone, MessageSquare } from 'lucide-react';

interface ContatoModuleProps {
  contatos: Contato[];
  pessoas: Pessoa[];
  onAddContato: (contato: Omit<Contato, 'id' | 'createdAt'>) => void;
  onEditContato: (contato: Contato) => void;
  onDeleteContato: (id: string) => void;
  onConvertContato: (contato: Contato, extraData: { cpf: string; email: string; perfis: UserRole[] }) => void;
  simulatedRole: UserRole;
  currentUserName: string;
}

export default function ContatoModule({
  contatos,
  pessoas,
  onAddContato,
  onEditContato,
  onDeleteContato,
  onConvertContato,
  simulatedRole,
  currentUserName
}: ContatoModuleProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadStatus | 'todos'>('todos');

  // Form State
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [apelido, setApelido] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('novo');
  const [canalOrigem, setCanalOrigem] = useState('Instagram');
  const [pessoaVinculoId, setPessoaVinculoId] = useState('');

  // Conversion Wizard State
  const [conversionTarget, setConversionTarget] = useState<Contato | null>(null);
  const [convCpf, setConvCpf] = useState('');
  const [convEmail, setConvEmail] = useState('');
  const [convPerfis, setConvPerfis] = useState<UserRole[]>(['aluno']);
  const [convError, setConvError] = useState('');

  // Permission Alerts
  const [permError, setPermError] = useState<string | null>(null);

  const resetForm = () => {
    setNome('');
    setSobrenome('');
    setApelido('');
    setCpf('');
    setTelefone('');
    setEmail('');
    setObservacoes('');
    setStatus('novo');
    setCanalOrigem('Instagram');
    setPessoaVinculoId('');
    setEditingId(null);
  };

  const verifyAction = (action: 'criar' | 'editar_proprio' | 'editar_todos' | 'deletar' | 'converter'): boolean => {
    const verdict = checkPermission(simulatedRole, 'contato', action);
    if (!verdict.allowed) {
      setPermError(verdict.reason || 'Permissão negada.');
      setTimeout(() => setPermError(null), 5000);
      return false;
    }
    return true;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAction('criar')) return;

    onAddContato({
      nome,
      sobrenome,
      apelido,
      cpf,
      telefone,
      email,
      observacoes,
      status,
      atendente: currentUserName,
      canalOrigem,
      pessoaVinculoId: pessoaVinculoId || undefined
    });

    setShowForm(false);
    resetForm();
  };

  const handleStartEdit = (contato: Contato) => {
    // Check if can edit todos or at least own
    const canEditAll = checkPermission(simulatedRole, 'contato', 'editar_todos').allowed;
    const canEditOwn = checkPermission(simulatedRole, 'contato', 'editar_proprio').allowed;

    if (!canEditAll && !canEditOwn) {
      setPermError('Seu perfil não possui permissões para modificar contatos de CRM.');
      setTimeout(() => setPermError(null), 4000);
      return;
    }

    setEditingId(contato.id);
    setNome(contato.nome);
    setSobrenome(contato.sobrenome);
    setApelido(contato.apelido);
    setCpf(contato.cpf);
    setTelefone(contato.telefone);
    setEmail(contato.email);
    setObservacoes(contato.observacoes);
    setStatus(contato.status);
    setCanalOrigem(contato.canalOrigem);
    setPessoaVinculoId(contato.pessoaVinculoId || '');
    setShowForm(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const belongsToSelf = true; // Simulado para simplificação
    const actionType = checkPermission(simulatedRole, 'contato', 'editar_todos').allowed ? 'editar_todos' : 'editar_proprio';
    if (!verifyAction(actionType)) return;

    onEditContato({
      id: editingId,
      nome,
      sobrenome,
      apelido,
      cpf,
      telefone,
      email,
      observacoes,
      status,
      atendente: currentUserName,
      canalOrigem,
      createdAt: contatos.find(c => c.id === editingId)?.createdAt || new Date().toISOString(),
      pessoaVinculoId: pessoaVinculoId || undefined
    });

    setShowForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!verifyAction('deletar')) return;
    if (confirm('Tem certeza que deseja arquivar/remover este contato do CRM?')) {
      onDeleteContato(id);
    }
  };

  const handleOpenConverter = (contato: Contato) => {
    if (!verifyAction('converter')) return;
    setConversionTarget(contato);
    setConvCpf(contato.cpf);
    setConvEmail(contato.email);
    setConvPerfis(['aluno']);
    setConvError('');
  };

  const handleExecuteConversion = () => {
    if (!conversionTarget) return;

    // Validation as per RF-PESS-001 (Pessoa CPF and email are mandatory and unique)
    if (!convCpf.trim()) {
      setConvError('CPF é obrigatório para cadastrar uma oficial PESSOA.');
      return;
    }
    if (!convEmail.trim()) {
      setConvError('E-mail é obrigatório para cadastrar uma oficial PESSOA.');
      return;
    }

    const cpfDuplicated = pessoas.some(p => p.cpf === convCpf);
    const emailDuplicated = pessoas.some(p => p.email === convEmail);

    if (cpfDuplicated) {
      setConvError('RN-PESS-001: Validação de duplicidade falhou! Este CPF já está cadastrado em outra Pessoa.');
      return;
    }
    if (emailDuplicated) {
      setConvError('RN-PESS-001: Validação de duplicidade falhou! Este E-mail já está cadastrado em outra Pessoa.');
      return;
    }

    onConvertContato(conversionTarget, {
      cpf: convCpf,
      email: convEmail,
      perfis: convPerfis
    });

    setConversionTarget(null);
  };

  const togglePerfilInSelection = (role: UserRole) => {
    if (convPerfis.includes(role)) {
      if (convPerfis.length > 1) {
        setConvPerfis(convPerfis.filter(r => r !== role));
      }
    } else {
      setConvPerfis([...convPerfis, role]);
    }
  };

  // Filter list
  const filteredContatos = contatos.filter(c => {
    if (activeTab === 'todos') return true;
    return c.status === activeTab;
  });

  return (
    <div className="space-y-6" id="contato-module">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-sans font-black text-purple-950">Contatos & Leads CRM</h1>
          <p className="text-purple-400 text-sm font-medium">Captura ágil e livre de novos alunos ou interessados antes da matrícula (RF-001).</p>
        </div>
        <button
          id="btn-novo-contato"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-purple-800 hover:bg-purple-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Lead Rápido
        </button>
      </div>

      {/* Alerta de erro de permissão */}
      {permError && (
        <div id="permission-warning" className="p-4 bg-pink-50 border border-pink-150 text-pink-900 text-sm rounded-xl flex items-center gap-2">
          <Info className="w-5 h-5 text-pink-600 font-bold" />
          <span>{permError}</span>
        </div>
      )}

      {/* Formulário de Lead Rápido */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs transition-all animate-in fade-in duration-200">
          <h2 className="text-base font-sans font-semibold text-slate-800 mb-4">
            {editingId ? 'Editar Detalhes do Lead' : 'Captação Rápida de Lead'}
          </h2>
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 mb-3">
              💡 <strong>Regra RF-CONT-001:</strong> No cadastro de contato todos os campos são opcionais, sem duplicidade obrigatória. Captura livre para não perder o prospect!
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Gabriela"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={sobrenome}
                  onChange={e => setSobrenome(e.target.value)}
                  placeholder="Ex: Ramos"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Apelido</label>
                <input
                  type="text"
                  value={apelido}
                  onChange={e => setApelido(e.target.value)}
                  placeholder="Ex: Gabi"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF (Opcional, sem validação)</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="gabriela@email.com"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Canal de Origem</label>
                <select
                  value={canalOrigem}
                  onChange={e => setCanalOrigem(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Website">Website</option>
                  <option value="Panfleto/Faixa">Panfleto/Faixa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status do Lead</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as LeadStatus)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="novo">Novo</option>
                  <option value="contatado">Contatado</option>
                  <option value="convertido">Convertido</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vincular Pessoa Existente (Opcional)</label>
                <select
                  value={pessoaVinculoId}
                  onChange={e => setPessoaVinculoId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="">Nenhum vínculo</option>
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nomeCompleto} ({p.cpf})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observações Livres</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Detalhes da conversa, dia que quer fazer aula experimental, estilo de ballet preferido..."
                className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50"
              />
            </div>

            <div className="flex justify-end gap-2 text-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer"
              >
                {editingId ? 'Salvar Edições' : 'Cadastrar Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs Filter */}
      <div className="border-b border-purple-100 flex items-center justify-between gap-4 overflow-x-auto pb-px" id="crm-tabs">
        <div className="flex gap-2">
          {(['todos', 'novo', 'contatado', 'convertido', 'perdido'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs uppercase tracking-wider font-bold py-3 px-4 border-b-2 transition-all capitalize cursor-pointer ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-750 font-black'
                  : 'border-transparent text-purple-400 hover:text-purple-600'
              }`}
            >
              {tab === 'todos' ? 'Todos os Leads' : tab}
              <span className="ml-1.5 font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {tab === 'todos' ? contatos.length : contatos.filter(c => c.status === tab).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
        {filteredContatos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/70 border-b border-purple-100 text-[11px] font-mono uppercase tracking-widest text-purple-500">
                  <th className="p-4 py-3 font-bold">Lead / Apelido</th>
                  <th className="p-4 py-3 font-bold">Contato</th>
                  <th className="p-4 py-3 font-bold">Origem</th>
                  <th className="p-4 py-3 font-bold">Data Captação</th>
                  <th className="p-4 py-3 font-bold">Status</th>
                  <th className="p-4 py-3 text-right font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 text-sm text-slate-700">
                {filteredContatos.map(c => (
                  <tr key={c.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-slate-800">{c.nome} {c.sobrenome}</span>
                        {c.apelido && <span className="ml-1.5 text-xs text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded font-black">"{c.apelido}"</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">Cadastrado por: {c.atendente}</div>
                    </td>
                    <td className="p-4 space-y-1">
                      {c.telefone && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {c.telefone}
                        </div>
                      )}
                      {c.email && (
                        <div className="text-xs text-slate-500 underline decoration-slate-200">{c.email}</div>
                      )}
                      {c.cpf && <div className="text-[11px] font-mono text-slate-400">CPF: {c.cpf}</div>}
                    </td>
                    <td className="p-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                        {c.canalOrigem}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold px-2 py-0.5 ${
                        c.status === 'novo' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                        c.status === 'contatado' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        c.status === 'convertido' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'novo' ? 'bg-sky-500' :
                          c.status === 'contatado' ? 'bg-amber-500' :
                          c.status === 'convertido' ? 'bg-emerald-505' :
                          'bg-slate-400'
                        }`} />
                        {c.status === 'novo' ? 'Recém cadastrado' :
                         c.status === 'contatado' ? 'Houve follow-up' :
                         c.status === 'convertido' ? 'Virou oficial PESSOA' :
                         'Sem interesse'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {c.status !== 'convertido' && (
                          <button
                            title="Converter para registro oficial PESSOA"
                            onClick={() => handleOpenConverter(c)}
                            className="p-1 px-2.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-150 font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Converter
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-pink-600 rounded-lg hover:bg-pink-50 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">Nenhum lead encontrado neste status.</div>
        )}
      </div>

      {/* Modal / Diálogo de Conversão de Contato para Pessoa */}
      {conversionTarget && (
        <div className="fixed inset-0 bg-purple-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border-2 border-purple-150 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-purple-700">
              <ArrowRightLeft className="w-5 h-5 text-fuchsia-500" />
              <h2 className="text-xl font-sans font-black">Conversão de Lead para Pessoa Oficial</h2>
            </div>

            <p className="text-xs text-slate-500">
              A regra <strong>RF-PESS-001</strong> exige campos obrigatórios e únicos (CPF e E-mail) para criar um registro oficial e consolidado. Preencha estes dados:
            </p>

            {convError && (
              <div className="p-3 bg-pink-50 border border-pink-100 text-pink-905 text-xs rounded-lg font-bold">
                {convError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo (Obrigatório)</label>
                <input
                  type="text"
                  value={conversionTarget.nome + ' ' + (conversionTarget.sobrenome || '')}
                  disabled
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">CPF (Obrigatório - Único)</label>
                  <input
                    type="text"
                    value={convCpf}
                    onChange={e => setConvCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full text-sm border-2 border-purple-50 focus:border-purple-400 rounded-lg p-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail (Obrigatório - Único)</label>
                  <input
                    type="email"
                    value={convEmail}
                    onChange={e => setConvEmail(e.target.value)}
                    placeholder="nome@email.com"
                    className="w-full text-sm border-2 border-purple-50 focus:border-purple-400 rounded-lg p-2 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Perfis Associados (Uma pessoa pode acumular múltiplos!):</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(['aluno', 'cliente', 'responsavel', 'visitante', 'professor', 'atendimento', 'funcionario'] as const).map(role => {
                    const selected = convPerfis.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => togglePerfilInSelection(role)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold capitalize transition-all cursor-pointer ${
                          selected
                            ? 'bg-purple-800 text-white border-purple-800 shadow-xs'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Exemplo: Um mesmo CPF pode atuar como <strong>Cliente</strong> (quem paga) e <strong>Aluno</strong> simultaneamente.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-sm pt-4 border-t border-purple-100">
              <button
                onClick={() => setConversionTarget(null)}
                className="border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteConversion}
                className="bg-yellow-400 hover:bg-yellow-500 text-purple-950 font-black px-4 py-2 rounded-lg shadow-sm border-2 border-yellow-500 cursor-pointer"
              >
                Efetuar Matrícula Oficial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
