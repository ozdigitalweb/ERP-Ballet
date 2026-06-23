export type LeadStatus = 'novo' | 'contatado' | 'convertido' | 'perdido';

export interface Contato {
  id: string;
  nome: string;
  sobrenome: string;
  apelido: string;
  cpf: string;
  telefone: string;
  email: string;
  pessoaVinculoId?: string;
  observacoes: string;
  status: LeadStatus;
  atendente: string;
  canalOrigem: string;
  createdAt: string;
}

export type UserRole =
  | 'diretor'        // Nível 9
  | 'administrativo' // Nível 8
  | 'coordenador'    // Nível 7
  | 'professor'      // Nível 5
  | 'atendimento'    // Nível 3
  | 'funcionario'    // Nível 2
  | 'cliente'        // Nível 1
  | 'aluno'          // Nível 1
  | 'responsavel'    // Nível 1
  | 'visitante';     // Nível 1

export interface Relacionamento {
  tipo: 'cliente' | 'responsavel' | 'aluno' | 'visitante';
  targetId: string; // ID da outra Pessoa
}

export interface Pessoa {
  id: string; // UUID ou CPF interno
  cpf: string; // Obrigatório e Único
  email: string; // Obrigatório e Único
  nomeCompleto: string; // Obrigatório
  perfis: UserRole[]; // Múltiplos simultâneos!
  relacionamentos: Relacionamento[];
  contratoAtivo: boolean;
  visitaAprovada?: boolean;
  saldoCredito?: number;
  observacoes?: string;
}

export interface Turma {
  id: string;
  nome: string;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
  horarios: string;
  sala: string;
  dataInicio: string;
  dataFim: string;
  professoresIds: string[]; // Lista de Pessoas Professor
  alunosIds: string[]; // Lista de Pessoas Aluno
  status: 'ativa' | 'concluída' | 'cancelada';
  capacidadeMaxima: number;
}

export interface PlanoAula {
  id: string;
  titulo: string;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado';
  tema: string;
  duracao: string;
  autorId: string; // ID do professor
  autorNome: string;
  descricao: string;
  objetivos: string;
  exercicios: string;
  musicas: string;
  status: 'pendente_aprovacao' | 'aprovado' | 'rejeitado';
  sugestoesMelhoria?: string;
  versao: number;
}

export interface RegistroAulaAluno {
  alunoId: string;
  presenca: boolean;
  uniformeCompleto: boolean;
  comentarioUniforme?: string;
  comportamento?: number; // 1-5 estrelas (opcional)
}

export interface Aula {
  id: string;
  turmaId: string;
  dataHora: string;
  planoAulaId: string; // Obrigatório
  registros: RegistroAulaAluno[];
  auditLogs: {
    quem: string;
    quando: string;
    oQue: string;
  }[];
}
