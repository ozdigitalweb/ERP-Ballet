-- Create passwords table
CREATE TABLE IF NOT EXISTS passwords (
  email VARCHAR(255) PRIMARY KEY,
  password TEXT NOT NULL
);

-- Create contatos table
CREATE TABLE IF NOT EXISTS contatos (
  id VARCHAR(255) PRIMARY KEY,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  apelido TEXT,
  cpf VARCHAR(255) UNIQUE NOT NULL,
  telefone TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  pessoa_vinculo_id VARCHAR(255),
  observacoes TEXT,
  status TEXT NOT NULL, -- 'novo' | 'contatado' | 'convertido' | 'perdido'
  atendente TEXT NOT NULL,
  canal_origem TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pessoas table
CREATE TABLE IF NOT EXISTS pessoas (
  id VARCHAR(255) PRIMARY KEY,
  cpf VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  perfis JSONB NOT NULL, -- array of UserRole
  relacionamentos JSONB NOT NULL, -- array of Relacionamento
  contrato_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  visita_aprovada BOOLEAN DEFAULT FALSE,
  saldo_credito NUMERIC DEFAULT 0,
  observacoes TEXT
);

-- Create turmas table
CREATE TABLE IF NOT EXISTS turmas (
  id VARCHAR(255) PRIMARY KEY,
  nome TEXT NOT NULL,
  nivel TEXT NOT NULL, -- 'Iniciante' | 'Intermediário' | 'Avançado'
  horarios TEXT NOT NULL,
  sala TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  professores_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of teacher ids
  alunos_ids JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of student ids
  status TEXT NOT NULL, -- 'ativa' | 'concluída' | 'cancelada'
  capacidade_maxima INTEGER NOT NULL DEFAULT 15
);

-- Create planos_aula table
CREATE TABLE IF NOT EXISTS planos_aula (
  id VARCHAR(255) PRIMARY KEY,
  titulo TEXT NOT NULL,
  nivel TEXT NOT NULL,
  tema TEXT NOT NULL,
  duracao TEXT NOT NULL,
  autor_id TEXT NOT NULL,
  autor_nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  objetivos TEXT NOT NULL,
  exercicios TEXT NOT NULL,
  musicas TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pendente_aprovacao' | 'aprovado' | 'rejeitado'
  sugestoes_melhoria TEXT,
  versao INTEGER NOT NULL DEFAULT 1
);

-- Create aulas table
CREATE TABLE IF NOT EXISTS aulas (
  id VARCHAR(255) PRIMARY KEY,
  turma_id TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  plano_aula_id TEXT NOT NULL,
  registros JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of RegistroAulaAluno
  audit_logs JSONB NOT NULL DEFAULT '[]'::jsonb -- array of audit logs
);
