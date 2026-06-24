import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { Contato, Pessoa, Turma, PlanoAula, Aula } from '../types';

export interface SystemData {
  contatos: Contato[];
  pessoas: Pessoa[];
  turmas: Turma[];
  planos: PlanoAula[];
  aulas: Aula[];
  passwords: Record<string, string>;
}

export class DatabaseService {
  private sql: postgres.Sql | null = null;
  private isConnected = false;
  private isConfigured = false;
  private dbUrl: string | null = null;

  constructor() {
    let rawUrl = process.env.SUPABASE_DB_URL || null;
    if (rawUrl && rawUrl !== 'your_supabase_project_url' && !rawUrl.includes('[password]')) {
      try {
        if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
          const parsed = new URL(rawUrl);
          let hostname = parsed.hostname;
          
          // Typo Correction: If the host is "project-ref.supabase.co" without "db.", prepend "db."
          if (hostname.endsWith('.supabase.co') && !hostname.startsWith('db.')) {
            const projectRef = hostname.split('.')[0];
            parsed.hostname = `db.${projectRef}.supabase.co`;
            console.log(`[Supabase DB] Automatically corrected database host from "${hostname}" to "${parsed.hostname}"`);
          }
          
          this.dbUrl = parsed.toString();
          this.isConfigured = true;
        } else {
          this.dbUrl = rawUrl;
          this.isConfigured = true;
        }
      } catch (e) {
        console.log('[Supabase DB] Note: Error parsing SUPABASE_DB_URL, using raw value:', e);
        this.dbUrl = rawUrl;
        this.isConfigured = true;
      }
    }
  }

  /**
   * Check if Supabase connection string is provided and configured
   */
  public isSupabaseEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Check if the database has successfully connected
   */
  public isSupabaseConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Gets the DB URL for diagnostic purposes (hidden password)
   */
  public getDbUrlDiagnostic(): string {
    if (!this.dbUrl) return 'Não configurado';
    try {
      const parsed = new URL(this.dbUrl);
      return `postgresql://${parsed.username}@${parsed.host}${parsed.pathname}`;
    } catch {
      return 'Formato de URL inválido';
    }
  }

  /**
   * Lazy initialization of PostgreSQL connection
   */
  private getSql(): postgres.Sql {
    if (!this.isConfigured || !this.dbUrl) {
      throw new Error('Supabase database URL is not configured in .env');
    }

    if (!this.sql) {
      this.sql = postgres(this.dbUrl, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: { rejectUnauthorized: false } // Required for Supabase in Cloud environments
      });
    }
    return this.sql;
  }

  /**
   * Initializes the database schema using migrations
   */
  public async initialize(): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[Supabase DB] Supabase database URL not configured. Operating in Local Fallback mode.');
      return false;
    }

    let sqlInstance: postgres.Sql;
    try {
      sqlInstance = this.getSql();
      console.log('[Supabase DB] Attempting connection probe to Supabase on primary port...');
      await sqlInstance`SELECT 1`;
      console.log('[Supabase DB] Primary connection probe succeeded!');
      this.isConnected = true;
    } catch (error: any) {
      console.log('[Supabase DB] Note: Primary connection probe details:', error.message || error);
      
      // Try alternative port 6543 (transaction pooler) if we were trying 5432 and it timed out or was blocked
      if (this.dbUrl && (this.dbUrl.includes(':5432') || !this.dbUrl.includes(':6543'))) {
        console.log('[Supabase DB] Attempting fallback to connection pooler (port 6543)...');
        try {
          let fallbackUrl = this.dbUrl;
          if (fallbackUrl.includes(':5432')) {
            fallbackUrl = fallbackUrl.replace(':5432', ':6543');
          } else {
            // No port was specified, add :6543 to the host
            try {
              const parsed = new URL(fallbackUrl);
              parsed.port = '6543';
              fallbackUrl = parsed.toString();
            } catch (err) {
              console.log('[Supabase DB] Info: Could not parse URL to add port 6543:', err);
            }
          }

          const maskedUrl = fallbackUrl.replace(/:[^:@]+@/, ':***@');
          console.log(`[Supabase DB] Trying pooler URL: ${maskedUrl}`);
          const fallbackSql = postgres(fallbackUrl, {
            max: 5,
            idle_timeout: 20,
            connect_timeout: 10,
            ssl: { rejectUnauthorized: false }
          });
          
          await fallbackSql`SELECT 1`;
          console.log('[Supabase DB] Fallback connection to port 6543 successful!');
          
          this.dbUrl = fallbackUrl;
          this.sql = fallbackSql;
          sqlInstance = fallbackSql;
          this.isConnected = true;
        } catch (fallbackError: any) {
          console.log('[Supabase DB] Notice: connection fallback details:', fallbackError.message || fallbackError);
          this.isConnected = false;
          return false;
        }
      } else {
        this.isConnected = false;
        return false;
      }
    }

    // Now run migrations if we are connected
    if (this.isConnected) {
      try {
        console.log('[Supabase DB] Running migrations...');
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260624000000_init_schema.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          
          // Run migration statements
          await sqlInstance.unsafe(migrationSql);
          console.log('[Supabase DB] Migrations executed successfully.');
        } else {
          console.log(`[Supabase DB] Info: Migration file not found at ${migrationPath}. Creating default tables directly.`);
          await sqlInstance`
            CREATE TABLE IF NOT EXISTS passwords (
              email VARCHAR(255) PRIMARY KEY,
              password TEXT NOT NULL
            );
          `;
        }
        return true;
      } catch (migError: any) {
        console.log('[Supabase DB] Info: Database migrations check:', migError.message || migError);
        // We are connected but migration failed (possibly table already exists)
        return true;
      }
    }

    return false;
  }

  /**
   * Loads all records from Supabase
   */
  public async loadAll(): Promise<SystemData> {
    const sql = this.getSql();

    const [
      passwordsRaw,
      contatosRaw,
      pessoasRaw,
      turmasRaw,
      planosRaw,
      aulasRaw
    ] = await Promise.all([
      sql`SELECT * FROM passwords`,
      sql`SELECT * FROM contatos`,
      sql`SELECT * FROM pessoas`,
      sql`SELECT * FROM turmas`,
      sql`SELECT * FROM planos_aula`,
      sql`SELECT * FROM aulas`
    ]);

    // Map passwords Record<string, string>
    const passwords: Record<string, string> = {};
    for (const r of passwordsRaw) {
      passwords[r.email.toLowerCase()] = r.password;
    }

    // Map Contatos
    const contatos: Contato[] = contatosRaw.map(r => ({
      id: r.id,
      nome: r.nome,
      sobrenome: r.sobrenome,
      apelido: r.apelido || '',
      cpf: r.cpf,
      telefone: r.telefone,
      email: r.email,
      pessoaVinculoId: r.pessoa_vinculo_id || undefined,
      observacoes: r.observacoes || '',
      status: r.status,
      atendente: r.atendente,
      canalOrigem: r.canal_origem || '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));

    // Map Pessoas
    const pessoas: Pessoa[] = pessoasRaw.map(r => ({
      id: r.id,
      cpf: r.cpf,
      email: r.email,
      nomeCompleto: r.nome_completo,
      perfis: Array.isArray(r.perfis) ? r.perfis : JSON.parse(JSON.stringify(r.perfis)),
      relacionamentos: Array.isArray(r.relacionamentos) ? r.relacionamentos : JSON.parse(JSON.stringify(r.relacionamentos)),
      contratoAtivo: !!r.contrato_ativo,
      visitaAprovada: r.visita_aprovada === null ? undefined : !!r.visita_aprovada,
      saldoCredito: r.saldo_credito ? Number(r.saldo_credito) : 0,
      observacoes: r.observacoes || ''
    }));

    // Map Turmas
    const turmas: Turma[] = turmasRaw.map(r => ({
      id: r.id,
      nome: r.nome,
      nivel: r.nivel,
      horarios: r.horarios,
      sala: r.sala,
      dataInicio: r.data_inicio,
      dataFim: r.data_fim || '',
      professoresIds: Array.isArray(r.professores_ids) ? r.professores_ids : JSON.parse(JSON.stringify(r.professores_ids)),
      alunosIds: Array.isArray(r.alunos_ids) ? r.alunos_ids : JSON.parse(JSON.stringify(r.alunos_ids)),
      status: r.status,
      capacidadeMaxima: r.capacidade_maxima ? Number(r.capacidade_maxima) : 15
    }));

    // Map PlanosAula
    const planos: PlanoAula[] = planosRaw.map(r => ({
      id: r.id,
      titulo: r.titulo,
      nivel: r.nivel,
      tema: r.tema,
      duracao: r.duracao,
      autorId: r.autor_id,
      autorNome: r.autor_name || r.autor_nome || 'N/A',
      descricao: r.descricao,
      objetivos: r.objetivos,
      exercicios: r.exercicios,
      musicas: r.musicas,
      status: r.status,
      sugestoesMelhoria: r.sugestoes_melhoria || undefined,
      versao: r.versao ? Number(r.versao) : 1
    }));

    // Map Aulas
    const aulas: Aula[] = aulasRaw.map(r => ({
      id: r.id,
      turmaId: r.turma_id,
      dataHora: r.data_hora,
      planoAulaId: r.plano_aula_id,
      registros: Array.isArray(r.registros) ? r.registros : JSON.parse(JSON.stringify(r.registros)),
      auditLogs: Array.isArray(r.audit_logs) ? r.audit_logs : JSON.parse(JSON.stringify(r.audit_logs))
    }));

    return { passwords, contatos, pessoas, turmas, planos, aulas };
  }

  /**
   * Seeds default mock data into Supabase if DB is completely empty
   */
  public async seedIfEmpty(defaultDb: SystemData): Promise<void> {
    const sql = this.getSql();
    try {
      const [{ count }] = await sql`SELECT count(*)::int FROM pessoas`;
      if (count > 0) {
        console.log('[Supabase DB] Database is already populated. Skipping seed.');
        return;
      }

      console.log('[Supabase DB] Database is empty. Seeding mock data...');

      // Seed passwords
      for (const [email, pwd] of Object.entries(defaultDb.passwords)) {
        await sql`
          INSERT INTO passwords (email, password)
          VALUES (${email.toLowerCase()}, ${pwd})
          ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
        `;
      }

      // Seed contatos
      for (const c of defaultDb.contatos) {
        await sql`
          INSERT INTO contatos (id, nome, sobrenome, apelido, cpf, telefone, email, pessoa_vinculo_id, observacoes, status, atendente, canal_origem, created_at)
          VALUES (
            ${c.id}, ${c.nome}, ${c.sobrenome}, ${c.apelido || ''}, ${c.cpf}, ${c.telefone}, ${c.email}, 
            ${c.pessoaVinculoId || null}, ${c.observacoes || ''}, ${c.status}, ${c.atendente}, ${c.canalOrigem || ''}, ${c.createdAt ? new Date(c.createdAt) : new Date()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Seed pessoas
      for (const p of defaultDb.pessoas) {
        await sql`
          INSERT INTO pessoas (id, cpf, email, nome_completo, perfis, relacionamentos, contrato_ativo, visita_aprovada, saldo_credito, observacoes)
          VALUES (
            ${p.id}, ${p.cpf}, ${p.email}, ${p.nomeCompleto}, 
            ${sql.json(p.perfis as any)}, ${sql.json(p.relacionamentos as any)}, 
            ${p.contratoAtivo}, ${p.visitaAprovada || false}, ${p.saldoCredito || 0}, ${p.observacoes || ''}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Seed turmas
      for (const t of defaultDb.turmas) {
        await sql`
          INSERT INTO turmas (id, nome, nivel, horarios, sala, data_inicio, data_fim, professores_ids, alunos_ids, status, capacidade_maxima)
          VALUES (
            ${t.id}, ${t.nome}, ${t.nivel}, ${t.horarios}, ${t.sala}, ${t.dataInicio}, ${t.dataFim || null}, 
            ${sql.json(t.professoresIds as any)}, ${sql.json(t.alunosIds as any)}, ${t.status}, ${t.capacidadeMaxima || 15}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Seed planos
      for (const pl of defaultDb.planos) {
        await sql`
          INSERT INTO planos_aula (id, titulo, nivel, tema, duracao, autor_id, autor_nome, descricao, objetivos, exercicios, musicas, status, sugestoes_melhoria, versao)
          VALUES (
            ${pl.id}, ${pl.titulo}, ${pl.nivel}, ${pl.tema}, ${pl.duracao}, ${pl.autorId}, ${pl.autorNome}, 
            ${pl.descricao}, ${pl.objetivos}, ${pl.exercicios}, ${pl.musicas}, ${pl.status}, ${pl.sugestoesMelhoria || null}, ${pl.versao || 1}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Seed aulas
      for (const au of defaultDb.aulas) {
        await sql`
          INSERT INTO aulas (id, turma_id, data_hora, plano_aula_id, registros, audit_logs)
          VALUES (
            ${au.id}, ${au.turmaId}, ${au.dataHora}, ${au.planoAulaId}, 
            ${sql.json(au.registros as any)}, ${sql.json(au.auditLogs as any)}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }

      console.log('[Supabase DB] Database seeding completed successfully.');
    } catch (error) {
      console.log('[Supabase DB] Note: Database seeding details:', error);
    }
  }

  /**
   * Saves all records (performing complete sync/upsert of current state) to Supabase
   */
  public async saveAll(data: SystemData): Promise<void> {
    if (!this.isConnected) return;
    const sql = this.getSql();

    try {
      console.log('[Supabase DB] Synchronizing local changes with Supabase...');

      // We run inside a transaction to ensure complete consistency!
      await sql.begin(async (tx) => {
        // Clear old database records if they are deleted in memory, or use upserts
        // We will perform upsert operations for each table to guarantee consistency.

        // 1. Save passwords
        const activeEmails: string[] = [];
        for (const [email, pwd] of Object.entries(data.passwords)) {
          const formattedEmail = email.toLowerCase();
          activeEmails.push(formattedEmail);
          await tx`
            INSERT INTO passwords (email, password)
            VALUES (${formattedEmail}, ${pwd})
            ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
          `;
        }
        if (activeEmails.length > 0) {
          await tx`DELETE FROM passwords WHERE email NOT IN (${activeEmails})`;
        }

        // 2. Save contatos
        const activeContactIds = data.contatos.map(c => c.id);
        for (const c of data.contatos) {
          await tx`
            INSERT INTO contatos (id, nome, sobrenome, apelido, cpf, telefone, email, pessoa_vinculo_id, observacoes, status, atendente, canal_origem, created_at)
            VALUES (
              ${c.id}, ${c.nome}, ${c.sobrenome}, ${c.apelido || ''}, ${c.cpf}, ${c.telefone}, ${c.email}, 
              ${c.pessoaVinculoId || null}, ${c.observacoes || ''}, ${c.status}, ${c.atendente}, ${c.canalOrigem || ''}, ${c.createdAt ? new Date(c.createdAt) : new Date()}
            )
            ON CONFLICT (id) DO UPDATE SET
              nome = EXCLUDED.nome,
              sobrenome = EXCLUDED.sobrenome,
              apelido = EXCLUDED.apelido,
              cpf = EXCLUDED.cpf,
              telefone = EXCLUDED.telefone,
              email = EXCLUDED.email,
              pessoa_vinculo_id = EXCLUDED.pessoa_vinculo_id,
              observacoes = EXCLUDED.observacoes,
              status = EXCLUDED.status,
              atendente = EXCLUDED.atendente,
              canal_origem = EXCLUDED.canal_origem,
              created_at = EXCLUDED.created_at
          `;
        }
        if (activeContactIds.length > 0) {
          await tx`DELETE FROM contatos WHERE id NOT IN (${activeContactIds})`;
        }

        // 3. Save pessoas
        const activePessoaIds = data.pessoas.map(p => p.id);
        for (const p of data.pessoas) {
          await tx`
            INSERT INTO pessoas (id, cpf, email, nome_completo, perfis, relacionamentos, contrato_ativo, visita_aprovada, saldo_credito, observacoes)
            VALUES (
              ${p.id}, ${p.cpf}, ${p.email}, ${p.nomeCompleto}, 
              ${tx.json(p.perfis as any)}, ${tx.json(p.relacionamentos as any)}, 
              ${p.contratoAtivo}, ${p.visitaAprovada || false}, ${p.saldoCredito || 0}, ${p.observacoes || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              cpf = EXCLUDED.cpf,
              email = EXCLUDED.email,
              nome_completo = EXCLUDED.nome_completo,
              perfis = EXCLUDED.perfis,
              relacionamentos = EXCLUDED.relacionamentos,
              contrato_ativo = EXCLUDED.contrato_ativo,
              visita_aprovada = EXCLUDED.visita_aprovada,
              saldo_credito = EXCLUDED.saldo_credito,
              observacoes = EXCLUDED.observacoes
          `;
        }
        if (activePessoaIds.length > 0) {
          await tx`DELETE FROM pessoas WHERE id NOT IN (${activePessoaIds})`;
        }

        // 4. Save turmas
        const activeTurmaIds = data.turmas.map(t => t.id);
        for (const t of data.turmas) {
          await tx`
            INSERT INTO turmas (id, nome, nivel, horarios, sala, data_inicio, data_fim, professores_ids, alunos_ids, status, capacidade_maxima)
            VALUES (
              ${t.id}, ${t.nome}, ${t.nivel}, ${t.horarios}, ${t.sala}, ${t.dataInicio}, ${t.dataFim || null}, 
              ${tx.json(t.professoresIds as any)}, ${tx.json(t.alunosIds as any)}, ${t.status}, ${t.capacidadeMaxima || 15}
            )
            ON CONFLICT (id) DO UPDATE SET
              nome = EXCLUDED.nome,
              nivel = EXCLUDED.nivel,
              horarios = EXCLUDED.horarios,
              sala = EXCLUDED.sala,
              data_inicio = EXCLUDED.data_inicio,
              data_fim = EXCLUDED.data_fim,
              professores_ids = EXCLUDED.professores_ids,
              alunos_ids = EXCLUDED.alunos_ids,
              status = EXCLUDED.status,
              capacidade_maxima = EXCLUDED.capacidade_maxima
          `;
        }
        if (activeTurmaIds.length > 0) {
          await tx`DELETE FROM turmas WHERE id NOT IN (${activeTurmaIds})`;
        }

        // 5. Save planos
        const activePlanoIds = data.planos.map(pl => pl.id);
        for (const pl of data.planos) {
          await tx`
            INSERT INTO planos_aula (id, titulo, nivel, tema, duracao, autor_id, autor_nome, descricao, objetivos, exercicios, musicas, status, sugestoes_melhoria, versao)
            VALUES (
              ${pl.id}, ${pl.titulo}, ${pl.nivel}, ${pl.tema}, ${pl.duracao}, ${pl.autorId}, ${pl.autorNome}, 
              ${pl.descricao}, ${pl.objetivos}, ${pl.exercicios}, ${pl.musicas}, ${pl.status}, ${pl.sugestoesMelhoria || null}, ${pl.versao || 1}
            )
            ON CONFLICT (id) DO UPDATE SET
              titulo = EXCLUDED.titulo,
              nivel = EXCLUDED.nivel,
              tema = EXCLUDED.tema,
              duracao = EXCLUDED.duracao,
              autor_id = EXCLUDED.autor_id,
              autor_nome = EXCLUDED.autor_nome,
              descricao = EXCLUDED.descricao,
              objetivos = EXCLUDED.objetivos,
              exercicios = EXCLUDED.exercicios,
              musicas = EXCLUDED.musicas,
              status = EXCLUDED.status,
              sugestoes_melhoria = EXCLUDED.sugestoes_melhoria,
              versao = EXCLUDED.versao
          `;
        }
        if (activePlanoIds.length > 0) {
          await tx`DELETE FROM planos_aula WHERE id NOT IN (${activePlanoIds})`;
        }

        // 6. Save aulas
        const activeAulaIds = data.aulas.map(au => au.id);
        for (const au of data.aulas) {
          await tx`
            INSERT INTO aulas (id, turma_id, data_hora, plano_aula_id, registros, audit_logs)
            VALUES (
              ${au.id}, ${au.turmaId}, ${au.dataHora}, ${au.planoAulaId}, 
              ${tx.json(au.registros as any)}, ${tx.json(au.auditLogs as any)}
            )
            ON CONFLICT (id) DO UPDATE SET
              turma_id = EXCLUDED.turma_id,
              data_hora = EXCLUDED.data_hora,
              plano_aula_id = EXCLUDED.plano_aula_id,
              registros = EXCLUDED.registros,
              audit_logs = EXCLUDED.audit_logs
          `;
        }
        if (activeAulaIds.length > 0) {
          await tx`DELETE FROM aulas WHERE id NOT IN (${activeAulaIds})`;
        }
      });

      console.log('[Supabase DB] Synchronization completed successfully.');
    } catch (error) {
      console.log('[Supabase DB] Note: Database save details:', error);
    }
  }
}
