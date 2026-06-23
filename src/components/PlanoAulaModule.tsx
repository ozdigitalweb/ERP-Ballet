import React, { useState } from 'react';
import { PlanoAula, UserRole, Pessoa } from '../types';
import { checkPermission } from '../utils/permissions';
import { Plus, Edit2, CheckCircle, XCircle, Search, Filter, BookOpen, Music, Target, User, RefreshCw, Send, Compass, Clock } from 'lucide-react';

interface PlanoAulaModuleProps {
  planos: PlanoAula[];
  pessoas: Pessoa[];
  onAddPlano: (plano: Omit<PlanoAula, 'id' | 'status' | 'versao'>) => void;
  onEditPlano: (plano: PlanoAula) => void;
  onApproveRejectPlano: (id: string, status: 'aprovado' | 'rejeitado', feedback?: string) => void;
  simulatedRole: UserRole;
  currentUserId: string;
  currentUserName: string;
}

export default function PlanoAulaModule({
  planos,
  pessoas,
  onAddPlano,
  onEditPlano,
  onApproveRejectPlano,
  simulatedRole,
  currentUserId,
  currentUserName
}: PlanoAulaModuleProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [nivelFilter, setNivelFilter] = useState<'todos' | 'Iniciante' | 'Intermediário' | 'Avançado'>('todos');
  const [autorFilter, setAutorFilter] = useState('todos');

  // Form State
  const [titulo, setTitulo] = useState('');
  const [nivel, setNivel] = useState<'Iniciante' | 'Intermediário' | 'Avançado'>('Iniciante');
  const [tema, setTema] = useState('');
  const [duracao, setDuracao] = useState('60 min');
  const [descricao, setDescricao] = useState('');
  const [objetivos, setObjetivos] = useState('');
  const [exercicios, setExercicios] = useState('');
  const [musicas, setMusicas] = useState('');

  // Feedback State for reviews by Coordinator
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [coordinatorFeedback, setCoordinatorFeedback] = useState('');

  // Errors / Warnings
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permWarning, setPermWarning] = useState<string | null>(null);

  const resetForm = () => {
    setTitulo('');
    setNivel('Iniciante');
    setTema('');
    setDuracao('60 min');
    setDescricao('');
    setObjetivos('');
    setExercicios('');
    setMusicas('');
    setEditingId(null);
    setErrorMsg(null);
  };

  const verifyAction = (action: 'criar' | 'editar_proprio' | 'aprovar', context?: { isOwner?: boolean; statusPlano?: string }): boolean => {
    const verdict = checkPermission(simulatedRole, 'plano', action, context);
    if (!verdict.allowed) {
      setPermWarning(verdict.reason || 'Permissão negada para o perfil ativo.');
      setTimeout(() => setPermWarning(null), 5000);
      return false;
    }
    return true;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !tema.trim() || !descricao.trim()) {
      setErrorMsg('Os campos título, tema/técnica e descrição geral são obrigatórios.');
      return;
    }

    if (editingId) {
      const original = planos.find(p => p.id === editingId);
      if (!original) return;

      const isOwner = original.autorId === currentUserId;
      if (!verifyAction('editar_proprio', { isOwner, statusPlano: original.status })) return;

      // RN-PLAN-003: Editing an approved plan increments version and sends it back to "pendente_aprovacao"
      const isApproved = original.status === 'aprovado';
      
      onEditPlano({
        ...original,
        titulo,
        nivel,
        tema,
        duracao,
        descricao,
        objetivos,
        exercicios,
        musicas,
        status: isApproved ? 'pendente_aprovacao' : original.status, // Back to review if active was approved
        versao: isApproved ? original.versao + 1 : original.versao,
      });

      if (isApproved) {
        alert('RN-PLAN-003: Como este era um plano APROVADO, sua edição gerou uma NOVA VERSÃO (v' + (original.versao + 1) + ') que foi enviada para reavaliação do Coordenador.');
      }
    } else {
      if (!verifyAction('criar')) return;

      onAddPlano({
        titulo,
        nivel,
        tema,
        duracao,
        autorId: currentUserId,
        autorNome: currentUserName,
        descricao,
        objetivos,
        exercicios,
        musicas
      });
    }

    setShowForm(false);
    resetForm();
  };

  const handleStartEdit = (p: PlanoAula) => {
    const isOwner = p.autorId === currentUserId;
    if (!verifyAction('editar_proprio', { isOwner, statusPlano: p.status })) return;

    setEditingId(p.id);
    setTitulo(p.titulo);
    setNivel(p.nivel);
    setTema(p.tema);
    setDuracao(p.duracao);
    setDescricao(p.descricao);
    setObjetivos(p.objetivos);
    setExercicios(p.exercicios);
    setMusicas(p.musicas);
    setShowForm(true);
  };

  const handleReviewAction = (id: string, decision: 'aprovado' | 'rejeitado') => {
    if (!verifyAction('aprovar')) return;
    onApproveRejectPlano(id, decision, coordinatorFeedback || undefined);
    setActiveReviewId(null);
    setCoordinatorFeedback('');
  };

  // Get list of professors who wrote plans
  const autoresList = Array.from(new Set(planos.map(p => p.autorNome)));

  // Filter lists
  const filteredPlanos = planos.filter(p => {
    const matchesSearch = p.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          p.tema.toLowerCase().includes(search.toLowerCase()) ||
                          p.autorNome.toLowerCase().includes(search.toLowerCase());
    
    const matchesNivel = nivelFilter === 'todos' || p.nivel === nivelFilter;
    const matchesAutor = autorFilter === 'todos' || p.autorNome === autorFilter;

    return matchesSearch && matchesNivel && matchesAutor;
  });

  return (
    <div className="space-y-6" id="plano-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-sans font-black text-purple-950">Biblioteca Escolar de Planos de Aula</h1>
          <p className="text-purple-450 text-sm font-medium">Biblioteca compartilhada para uniformizar a excelência pedagógica e planejar exercícios de ballet (RF-PLAN-001).</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-purple-800 hover:bg-purple-900 text-white font-black text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Criar Plano de Aula
        </button>
      </div>

      {permWarning && (
        <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{permWarning}</span>
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {showForm && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs transition-all animate-in fade-in duration-200">
          <h2 className="text-base font-sans font-semibold text-slate-800 mb-4">
            {editingId ? 'Editar Detalhes Pedagógicos' : 'Cadastrar Proposta de Plano de Aula'}
          </h2>

          {errorMsg && (
            <div className="p-3 bg-pink-50 border border-pink-100 text-pink-900 text-xs rounded-lg font-bold mb-4">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="p-3 bg-purple-50/80 border border-purple-100 text-purple-950 rounded-xl text-xs mb-4 font-medium leading-relaxed">
            ℹ️ <strong className="text-purple-700">Processo de Qualidade (RN-PLAN-001):</strong> Novas propostas permanecem como <em>"Pendente de Aprovação"</em>. Apenas o <strong>Coordenador</strong> pode homologá-las para que fiquem disponíveis no diário de classe.
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Título do Plano Pedagógico</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Noções elementares de plie e postura"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tópico / Técnica Central</label>
                  <input
                    type="text"
                    value={tema}
                    onChange={e => setTema(e.target.value)}
                    placeholder="Ex: Trabalho de Barra"
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Duração</label>
                  <input
                    type="text"
                    value={duracao}
                    onChange={e => setDuracao(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nível Pedagógico Recomendado</label>
                <select
                  value={nivel}
                  onChange={e => setNivel(e.target.value as any)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                >
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Recomendação Musical (Andamentos/Compassos)</label>
                <input
                  type="text"
                  value={musicas}
                  onChange={e => setMusicas(e.target.value)}
                  placeholder="Ex: Piano solo em compasso 3/4 lento para plies"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição Breve e Contexto</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={2}
                placeholder="Insira detalhes gerais do foco didático desta aula programada..."
                className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Objetivos Detalhados</label>
                <textarea
                  value={objetivos}
                  onChange={e => setObjetivos(e.target.value)}
                  rows={4}
                  placeholder="O que os alunos devem desenvolver hoje? (Equilíbrio, saltos, alongamento...)"
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estrutura de Exercícios Práticos</label>
                <textarea
                  value={exercicios}
                  onChange={e => setExercicios(e.target.value)}
                  rows={4}
                  placeholder="Descreva passo a passo: 1. Barra (15 min); 2. Centro (20 min); 3. Diagonais (15 min)..."
                  className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5 bg-slate-50"
                />
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
                className="bg-purple-800 hover:bg-purple-900 text-white font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer"
              >
                {editingId ? 'Salvar Edição' : 'Disparar para Aprovação'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center" id="library-filters">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="w-4 h-4 text-purple-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Pesquisar por título, técnica, autor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-purple-200 rounded-lg focus:outline-purple-500 bg-white font-bold text-purple-900 placeholder-purple-300"
          />
        </div>

        <div>
          <select
            value={nivelFilter}
            onChange={e => setNivelFilter(e.target.value as any)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
          >
            <option value="todos">Todos os Níveis</option>
            <option value="Iniciante">Iniciante</option>
            <option value="Intermediário">Intermediário</option>
            <option value="Avançado">Avançado</option>
          </select>
        </div>

        <div>
          <select
            value={autorFilter}
            onChange={e => setAutorFilter(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-semibold"
          >
            <option value="todos">Todos os Autores</option>
            {autoresList.map(aut => (
              <option key={aut} value={aut}>Prof. {aut}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Fichas Pedagógicas */}
      <div className="space-y-4 font-sans" id="plans-list">
        {filteredPlanos.length > 0 ? (
          filteredPlanos.map(p => {
            const isPendente = p.status === 'pendente_aprovacao';
            const isAprovado = p.status === 'aprovado';
            const isRejeitado = p.status === 'rejeitado';
            
            const isAuthorMe = p.autorId === currentUserId;

            return (
              <div key={p.id} className="bg-white border border-purple-100 rounded-xl p-5 shadow-3xs flex flex-col md:flex-row gap-5 hover:border-purple-300 transition-all">
                {/* Lateral do Plano com badges */}
                <div className="md:w-60 shrink-0 space-y-2 pb-4 md:pb-0 md:border-r border-purple-100 pr-4">
                  <div className="flex justify-between items-center md:block space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest font-black bg-purple-50 text-purple-700 p-1 px-2 rounded block w-fit border border-purple-100">
                      Nível: {p.nivel}
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-black p-1 px-2.5 rounded-full mt-1.5 capitalize ${
                      isAprovado ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      isPendente ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                      'bg-pink-50 text-pink-700 border border-pink-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAprovado ? 'bg-purple-500' : isPendente ? 'bg-yellow-500' : 'bg-pink-500'}`} />
                      {p.status === 'pendente_aprovacao' ? 'Pendente aprovação' : p.status}
                    </span>
                  </div>

                  <div className="space-y-1 pt-3 text-xs text-slate-500">
                    <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Autor: {p.autorNome}</p>
                    <p className="flex items-center gap-1.5"><Compass className="w-3.5 h-3.5 text-slate-400" /> Técnica: {p.tema}</p>
                    <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Tempo: {p.duracao}</p>
                    <p className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Versão: {p.versao}</p>
                  </div>
                </div>

                 {/* Conteúdo Pedagógico */}
                <div className="flex-1 space-y-4 font-sans">
                  <div>
                    <h3 className="font-sans font-black text-purple-950 text-base">{p.titulo}</h3>
                    <p className="text-slate-650 text-xs mt-1.5 leading-relaxed">{p.descricao}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-purple-50/20 p-3 rounded-lg border border-purple-100/60">
                    <div>
                      <span className="font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                        <Target className="w-4 h-4 text-purple-600" /> Objetivos Pedagógicos
                      </span>
                      <p className="text-purple-950 italic whitespace-pre-wrap">{p.objetivos}</p>
                    </div>

                    <div>
                      <span className="font-bold text-purple-950 flex items-center gap-1.5 mb-1">
                        <BookOpen className="w-4 h-4 text-purple-600" /> Programa de Exercícios
                      </span>
                      <p className="text-purple-900 whitespace-pre-wrap font-mono text-[11px] leading-tight">{p.exercicios}</p>
                    </div>
                  </div>

                  {p.musicas && (
                    <div className="flex items-center gap-2 text-xs bg-purple-50/80 border border-purple-150 p-2 rounded-lg text-purple-900 font-bold">
                      <Music className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Recomendação Musical: <strong>{p.musicas}</strong></span>
                    </div>
                  )}

                  {/* Feedback do Coordenador */}
                  {p.sugestoesMelhoria && (
                    <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-250 text-xs text-yellow-950 font-bold">
                      <strong>💡 Indicação de Ajuste do Coordenador:</strong>
                      <p className="mt-1 italic">"{p.sugestoesMelhoria}"</p>
                    </div>
                  )}

                  {/* Ações e Controles */}
                  <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-50 pt-3 self-end">
                    <span className="text-[10px] text-slate-400 font-mono">ID Único: {p.id}</span>
                    
                    <div className="flex gap-2">
                      {/* Coordinator action layout (Aprovar / Rejeitar) */}
                      {checkPermission(simulatedRole, 'plano', 'aprovar').allowed && isPendente && (
                        <div className="flex items-center gap-2">
                          {activeReviewId === p.id ? (
                            <div className="flex flex-col sm:flex-row gap-1 border border-pink-200 bg-pink-50/20 p-2 rounded-lg">
                              <input
                                type="text"
                                value={coordinatorFeedback}
                                onChange={e => setCoordinatorFeedback(e.target.value)}
                                placeholder="Sugestão de melhoria (opcional)..."
                                className="text-xs bg-white border border-slate-200 rounded p-1.5 w-60 focus:outline-purple-500"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleReviewAction(p.id, 'aprovado')}
                                  className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => handleReviewAction(p.id, 'rejeitado')}
                                  className="bg-pink-600 hover:bg-pink-700 text-white text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer"
                                >
                                  Rejeitar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveReviewId(null)}
                                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                >
                                  Voltar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveReviewId(p.id);
                                setCoordinatorFeedback('');
                              }}
                              className="bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-3xs cursor-pointer"
                            >
                              Homologar Plano (Coordenador)
                            </button>
                          )}
                        </div>
                      )}

                      {/* Professor edit actions */}
                      {((isAuthorMe && (isPendente || isRejeitado)) || simulatedRole === 'coordenador') && (
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="text-xs font-bold flex items-center gap-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 p-1.5 rounded transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar Plano
                        </button>
                      )}

                      {/* Approved re-edit logic (increases version) */}
                      {isAuthorMe && isAprovado && (
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="text-xs bg-yellow-50 hover:bg-yellow-100 border border-yellow-250 text-yellow-800 font-bold p-1.5 rounded transition-all cursor-pointer"
                          title="Edições criam uma nova versão que retrocede para aprovação, para salvaguardar as turmas (RN-PLAN-003)"
                        >
                          Revisar (v{p.versao + 1})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs bg-white border border-slate-100 rounded-xl">Nenhum plano didático encontrado para os filtros selecionados.</div>
        )}
      </div>
    </div>
  );
}
