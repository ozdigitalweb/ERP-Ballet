import { Contato, Pessoa, Turma, PlanoAula, Aula } from './types';

export const INITIAL_PESSOAS: Pessoa[] = [
  {
    id: 'p-dir-1',
    cpf: '000.000.000-00',
    email: 'diretor@escolaballet.com.br',
    nomeCompleto: 'Arthur Lima',
    perfis: ['diretor'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-webmaster-1',
    cpf: '999.999.999-99',
    email: 'webmaster@oz.com.br',
    nomeCompleto: 'Webmaster Oz',
    perfis: ['diretor'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-admin-1',
    cpf: '444.444.444-44',
    email: 'patricia@escolaballet.com.br',
    nomeCompleto: 'Patrícia Silva',
    perfis: ['administrativo', 'funcionario'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-coord-1',
    cpf: '333.333.333-33',
    email: 'marcia@escolaballet.com.br',
    nomeCompleto: 'Márcia Mendes',
    perfis: ['coordenador'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-prof-1',
    cpf: '111.111.111-11',
    email: 'camila@escolaballet.com.br',
    nomeCompleto: 'Camila Soares',
    perfis: ['professor'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-prof-2',
    cpf: '222.222.222-22',
    email: 'renata@escolaballet.com.br',
    nomeCompleto: 'Renata Vasconcellos',
    perfis: ['professor'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  {
    id: 'p-aten-1',
    cpf: '555.555.555-55',
    email: 'beatriz@escolaballet.com.br',
    nomeCompleto: 'Beatriz Souza',
    perfis: ['atendimento'],
    relacionamentos: [],
    contratoAtivo: true,
  },
  // Aluna Clara e Mãe Mariana (Cliente / Responsável)
  {
    id: 'p-cli-1',
    cpf: '987.987.987-98',
    email: 'mariana.antunes@email.com',
    nomeCompleto: 'Mariana Antunes',
    perfis: ['cliente', 'responsavel'],
    relacionamentos: [
      { tipo: 'aluno', targetId: 'p-alu-1' }
    ],
    contratoAtivo: true,
    saldoCredito: 150.00,
  },
  {
    id: 'p-alu-1',
    cpf: '123.123.123-12',
    email: 'clara.antunes@email.com',
    nomeCompleto: 'Clara Antunes',
    perfis: ['aluno'],
    relacionamentos: [
      { tipo: 'cliente', targetId: 'p-cli-1' },
      { tipo: 'responsavel', targetId: 'p-cli-1' }
    ],
    contratoAtivo: true,
  },
  // Aluna Sofia e Pai Carlos (Cliente + Responsável)
  {
    id: 'p-cli-2',
    cpf: '654.654.654-65',
    email: 'carlos.rezende@email.com',
    nomeCompleto: 'Carlos Rezende',
    perfis: ['cliente', 'responsavel'],
    relacionamentos: [
      { tipo: 'aluno', targetId: 'p-alu-2' }
    ],
    contratoAtivo: true,
    saldoCredito: 0.00,
  },
  {
    id: 'p-alu-2',
    cpf: '456.456.456-45',
    email: 'sofia.rezende@email.com',
    nomeCompleto: 'Sofia Rezende',
    perfis: ['aluno'],
    relacionamentos: [
      { tipo: 'cliente', targetId: 'p-cli-2' },
      { tipo: 'responsavel', targetId: 'p-cli-2' }
    ],
    contratoAtivo: true,
  },
  // Aluna Isabella Costa (Aluna adulta - ela própria é a pagadora/responsável)
  {
    id: 'p-alu-3',
    cpf: '789.789.789-78',
    email: 'isabella.costa@email.com',
    nomeCompleto: 'Isabella Costa',
    perfis: ['aluno', 'cliente', 'responsavel'],
    relacionamentos: [],
    contratoAtivo: true,
    saldoCredito: 300.00,
  },
  {
    id: 'p-vis-1',
    cpf: '999.888.777-66',
    email: 'rodrigo.vis@email.com',
    nomeCompleto: 'Rodrigo Silva (Experimental)',
    perfis: ['visitante'],
    relacionamentos: [
      { tipo: 'aluno', targetId: 'p-alu-1' }
    ],
    contratoAtivo: false,
    visitaAprovada: true,
  }
];

export const INITIAL_CONTATOS: Contato[] = [
  {
    id: 'c-1',
    nome: 'Gabriela',
    sobrenome: 'Ramos',
    apelido: 'Gabi',
    cpf: '222.333.444-55',
    telefone: '(11) 98888-7777',
    email: 'gabriela.ramos@email.com',
    observacoes: 'Interessada em ballet contemporâneo para iniciantes.',
    status: 'novo',
    atendente: 'Beatriz Souza',
    canalOrigem: 'Instagram',
    createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: 'c-2',
    nome: 'Julia',
    sobrenome: 'Martins',
    apelido: 'Ju',
    cpf: '',
    telefone: '(11) 97777-6666',
    email: 'julinhamartins@email.com',
    observacoes: 'Mãe procurando ballet baby para filha de 4 anos.',
    status: 'contatado',
    atendente: 'Beatriz Souza',
    canalOrigem: 'Indicação',
    createdAt: '2026-06-21T14:30:00Z',
  },
  {
    id: 'c-3',
    nome: 'Luana',
    sobrenome: 'Sales',
    apelido: 'Lu',
    cpf: '333.444.555-66',
    telefone: '(11) 96666-5555',
    email: 'luana.sales@email.com',
    observacoes: 'Fechou contrato! Convertida para aluna.',
    status: 'convertido',
    pessoaVinculoId: 'p-alu-3',
    atendente: 'Beatriz Souza',
    canalOrigem: 'WhatsApp',
    createdAt: '2026-06-22T09:15:00Z',
  },
  {
    id: 'c-4',
    nome: 'Manuela',
    sobrenome: 'Dias',
    apelido: 'Manu',
    cpf: '',
    telefone: '(11) 95555-4444',
    email: 'manu.dias@email.com',
    observacoes: 'Avisou que os horários bateram com a escola e não tem interesse no momento.',
    status: 'perdido',
    atendente: 'Beatriz Souza',
    canalOrigem: 'Website',
    createdAt: '2026-06-18T11:00:00Z',
  }
];

export const INITIAL_PLANOS_AULA: PlanoAula[] = [
  {
    id: 'pl-1',
    titulo: 'Introdução à Postura e Posições Básicas dos Pés',
    nivel: 'Iniciante',
    tema: 'Fundamentos de Postura',
    duracao: '60 min',
    autorId: 'p-prof-1',
    autorNome: 'Camila Soares',
    descricao: 'Aula teórica-prática focando na 1ª e 2ª posições de pés, alinhamento de coluna e ativação de core.',
    objetivos: 'Aprender a sustentação corporal correta e o en dehors básico.',
    exercicios: 'Aquecimento no chão (flex/point), plies na barra em 1ª e 2ª posições, transferências de peso no centro.',
    musicas: 'Piano clássico instrumental suave, compasso 3/4 lento.',
    status: 'aprovado',
    versao: 1,
  },
  {
    id: 'pl-2',
    titulo: 'Coordenação de Port de Bras e Tendu no Centro',
    nivel: 'Iniciante',
    tema: 'Port de Bras & Tendu',
    duracao: '60 min',
    autorId: 'p-prof-1',
    autorNome: 'Camila Soares',
    descricao: 'Trabalho de braços coordenados com os movimentos dos pés na barra e centro.',
    objetivos: 'Conectar olhar, braços e pernas de forma harmônica.',
    exercicios: 'Tendu simples na barra, port de bras básico de joelhos e em pé no centro, saltos simples (temps leve).',
    musicas: 'Adagios de piano moderados.',
    status: 'aprovado',
    versao: 1,
  },
  {
    id: 'pl-3',
    titulo: 'Vaganova: Allegros, Piruetas de Dehors e Deslocamentos',
    nivel: 'Intermediário',
    tema: 'Piruetas & Pequenos Saltos',
    duracao: '90 min',
    autorId: 'p-prof-2',
    autorNome: 'Renata Vasconcellos',
    descricao: 'Desenvolvimento do equilíbrio no passe para preparação de piruetas. Sequências dinâmicas no centro.',
    objetivos: 'Melhorar spots de cabeça e segurança em giros.',
    exercicios: 'Barra completa com relevés, piruetas do en dehors da 4ª e 5ª posições, sissonnes simples no centro.',
    musicas: 'Valsas enérgicas no piano.',
    status: 'aprovado',
    versao: 1,
  },
  {
    id: 'pl-4',
    titulo: 'Foco em Grandes Allegros e Grand Jeté',
    nivel: 'Avançado',
    tema: 'Grandes Saltos',
    duracao: '90 min',
    autorId: 'p-prof-2',
    autorNome: 'Renata Vasconcellos',
    descricao: 'Treino de impulsão, abertura de pernas no ar e precisão na aterrissagem.',
    objetivos: 'Sustentação aérea e elasticidade no grand jeté.',
    exercicios: 'Pliés com molas expressivas, diagonais de grand jeté e saut de basque.',
    musicas: 'Orquestração clássica acelerada.',
    status: 'pendente_aprovacao',
    versao: 1,
  }
];

export const INITIAL_TURMAS: Turma[] = [
  {
    id: 't-1',
    nome: 'Ballet Clássico Iniciante - Infantil Sábado',
    nivel: 'Iniciante',
    horarios: 'Sábado, 09:00 - 10:00',
    sala: 'Sala de Vidro (Piso Superior)',
    dataInicio: '2026-03-01',
    dataFim: '2026-12-15',
    professoresIds: ['p-prof-1'],
    alunosIds: ['p-alu-1', 'p-alu-2'],
    status: 'ativa',
    capacidadeMaxima: 15,
  },
  {
    id: 't-2',
    nome: 'Ballet Clássico Adulto Intermediário Semanal',
    nivel: 'Intermediário',
    horarios: 'Terça e Quinta, 19:30 - 21:00',
    sala: 'Sala Estúdio Principal (Piso Térreo)',
    dataInicio: '2026-03-01',
    dataFim: '2026-12-20',
    professoresIds: ['p-prof-2'],
    alunosIds: ['p-alu-3'],
    status: 'ativa',
    capacidadeMaxima: 10,
  }
];

export const INITIAL_AULAS: Aula[] = [
  {
    id: 'au-1',
    turmaId: 't-1',
    dataHora: '2026-06-15T09:00:00Z',
    planoAulaId: 'pl-1',
    registros: [
      {
        alunoId: 'p-alu-1',
        presenca: true,
        uniformeCompleto: true,
        comportamento: 5,
      },
      {
        alunoId: 'p-alu-2',
        presenca: true,
        uniformeCompleto: false,
        comentarioUniforme: 'Esqueceu o coque de cabelo e sapatilhas rosas.',
        comportamento: 4,
      }
    ],
    auditLogs: [
      {
        quem: 'Camila Soares',
        quando: '2026-06-15T10:15:00Z',
        oQue: 'Registro inicial de presença e avaliações durante a primeira aula.',
      }
    ]
  },
  {
    id: 'au-2',
    turmaId: 't-2',
    dataHora: '2026-06-16T19:30:00Z',
    planoAulaId: 'pl-3',
    registros: [
      {
        alunoId: 'p-alu-3',
        presenca: true,
        uniformeCompleto: true,
        comportamento: 5,
      }
    ],
    auditLogs: [
      {
        quem: 'Renata Vasconcellos',
        quando: '2026-06-16T21:10:00Z',
        oQue: 'Iniciou e finalizou os registros de desempenho da aluna Isabella.',
      }
    ]
  }
];
