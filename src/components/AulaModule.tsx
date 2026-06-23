import React, { useState } from 'react';
import { Aula, Turma, PlanoAula, Pessoa, RegistroAulaAluno, UserRole } from '../types';
import { checkPermission, getProfessorTurmas } from '../utils/permissions';
import { Plus, Check, Star, Edit, Save, History, ClipboardList, Info, AlertTriangle, MessageSquare, ShieldCheck } from 'lucide-react';

interface AulaModuleProps {
  aulas: Aula[];
  turmas: Turma[];
  planos: PlanoAula[];
  pessoas: Pessoa[];
  onAddAula: (aula: Omit<Aula, 'id' | 'auditLogs'>) => void;
  onEditAula: (aula: Aula) => void;
  simulatedRole: UserRole;
  currentUserId: string;
  currentUserName: string;
}

export default function AulaModule({
  aulas,
  turmas,
  planos,
  pessoas,
  onAddAula,
  onEditAula,
  simulatedRole,
  currentUserId,
  currentUserName
}: AulaModuleProps) {
  // Selector states
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');
  const [activeAulaId, setActiveAulaId] = useState<string | null>(null);
  
  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 16));
  const [newPlanoAulaId, setNewPlanoAulaId] = useState('');

  // Daily Ledger State (Current edits on an active Class)
  const [localRegistros, setLocalRegistros] = useState<Record<string, {
    presenca: boolean;
    uniformeCompleto: boolean;
    comentarioUniforme?: string;
    comportamento?: number;
  }>>({});
  
  // Auditing track message (required for editing/rectifying)
  const [rectificationReason, setRectificationReason] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Errors / Warnings
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permWarning, setPermWarning] = useState<string | null>(null);

  // Get active items
  const activeTurma = turmas.find(t => t.id === selectedTurmaId);
  const activeAula = aulas.find(a => a.id === activeAulaId);

  // Filter visible groups
  const isProfessor = simulatedRole === 'professor';
  const myTurmasIds = getProfessorTurmas(currentUserId, turmas);

  const visibleTurmas = turmas.filter(t => {
    return checkPermission(simulatedRole, 'turma', 'visualizar', {
      turmaId: t.id,
      professorTurmasIds: myTurmasIds
    }).allowed;
  });

  const checkAulaPermission = (action: 'criar' | 'editar_proprio' | 'visualizar', targetTurmaId?: string): boolean => {
    const verdict = checkPermission(simulatedRole, 'aula', action, {
      turmaId: targetTurmaId || selectedTurmaId,
      professorTurmasIds: myTurmasIds
    });
    if (!verdict.allowed) {
      setPermWarning(verdict.reason || 'Sua simulação não gerencia os diários de classe.');
      setTimeout(() => setPermWarning(null), 5000);
      return false;
    }
    return true;
  };

  // Approved plans of correct level for a group (RN-AULA-001)
  const availablePlans = planos.filter(p => {
    return p.status === 'aprovado' && (!activeTurma || p.nivel === activeTurma.nivel);
  });

  // Load daily ledger on active class selection
  const handleSelectAula = (aula: Aula) => {
    if (!checkAulaPermission('visualizar', aula.turmaId)) return;
    
    setActiveAulaId(aula.id);
    setIsEditingExisting(true);
    setRectificationReason('');
    
    // Map existing student rolls
    const regMap: typeof localRegistros = {};
    aula.registros.forEach(r => {
      regMap[r.alunoId] = {
        presenca: r.presenca,
        uniformeCompleto: r.uniformeCompleto,
        comentarioUniforme: r.comentarioUniforme || '',
        comportamento: r.comportamento || 5
      };
    });
    setLocalRegistros(regMap);
  };

  const handleStartCreateMode = () => {
    if (!checkAulaPermission('criar')) return;
    setShowCreate(true);
    setNewPlanoAulaId(availablePlans[0]?.id || '');
    setErrorMsg(null);
  };

  const executeAddAula = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate) {
      setErrorMsg('Preencha a data e horário específicos do diário.');
      return;
    }

    // RN-AULA-001: Mandatory approved lesson plan
    if (!newPlanoAulaId) {
      setErrorMsg('RN-AULA-001: Toda aula de ballet requer um PLANO DE AULA aprovado correspondente ao nível da turma.');
      return;
    }

    if (!activeTurma) return;

    // Seed empty registers for all students assigned to the group
    const seedRegistros: RegistroAulaAluno[] = activeTurma.alunosIds.map(aId => ({
      alunoId: aId,
      presenca: true,
      uniformeCompleto: true,
      comportamento: 5,
    }));

    onAddAula({
      turmaId: selectedTurmaId,
      dataHora: new Date(newDate).toISOString(),
      planoAulaId: newPlanoAulaId,
      registros: seedRegistros
    });

    setShowCreate(false);
    setErrorMsg(null);
  };

  const handleUpdateLedgerCell = (alunoId: string, updates: Partial<(typeof localRegistros)[string]>) => {
    setLocalRegistros({
      ...localRegistros,
      [alunoId]: {
        ...localRegistros[alunoId],
        ...updates
      }
    });
  };

  const handleSaveLedgerChanges = () => {
    if (!activeAula || !activeTurma) return;

    if (!checkAulaPermission('editar_proprio', activeAula.turmaId)) return;

    // If rectifying existing class, require a reason (RN-AULA-005 audit trail)
    if (isEditingExisting && !rectificationReason.trim()) {
      setErrorMsg('RN-AULA-005: Registros de aula são imutáveis e não podem ser excluídos. Modificações de retificação exigem um motivo para log de auditoria escolar.');
      return;
    }

    // Capture warning if any student is left unmapped or without rating (RF-AULA-003)
    const incomplete = activeTurma.alunosIds.some(aId => !localRegistros[aId]);
    if (incomplete) {
      setErrorMsg('RF-AULA-004: Todos os alunos matriculados na turma devem ser registrados de forma obrigatória no diário.');
      return;
    }

    // Map local cells back to system structure
    const updatedRegistros: RegistroAulaAluno[] = activeTurma.alunosIds.map(aId => {
      const cell = localRegistros[aId] || { presenca: false, uniformeCompleto: false };
      return {
        alunoId: aId,
        presenca: cell.presenca,
        uniformeCompleto: cell.uniformeCompleto,
        comentarioUniforme: !cell.uniformeCompleto ? cell.comentarioUniforme : undefined,
        comportamento: cell.comportamento
      };
    });

    const newAuditLog = {
      quem: currentUserName,
      quando: new Date().toISOString(),
      oQue: isEditingExisting 
        ? `Retificação de diário: ${rectificationReason}`
        : 'Registro de chamada e uniforme da aula.'
    };

    onEditAula({
      ...activeAula,
      registros: updatedRegistros,
      auditLogs: [...activeAula.auditLogs, newAuditLog]
    });

    setRectificationReason('');
    setErrorMsg(null);
    alert('Diário Escolar arquivado com sucesso. Histórico imutável de presenças atualizado!');
  };

  // Visao de aulas do grupo ativo
  const activeTurmaAulas = aulas.filter(a => a.turmaId === selectedTurmaId);

  const getPessoaName = (id: string) => {
    return pessoas.find(p => p.id === id)?.nomeCompleto || 'Desconhecido';
  };

  const getPlanoTitle = (id: string) => {
    return planos.find(p => p.id === id)?.titulo || 'Sem título atribuído';
  };

  return (
    <div className="space-y-6" id="aula-module">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-sans font-black text-purple-950">Diário Escolar (Aulas & Chamadas)</h1>
        <p className="text-purple-400 text-sm font-medium">Registro obrigatório de presença, uniformidade (sapatilhas/coque) e comportamento pedagógico (RF-AULA-003).</p>
      </div>

      {permWarning && (
        <div className="p-4 bg-pink-50 border border-pink-100 text-pink-900 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-pink-600 shrink-0" />
          <span>{permWarning}</span>
        </div>
      )}

      {/* Seletor de Turma */}
      <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <ClipboardList className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="w-full">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Filtrar por Turmas de Ballet</label>
            <select
              value={selectedTurmaId}
              onChange={e => {
                setSelectedTurmaId(e.target.value);
                setActiveAulaId(null);
                setShowCreate(false);
              }}
              className="text-sm font-black bg-transparent border-none p-0 pr-6 text-purple-950 focus:outline-none w-full cursor-pointer"
            >
              {visibleTurmas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} (Nível: {t.nivel})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleStartCreateMode}
          className="w-full sm:w-auto bg-purple-800 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Registrar Nova Aula
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Agenda de aulas registradas nesta turma */}
        <div className="col-span-1 lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 font-bold">Aulas Arquivadas/Configuradas</h2>

            {showCreate ? (
              // Formulário de Criação rápida de Aula
              <form onSubmit={executeAddAula} className="space-y-4 p-3 bg-pink-50/20 border border-pink-150 rounded-lg animate-in fade-in duration-200">
                <h3 className="text-xs font-bold text-pink-950 flex items-center gap-1">
                  🆕 Abrir Aula no Diário
                </h3>

                {errorMsg && (
                  <div className="p-2 bg-pink-50 border border-pink-100 text-pink-800 text-[11px] rounded leading-relaxed">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Data / Horário Aula</label>
                  <input
                    type="datetime-local"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Selecionar Plano de Aula Aprovado (ExIGIDO - RN-AULA-001)</label>
                  <select
                    value={newPlanoAulaId}
                    onChange={e => setNewPlanoAulaId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white"
                  >
                    <option value="">-- Escolher nos aprovados do nível --</option>
                    {availablePlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titulo} (v{p.versao} - por {p.autorNome})
                      </option>
                    ))}
                  </select>
                  {availablePlans.length === 0 && (
                    <span className="text-[10px] text-amber-600 font-sans block mt-1">
                      ⚠️ Não há planos "Aprovados" por Coordenadores com o nível desta turma registrados na Biblioteca de Planos.
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-1 text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="border border-slate-200 text-slate-500 px-2 py-1 rounded"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-800 text-white px-3 py-1 rounded font-bold cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {activeTurmaAulas.length > 0 ? (
                  activeTurmaAulas.map(aula => {
                    const isSelected = activeAulaId === aula.id;
                    const formattedDate = new Date(aula.dataHora).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <button
                        key={aula.id}
                        onClick={() => handleSelectAula(aula)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-800 border-purple-800 text-white shadow-xs scale-102'
                            : 'bg-purple-50/30 hover:bg-purple-50 border-purple-100 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <span className="block text-[11px] font-mono tracking-wide opacity-80">
                            {formattedDate}
                          </span>
                          <span className={`block text-xs font-bold mt-0.5 truncate ${
                            isSelected ? 'text-white' : 'text-purple-950'
                          }`}>
                            {getPlanoTitle(aula.planoAulaId)}
                          </span>
                        </div>
                        <Check className="w-4 h-4 shrink-0 opacity-60" />
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma aula registrada nesta turma ainda.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Editor de Diário Escolar (Chamada, Uniforme, Nota) */}
        <div className="col-span-1 lg:col-span-8">
          {activeAula && activeTurma ? (
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-3xs space-y-4">
              {/* Resumo da Aula */}
              <div className="pb-3 border-b border-purple-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#9c27b0] font-black block">
                    Diário de Frequência & Uniforme
                  </span>
                  <h3 className="text-base font-sans font-black text-purple-950 mt-1">
                    {getPlanoTitle(activeAula.planoAulaId)}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Data Registro: {new Date(activeAula.dataHora).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-[11px] flex items-center gap-1.5 self-start text-indigo-950 font-sans">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>RN-AULA-005: Histórico de Aula Imutável</span>
                </div>
              </div>

              {/* Tabela de Lançamento de Presença / Uniforme */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-600 block mb-2">Presenças e Conformidade do Aluno:</span>
                
                {errorMsg && (
                  <div className="p-3 bg-pink-50 border border-pink-100 text-pink-805 text-xs rounded-lg font-bold">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {activeTurma.alunosIds.map(aId => {
                    const row = localRegistros[aId] || { presenca: true, uniformeCompleto: true, comportamento: 5, comentarioUniforme: '' };
                    return (
                      <div key={aId} className="p-3 bg-white hover:bg-slate-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="w-56 truncate">
                          <span className="font-semibold text-xs block text-slate-800">{getPessoaName(aId)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {aId}</span>
                        </div>

                        {/* Presença */}
                        <div className="flex items-center gap-1 shrink-0">
                          <label className="text-[11px] font-bold text-slate-500 mr-1.5 uppercase font-mono">Presença:</label>
                          <button
                            onClick={() => handleUpdateLedgerCell(aId, { presenca: true })}
                            className={`text-xs px-2 py-1 rounded-l-md border cursor-pointer ${
                              row.presenca 
                                ? 'bg-purple-700 text-white border-purple-700 font-bold' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            onClick={() => handleUpdateLedgerCell(aId, { presenca: false })}
                            className={`text-xs px-2 py-1 rounded-r-md border-y border-r cursor-pointer ${
                              !row.presenca 
                                ? 'bg-pink-650 text-white border-pink-650 font-bold' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Ausente
                          </button>
                        </div>

                        {/* Uniforme */}
                        <div className="flex flex-col gap-1 w-52 shrink-0">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Uniforme Completo?:</span>
                            <input
                              type="checkbox"
                              checked={row.uniformeCompleto}
                              onChange={e => handleUpdateLedgerCell(aId, { uniformeCompleto: e.target.checked })}
                              className="accent-purple-600 w-4 h-4 rounded cursor-pointer"
                            />
                          </div>
                          {!row.uniformeCompleto && (
                            <input
                              type="text"
                              value={row.comentarioUniforme || ''}
                              onChange={e => handleUpdateLedgerCell(aId, { comentarioUniforme: e.target.value })}
                              placeholder='Ex: "Faltou sapatilha" ou "Cabelo solto"'
                              className="text-[11px] border border-purple-200 bg-yellow-50/50 p-1 rounded placeholder-purple-300 w-full"
                            />
                          )}
                        </div>

                        {/* Avaliação Comportamental (Opcional - Estrelas) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] font-bold text-slate-500 uppercase font-mono mr-1">Comport.:</span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => handleUpdateLedgerCell(aId, { comportamento: star })}
                              className="p-0.5"
                            >
                              <Star className={`w-4 h-4 ${
                                (row.comportamento || 0) >= star 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-slate-200'
                              }`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Justificativa de Retificação e Botões finais */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                {isEditingExisting && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-slate-500" /> Motivo de Retificação Escolar (Histórico de Auditoria obrigatório - RN-AULA-005)
                    </label>
                    <input
                      type="text"
                      value={rectificationReason}
                      onChange={e => setRectificationReason(e.target.value)}
                      placeholder='Ex: "Erro de digitação no uniforme da aluna Sofia"'
                      className="w-full text-xs border border-slate-200 rounded p-2 bg-white"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 text-sm">
                  <button
                    onClick={handleSaveLedgerChanges}
                    className="bg-purple-800 hover:bg-purple-900 text-white font-black px-4 py-2.5 text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Salvar Diário Escolar (Arquivar)
                  </button>
                </div>
              </div>

              {/* Registro de logs de auditoria desta aula */}
              {activeAula.auditLogs && activeAula.auditLogs.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block mb-2">Logs de Alteração de Chamada</span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {activeAula.auditLogs.map((log, idx) => (
                      <div key={idx} className="text-xs bg-slate-50 p-2 rounded border border-slate-100 text-slate-600">
                        <span className="font-semibold text-slate-800 capitalize">{log.quem}</span> às <span className="font-mono text-[10.5px]">{new Date(log.quando).toLocaleString('pt-BR')}</span>:
                        <p className="mt-0.5 text-slate-500 italic">"{log.oQue}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-80 flex flex-col items-center justify-center text-center p-6 bg-white border border-slate-100 rounded-xl text-slate-400 text-sm">
              <ClipboardList className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              Selecione uma aula agendada ao lado para abrir, registrar chamadas de presença, conformidade de uniformes de ballet e avaliações comportamentais no diário escolar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
