import React, { useState } from 'react';
import { Turma, UserRole, Pessoa } from '../types';
import { checkPermission, getProfessorTurmas } from '../utils/permissions';
import { Plus, Edit2, Trash2, ShieldAlert, Check, X, Users, Compass, Clock, MapPin, CalendarDays, AlertTriangle } from 'lucide-react';

interface TurmaModuleProps {
  turmas: Turma[];
  pessoas: Pessoa[];
  onAddTurma: (turma: Omit<Turma, 'id'>) => void;
  onEditTurma: (turma: Turma) => void;
  onDeleteTurma: (id: string) => void;
  simulatedRole: UserRole;
  currentUserId: string;
}

export default function TurmaModule({
  turmas,
  pessoas,
  onAddTurma,
  onEditTurma,
  onDeleteTurma,
  simulatedRole,
  currentUserId
}: TurmaModuleProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [nivel, setNivel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Iniciante');
  const [horarios, setHorarios] = useState('');
  const [sala, setSala] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [professoresSelected, setProfessoresSelected] = useState<string[]>([]);
  const [alunosSelected, setAlunosSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'ativa' | 'concluída' | 'cancelada'>('ativa');
  const [capacidadeMaxima, setCapacidadeMaxima] = useState(15);

  // Errors / Warnings
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permWarning, setPermWarning] = useState<string | null>(null);

  // Helpers
  const professoresDisponiveis = pessoas.filter(p => p.perfis.includes('professor'));
  const alunosDisponiveis = pessoas.filter(p => p.perfis.includes('aluno'));

  const resetForm = () => {
    setNome('');
    setNivel('Iniciante');
    setHorarios('');
    setSala('');
    setDataInicio('');
    setDataFim('');
    setProfessoresSelected([]);
    setAlunosSelected([]);
    setStatus('ativa');
    setCapacidadeMaxima(15);
    setEditingId(null);
    setErrorMsg(null);
  };

  const getProfessorTurmasIds = () => {
    return getProfessorTurmas(currentUserId, turmas);
  };

  const verifyAction = (action: 'criar' | 'editar_todos' | 'deletar'): boolean => {
    const verdict = checkPermission(simulatedRole, 'turma', action);
    if (!verdict.allowed) {
      setPermWarning(verdict.reason || 'Seu perfil de simulação não pode gerenciar turmas.');
      setTimeout(() => setPermWarning(null), 5000);
      return false;
    }
    return true;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !horarios.trim() || !sala.trim() || !dataInicio || !dataFim) {
      setErrorMsg('Os campos identificação, horário, sala e datas são obrigatórios.');
      return;
    }

    // RF-TURM-002: Composição Obrigatória (At least 1 Professor, 1 Student)
    if (professoresSelected.length === 0) {
      setErrorMsg('RF-TURM-002: É obrigatório vincular pelo menos 1 professor de ballet à turma.');
      return;
    }
    if (alunosSelected.length === 0) {
      setErrorMsg('RF-TURM-002: É obrigatório vincular pelo menos 1 aluno participante à turma.');
      return;
    }

    // Capacity Warning: RN-TURM-004
    const isExceedingCapacity = alunosSelected.length > capacidadeMaxima;
    if (isExceedingCapacity && simulatedRole !== 'coordenador' && simulatedRole !== 'diretor') {
      setErrorMsg(`A capacidade máxima permitida é ${capacidadeMaxima} alunos. Apenas um Coordenador Pedagógico pode exceder o limite.`);
      return;
    }

    if (editingId) {
      if (!verifyAction('editar_todos')) return;
      onEditTurma({
        id: editingId,
        nome,
        nivel,
        horarios,
        sala,
        dataInicio,
        dataFim,
        professoresIds: professoresSelected,
        alunosIds: alunosSelected,
        status,
        capacidadeMaxima
      });
    } else {
      if (!verifyAction('criar')) return;
      onAddTurma({
        nome,
        nivel,
        horarios,
        sala,
        dataInicio,
        dataFim,
        professoresIds: professoresSelected,
        alunosIds: alunosSelected,
        status,
        capacidadeMaxima
      });
    }

    setShowForm(false);
    resetForm();
  };

  const handleStartEdit = (t: Turma) => {
    if (!verifyAction('editar_todos')) return;

    setEditingId(t.id);
    setNome(t.nome);
    setNivel(t.nivel);
    setHorarios(t.horarios);
    setSala(t.sala);
    setDataInicio(t.dataInicio);
    setDataFim(t.dataFim);
    setProfessoresSelected(t.professoresIds || []);
    setAlunosSelected(t.alunosIds || []);
    setStatus(t.status);
    setCapacidadeMaxima(t.capacidadeMaxima || 15);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!verifyAction('deletar')) return;
    if (confirm('Tem certeza que deseja descontinuar e apagar os registros desta turma?')) {
      onDeleteTurma(id);
    }
  };

  const toggleProfessorSelection = (id: string) => {
    if (professoresSelected.includes(id)) {
      setProfessoresSelected(professoresSelected.filter(p => p !== id));
    } else {
      setProfessoresSelected([...professoresSelected, id]);
    }
  };

  const toggleAlunoSelection = (id: string) => {
    if (alunosSelected.includes(id)) {
      setAlunosSelected(alunosSelected.filter(a => a !== id));
    } else {
      setAlunosSelected([...alunosSelected, id]);
    }
  };

  // Get name utilities
  const getPessoaName = (id: string) => {
    return pessoas.find(p => p.id === id)?.nomeCompleto || 'Desconhecido';
  };

  // Filter visible turmas based on permissions (RN-TURM-002: Professor can only see linked classes)
  const isProfessor = simulatedRole === 'professor';
  const myTurmasIds = getProfessorTurmasIds();

  const visibleTurmas = turmas.filter(t => {
    // Check if user has permission to visualize this specific class
    const verdict = checkPermission(simulatedRole, 'turma', 'visualizar', {
      turmaId: t.id,
      professorTurmasIds: myTurmasIds
    });
    return verdict.allowed;
  });

  return (
    <div className="space-y-6" id="turma-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-sans font-black text-purple-950">Turmas de Ballet</h1>
          <p className="text-purple-400 text-sm font-medium">Organograma operacional, horários, salas, atribuição pedagógica e alunos matriculados.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-purple-800 hover:bg-purple-900 text-white font-black text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nova Turma (COORDENADOR)
        </button>
      </div>

      {permWarning && (
        <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-sm rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-pink-600 shrink-0" />
          <span>{permWarning}</span>
        </div>
      )}

      {/* Formulário de Gestão de Turmas */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs transition-all animate-in fade-in duration-200">
          <h2 className="text-base font-sans font-semibold text-slate-800 mb-4">
            {editingId ? 'Editar Parâmetros da Turma' : 'Modelagem de Nova Turma de Ballet'}
          </h2>

          {errorMsg && (
            <div className="p-3 bg-pink-50 border border-pink-100 text-pink-900 text-xs rounded-lg font-bold mb-4">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome / Identificação do Diário (Opcional)</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Ballet Clássico Infantil Sábado"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nível / Categoria</label>
                  <select
                    value={nivel}
                    onChange={e => setNivel(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Capacidade Máxima</label>
                  <input
                    type="number"
                    value={capacidadeMaxima}
                    onChange={e => setCapacidadeMaxima(Number(e.target.value))}
                    min={1}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Horário das Aulas (Ex: Sábado, 09:00 - 10:00)</label>
                <input
                  type="text"
                  value={horarios}
                  onChange={e => setHorarios(e.target.value)}
                  placeholder="Segunda e Quarta, 18H-19H"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sala / Local Técnico</label>
                <input
                  type="text"
                  value={sala}
                  onChange={e => setSala(e.target.value)}
                  placeholder="Ex: Sala de Espelhos com Piso Flutuante"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Início da Turma</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data Fim da Turma</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Operativo</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="ativa">Ativa</option>
                  <option value="concluída">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Atribuição de Professor ou Professores (múltiplos permitidos) */}
            <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
              <span className="text-xs font-bold text-purple-950 block">
                Atribuição de Professores (RN-TURM-002: Pelo menos 1 exigido!)
              </span>
              <div className="flex flex-wrap gap-2">
                {professoresDisponiveis.map(prof => {
                  const selected = professoresSelected.includes(prof.id);
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => toggleProfessorSelection(prof.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        selected
                          ? 'bg-purple-800 text-white border-purple-800 font-bold shadow-xs'
                          : 'bg-white border-purple-100 text-purple-600 hover:bg-purple-50/50'
                      }`}
                    >
                      {prof.nomeCompleto}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inscrição de Alunos */}
            <div className="p-3 bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl space-y-2">
              <span className="text-xs font-bold text-purple-950 block">
                Matrícula de Alunos Participantes (RN-TURM-002: Pelo menos 1 exigido!) - Alunos vinculados à Turma ({alunosSelected.length})
              </span>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
                {alunosDisponiveis.map(al => {
                  const selected = alunosSelected.includes(al.id);
                  return (
                    <button
                      key={al.id}
                      type="button"
                      onClick={() => toggleAlunoSelection(al.id)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        selected
                          ? 'bg-purple-800 text-white border-purple-805 font-bold scale-102 shadow-xs'
                          : 'bg-white border-fuchsia-100 text-purple-600 hover:bg-fuchsia-50/50'
                      }`}
                    >
                      {al.nomeCompleto}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-2 rounded-lg shadow-md cursor-pointer"
              >
                {editingId ? 'Salvar Edições' : 'Criar Turma'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Visualização das Turmas */}
      {visibleTurmas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="turmas-list">
          {visibleTurmas.map(t => {
            const isFull = t.alunosIds.length >= t.capacidadeMaxima;
            const sizePercent = Math.min(100, Math.round((t.alunosIds.length / t.capacidadeMaxima) * 100));

            return (
              <div key={t.id} className="bg-white border border-purple-100 rounded-xl p-5 shadow-3xs hover:shadow-2xs transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest font-black bg-purple-50 text-purple-700 p-1 px-2 rounded border border-purple-100">
                        Ballet {t.nivel}
                      </span>
                      <h3 className="font-sans font-black text-purple-950 text-base mt-2">{t.nome}</h3>
                    </div>
                    {/* Status */}
                    <span className={`text-xs capitalize font-bold px-2 py-0.5 rounded-full border ${
                      t.status === 'ativa' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      t.status === 'concluída' ? 'bg-yellow-50 text-yellow-850 border-yellow-250' :
                      'bg-pink-50 text-pink-700 border-pink-100'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  {/* Informações operacionais */}
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-50 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Horários</span>
                        <strong>{t.horarios}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Sala</span>
                        <strong>{t.sala}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Início</span>
                        <strong>{new Date(t.dataInicio).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Término</span>
                        <strong>{new Date(t.dataFim).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Liderança e Equipe técnica */}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider">Equipe de Professores</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.professoresIds && t.professoresIds.map(profId => (
                        <span key={profId} className="text-xs bg-purple-50 text-purple-800 font-bold p-1 px-2.5 rounded-md border border-purple-100/50">
                          🎓 Prof. {getPessoaName(profId)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Inscrições / Capacidade */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Alunos Inscritos ({t.alunosIds.length}/{t.capacidadeMaxima})</span>
                      <span className="font-bold text-purple-750">{sizePercent}% preenchido</span>
                    </div>
                    <div className="w-full bg-purple-50/50 h-2 rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isFull ? 'bg-yellow-500' : 'bg-purple-600'
                        }`}
                        style={{ width: `${sizePercent}%` }}
                      />
                    </div>
                    
                    {/* Alerta de lotação */}
                    {isFull && (
                      <div className="flex items-center gap-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[11px] text-yellow-905 font-medium">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                        <span>Capacidade máxima atingida (RN-TURM-004)! Alerta pedagógico gerado para os novos cadastros.</span>
                      </div>
                    )}
                  </div>

                  {/* Listagem compacta de alunos */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider">Relação de Alunas da Turma ({t.alunosIds.length})</span>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                      {t.alunosIds.map(aId => (
                        <div key={aId} className="bg-purple-55/30 border border-purple-100/50 p-1 px-2 rounded font-sans truncate text-purple-950 font-medium">
                          • {getPessoaName(aId)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Painel administrativo da turma */}
                {checkPermission(simulatedRole, 'turma', 'editar_todos').allowed && (
                  <div className="flex gap-1 justify-end border-t border-purple-100 pt-3">
                    <button
                      onClick={() => handleStartEdit(t)}
                      className="text-xs font-black flex items-center gap-1 text-purple-700 hover:text-purple-900 bg-purple-50 p-1.5 rounded cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar Parâmetros
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs text-slate-550 hover:bg-pink-50 hover:text-pink-600 p-1.5 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs bg-white border border-slate-100 rounded-xl">
          Nenhuma turma disponível ou vinculada para visualização sob o perfil {simulatedRole}.
        </div>
      )}
    </div>
  );
}
