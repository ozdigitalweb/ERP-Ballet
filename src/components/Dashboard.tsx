import React from 'react';
import { Contato, Pessoa, Turma, PlanoAula, Aula } from '../types';
import { Users, GraduationCap, Calendar, FileText, CheckCircle, TrendingUp, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react';

interface DashboardProps {
  contatos: Contato[];
  pessoas: Pessoa[];
  turmas: Turma[];
  planos: PlanoAula[];
  aulas: Aula[];
  simulatedRole: string;
}

export default function Dashboard({ contatos, pessoas, turmas, planos, aulas, simulatedRole }: DashboardProps) {
  // Stats calculations
  const totalAlunos = pessoas.filter(p => p.perfis.includes('aluno')).length;
  const totalProfessores = pessoas.filter(p => p.perfis.includes('professor')).length;
  const totalTurmasAtivas = turmas.filter(t => t.status === 'ativa').length;
  const planosPendentes = planos.filter(p => p.status === 'pendente_aprovacao').length;

  const contatosConvertidos = contatos.filter(c => c.status === 'convertido').length;
  const totalContatos = contatos.length;
  const conversaoLeads = totalContatos > 0 ? Math.round((contatosConvertidos / totalContatos) * 100) : 0;

  // Turmas capacity warning
  const turmasCheias = turmas.filter(t => {
    const totalAlunosTurma = t.alunosIds.length;
    return totalAlunosTurma >= t.capacidadeMaxima;
  });

  // Calculate average attendance from latest registered classes
  let totalPresencasReg = 0;
  let totalRegistrosBase = 0;
  aulas.forEach(aula => {
    aula.registros.forEach(reg => {
      totalRegistrosBase++;
      if (reg.presenca) totalPresencasReg++;
    });
  });
  const presencaMedia = totalRegistrosBase > 0 ? Math.round((totalPresencasReg / totalRegistrosBase) * 100) : 0;

  // Origin channels statistics
  const canaisOrigem: Record<string, number> = {};
  contatos.forEach(c => {
    canaisOrigem[c.canalOrigem] = (canaisOrigem[c.canalOrigem] || 0) + 1;
  });

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-purple-950 rounded-2xl p-6 text-white shadow-lg border-b-4 border-yellow-300">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 text-xs font-mono tracking-widest uppercase mb-1 font-bold">
              <Sparkles className="w-4 h-4 fill-yellow-300" /> Academia de Ballet Corpo & Arte
            </div>
            <h1 className="text-3xl font-sans font-black tracking-tight drop-shadow-xs">Painel de Controle</h1>
            <p className="text-purple-100 text-sm mt-1 max-w-xl font-medium">
              Bem-vindo ao ERP Ballet. Monitore de ponta a ponta a conversão de leads, gerenciamento de matrículas, turmas, aulas e controle pedagógico de planos de aula.
            </p>
          </div>
          <div className="bg-purple-900/40 backdrop-blur-md border border-fuchsia-300/30 rounded-xl p-3 px-4 text-xs font-mono self-start md:self-auto shadow-inner">
            <span className="text-yellow-300 font-bold">Ambiente de Operações:</span>
            <div className="text-sm font-black capitalize tracking-wide text-white mt-1">
              {simulatedRole} • Nível de Acesso
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-white border-2 border-purple-50 rounded-xl p-5 shadow-xs hover:border-purple-200 transition-all flex items-center gap-4">
          <div className="p-3.5 bg-fuchsia-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-purple-400 text-xs font-bold uppercase tracking-wider">Alunos Ativos</p>
            <h3 className="text-2xl font-black font-sans text-purple-950">{totalAlunos}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{totalProfessores} professores na equipe</p>
          </div>
        </div>

        <div className="bg-white border-2 border-purple-50 rounded-xl p-5 shadow-xs hover:border-purple-200 transition-all flex items-center gap-4">
          <div className="p-3.5 bg-pink-50 text-pink-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-pink-500 text-xs font-bold uppercase tracking-wider">Conversão de Leads</p>
            <h3 className="text-2xl font-black font-sans text-purple-950">{conversaoLeads}%</h3>
            <p className="text-slate-500 text-xs mt-0.5">{contatosConvertidos} de {totalContatos} leads convertidos</p>
          </div>
        </div>

        <div className="bg-white border-2 border-purple-50 rounded-xl p-5 shadow-xs hover:border-purple-200 transition-all flex items-center gap-4">
          <div className="p-3.5 bg-purple-150/10 text-purple-800 rounded-lg bg-purple-50">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-purple-650 text-xs font-bold uppercase tracking-wider">Turmas Ativas</p>
            <h3 className="text-2xl font-black font-sans text-purple-950">{totalTurmasAtivas}</h3>
            <p className="text-slate-500 text-xs mt-0.5">Frequência média de {presencaMedia}%</p>
          </div>
        </div>

        <div className="bg-white border-2 border-yellow-200 rounded-xl p-5 shadow-xs hover:border-yellow-300 transition-all flex items-center gap-4 bg-yellow-50/10">
          <div className="p-3.5 bg-yellow-100 text-yellow-800 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-yellow-750 text-xs font-bold uppercase tracking-wider">Planos Pendentes</p>
            <h3 className="text-2xl font-black font-sans text-yellow-950">{planosPendentes}</h3>
            <p className="text-slate-600 text-xs mt-0.5">Aguardando Coordenador</p>
          </div>
        </div>
      </div>

      {/* Seção de Alertas e Informações Importantes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Alertas e Metas */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
            <h2 className="text-lg font-sans font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Monitores e Alertas Operacionais
            </h2>

            {turmasCheias.length > 0 ? (
              <div className="space-y-3">
                {turmasCheias.map(t => (
                  <div key={t.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900 flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{t.nome}</span> está cheia ({t.alunosIds.length}/{t.capacidadeMaxima} alunos).
                      <p className="text-xs text-yellow-705 mt-1">
                        RN-TURM-004: Notificação emitida. Novos cadastros dependem de decisão sob revisão do <strong>Coordenador</strong>.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg text-purple-950 flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-fuchsia-600" />
                <div>Todas as turmas ativas possuem vagas disponíveis dentro da capacidade máxima (RN-TURM-004).</div>
              </div>
            )}

            {planosPendentes > 0 && (
              <div className="mt-4 p-3 bg-pink-50 border border-pink-100 rounded-lg text-pink-950 flex items-start gap-3 text-sm animate-pulse">
                <FileText className="w-5 h-5 text-pink-600 shrink-0 mt-0.5" />
                <div>
                  Há <strong className="text-pink-700">{planosPendentes} Plano(s) de Aula</strong> pendente(s) de revisão.
                  <p className="text-xs text-pink-805 mt-0.5 font-sans">
                    RN-PLAN-001: Para garantir a alta qualidade pedagógica, os professores buscam aprovação do <strong>Coordenador</strong> para iniciar as correspondentes aulas.
                  </p>
                </div>
              </div>
            )}

            {/* Explicações rápidas das regras da especificação técnica */}
            <div className="mt-6 border-t border-purple-100 pt-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-500 mb-2 font-bold">Visão Geral de Regras da Especificação</h4>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-5">
                <li><strong>Unicidade Absoluta:</strong> CPFs e E-mails de Pessoas são estritamente validados no salvamento (RN-PESS-001).</li>
                <li><strong>Perfis Cumulativos:</strong> Uma mesma pessoa pode acumular múltiplos perfis (ex: Aluno, Responsável, Professor).</li>
                <li><strong>Garantia Pedagógica:</strong> Aulas não podem ser iniciadas sem que haja um Plano de Aula previamente aprovado pelo Coordenador (RN-AULA-001).</li>
                <li><strong>Histórico Imutável:</strong> Cadastros de presença e uniforme no diário de classe não podem ser excluídos, apenas retificados com registro de auditoria (RN-AULA-005).</li>
              </ul>
            </div>
          </div>

          {/* Gráfico de Canais de Origem */}
          <div className="bg-white border border-purple-50 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-sans font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" /> Canais de Origem (Lead Sourcing)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(canaisOrigem).length > 0 ? (
                Object.entries(canaisOrigem).map(([canal, count]) => {
                  const percent = Math.round((count / totalContatos) * 100);
                  return (
                    <div key={canal} className="p-3 bg-purple-50/30 rounded-lg border border-purple-100/55">
                      <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                        <span className="font-semibold text-purple-900">{canal}</span>
                        <span className="text-purple-750 font-medium">{count} lead(s) • {percent}%</span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center text-slate-400 text-xs py-4">Nenhum canal de origem de lead cadastrado.</div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Atividades Recentes & Gráfico Circular */}
        <div className="col-span-1 lg:col-span-5 space-y-6">
          <div className="bg-white border border-purple-50 rounded-xl p-5 shadow-xs flex flex-col items-center justify-center text-center">
            <h2 className="text-base font-sans font-semibold text-slate-800 mb-4 w-full text-left">Frequência Geral de Alunos</h2>
            
            {/* Elegant Circular Attendance Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
              <span className="absolute text-3xl font-black text-purple-950 font-sans">{presencaMedia}%</span>
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  className="stroke-purple-100 fill-none"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  className="stroke-fuchsia-500 fill-none transition-all duration-1000"
                  strokeWidth="12"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * presencaMedia) / 100}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-500 max-w-xs">
              Métrica de presença coletada de todos os registros históricos de aulas arquivados no diário escolar.
            </p>
          </div>

          <div className="bg-white border border-purple-50 rounded-xl p-5 shadow-xs">
            <h2 className="text-base font-sans font-semibold text-slate-800 mb-4">Múltiplos Perfis da Escola</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-purple-50">
                <span>Alunos Totais</span>
                <span className="font-mono bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">{totalAlunos}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-purple-50">
                <span>Professores Ativos</span>
                <span className="font-mono bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">{totalProfessores}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-purple-50">
                <span>Contatos (Leads) Ativos</span>
                <span className="font-mono bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">{totalContatos}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Planos de Aula Aprovados</span>
                <span className="font-mono bg-yellow-100 text-yellow-850 font-bold px-2 py-0.5 rounded">
                  {planos.filter(p => p.status === 'aprovado').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
