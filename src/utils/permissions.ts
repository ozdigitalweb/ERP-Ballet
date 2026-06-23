import { UserRole } from '../types';

export interface PermissionVerdict {
  allowed: boolean;
  reason?: string;
}

// Retorna se o perfil ativo possui permissão para executar determinada ação
export function checkPermission(
  role: UserRole,
  module: 'contato' | 'pessoa' | 'turma' | 'aula' | 'plano',
  action: 'criar' | 'editar_proprio' | 'editar_todos' | 'visualizar' | 'deletar' | 'converter' | 'vincular_perfis' | 'aprovar',
  context?: {
    isOwner?: boolean;
    statusPlano?: string;
    turmaId?: string;
    professorTurmasIds?: string[];
  }
): PermissionVerdict {
  // Diretor tem acesso total irrestrito (Nível 9)
  if (role === 'diretor') {
    return { allowed: true };
  }

  // Clientes, Alunos e Responsáveis têm acesso limitado à área do portal (sem administrativo de ERP de fato)
  const isClientPortal = ['cliente', 'aluno', 'responsavel', 'visitante'].includes(role);
  if (isClientPortal && module !== 'aula' && module !== 'pessoa') {
    // Alunos podem visualizar registros deles, etc., mas não alteram nada no sistema administrativo
    return { allowed: false, reason: 'Clientes/Alunos não acessam o painel administrativo ERP.' };
  }

  switch (module) {
    case 'contato': {
      if (action === 'visualizar') {
        if (role === 'funcionario') {
          return { allowed: true, reason: 'Visão parcial: Funcionários podem visualizar seus próprios contatos cadastrados.' };
        }
        if (role === 'professor') {
          return { allowed: false, reason: 'Professores não possuem permissão de CRM (Contatos).' };
        }
        return { allowed: true };
      }
      if (action === 'criar') {
        if (['atendimento', 'administrativo', 'funcionario'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Professores e Coordenadores não criam contatos de CRM.' };
      }
      if (action === 'editar_proprio') {
        if (['atendimento', 'administrativo', 'funcionario', 'coordenador'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'O perfil atual não gerencia dados de contatos.' };
      }
      if (action === 'editar_todos') {
        if (['atendimento', 'administrativo'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas Atendimento, Administrativo e Diretores editam contatos gerais.' };
      }
      if (action === 'deletar') {
        if (role === 'administrativo') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Exclusão de contatos permitida apenas para Administrativo e Diretor.' };
      }
      if (action === 'converter') {
        if (['atendimento', 'administrativo'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas Atendimento, Administrativo e Diretores podem converter contatos em PESSOAS.' };
      }
      break;
    }

    case 'pessoa': {
      if (action === 'visualizar') {
        if (role === 'funcionario') {
          return { allowed: true, reason: 'Modo Leitura: Funcionários visualizam cadastros básicos.' };
        }
        if (role === 'professor') {
          return { allowed: true, reason: 'Acesso Limitado: Professores visualizam dados básicos dos alunos de suas turmas.' };
        }
        return { allowed: true };
      }
      if (action === 'criar') {
        if (role === 'atendimento') {
          return { allowed: true };
        }
        if (role === 'coordenador') {
          return { allowed: true, reason: 'Aviso Coordenador: Criação limitada a aspectos pedagógicos/gerenciais.' };
        }
        if (role === 'administrativo') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Funcionários e Professores não cadastram Pessoas diretamente.' };
      }
      if (action === 'editar_proprio' || action === 'editar_todos') {
        if (role === 'atendimento') {
          return { allowed: true, reason: 'Edição limitada a contatabilidade e correções básicas.' };
        }
        if (role === 'coordenador') {
          return { allowed: true, reason: 'Edição limitada ao escopo de perfil pedagógico do aluno/professor.' };
        }
        if (role === 'administrativo') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Permissão de edição restrita a Atendimento, Coordenador, Administrativo e Direção.' };
      }
      if (action === 'vincular_perfis') {
        if (role === 'coordenador') {
          return { allowed: true, reason: 'Autorizado: Coordenadores podem gerenciar perfis de Aluno e Professor.' };
        }
        if (role === 'administrativo') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas Coordenador (Aluno/Prof), Administrativo e Diretor vinculam novos perfis.' };
      }
      if (action === 'deletar') {
        return { allowed: false, reason: 'Direito exclusivo do Diretor (Nível 9).' };
      }
      break;
    }

    case 'turma': {
      if (action === 'visualizar') {
        if (role === 'professor') {
          const inTurma = context?.professorTurmasIds?.includes(context?.turmaId || '') || false;
          if (inTurma) {
            return { allowed: true, reason: 'Visualizando turma vinculada.' };
          }
          return { allowed: false, reason: 'Professores só visualizam turmas nas quais estão vinculados.' };
        }
        if (role === 'administrativo') {
          return { allowed: true, reason: 'Apenas Visualização: Administrativo possui acesso pedagógico limitado (leitura).' };
        }
        if (['coordenador', 'atendimento'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Perfil sem permissão para painel de turmas.' };
      }
      if (['criar', 'editar_todos', 'vincular_perfis', 'deletar'].includes(action)) {
        if (role === 'coordenador') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas o Coordenador (Nível 7) ou Diretor gerencia turmas e vínculos.' };
      }
      break;
    }

    case 'aula': {
      // Registrar presença, uniforme, comportamento, atribuir plano, etc.
      if (['criar', 'editar_proprio', 'editar_todos'].includes(action)) {
        if (role === 'coordenador') {
          return { allowed: true, reason: 'Coordenadores podem gerenciar aulas pedagógicas totais.' };
        }
        if (role === 'professor') {
          const inTurma = context?.professorTurmasIds?.includes(context?.turmaId || '') || false;
          if (inTurma) {
            return { allowed: true };
          }
          return { allowed: false, reason: 'Professores só podem registrar aulas de suas próprias turmas.' };
        }
        if (role === 'funcionario') {
          return { allowed: true, reason: 'Supervisionado: Funcionários vinculados como auxiliar podem ajudar nas presenças.' };
        }
        return { allowed: false, reason: 'Registro/Edição de aulas restrito a Coordenadores e Professores da turma.' };
      }
      if (action === 'visualizar') {
        if (role === 'professor') {
          const inTurma = context?.professorTurmasIds?.includes(context?.turmaId || '') || false;
          if (inTurma) {
            return { allowed: true };
          }
          return { allowed: false, reason: 'Professores só visualizam aulas de suas turmas.' };
        }
        if (role === 'coordenador') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Acesso ao módulo pedagógico de Aulas negado.' };
      }
      break;
    }

    case 'plano': {
      if (action === 'criar') {
        if (['professor', 'coordenador'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas Professores e Coordenadores criam planos de aula.' };
      }
      if (action === 'editar_proprio') {
        if (role === 'coordenador') {
          return { allowed: true };
        }
        if (role === 'professor') {
          if (context?.isOwner) {
            if (context?.statusPlano === 'pendente_aprovacao' || context?.statusPlano === 'rejeitado') {
              return { allowed: true };
            }
            return { allowed: false, reason: 'Planos aprovados não podem ser editados diretamente. Edições criam uma nova versão para aprovação.' };
          }
          return { allowed: false, reason: 'Não é possível editar plano de aula de outros professores.' };
        }
        return { allowed: false, reason: 'Perfil sem permissão de edição em planos.' };
      }
      if (action === 'aprovar') {
        if (role === 'coordenador') {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas o Coordenador Pedagógico pode aprovar ou rejeitar planos de aula.' };
      }
      if (action === 'visualizar') {
        if (['professor', 'coordenador', 'atendimento', 'administrativo', 'funcionario'].includes(role)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'Apenas equipe escolar tem acesso ao repositório de planos.' };
      }
      break;
    }
  }

  return { allowed: false, reason: 'Ação não permitida para o perfil selecionado.' };
}

// Retorna as turmas que um professor lidera
export function getProfessorTurmas(professorId: string, turmas: { id: string; professoresIds: string[] }[]) {
  return turmas.filter(t => t.professoresIds.includes(professorId)).map(t => t.id);
}
