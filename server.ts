import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Contato, Pessoa, Turma, PlanoAula, Aula, UserRole } from "./src/types";

// Database Service for Supabase
import { DatabaseService, SystemData } from "./src/db/databaseService";

// Seed data imports
import {
  INITIAL_CONTATOS,
  INITIAL_PESSOAS,
  INITIAL_TURMAS,
  INITIAL_PLANOS_AULA,
  INITIAL_AULAS
} from "./src/mockData";

const DB_FILE = path.join(process.cwd(), "database.json");
const dbService = new DatabaseService();

// Ensure database file exists
function loadDatabase(): SystemData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading database, resetting...", error);
  }

  // Seed default database
  const defaultDb: SystemData = {
    contatos: INITIAL_CONTATOS,
    pessoas: INITIAL_PESSOAS,
    turmas: INITIAL_TURMAS,
    planos: INITIAL_PLANOS_AULA,
    aulas: INITIAL_AULAS,
    passwords: {
      "webmaster@oz.com.br": "30tnvsserp",
      "diretor@escolaballet.com.br": "senha123",
      "marcia@escolaballet.com.br": "senha123",
      "camila@escolaballet.com.br": "senha123",
      "renata@escolaballet.com.br": "senha123",
      "patricia@escolaballet.com.br": "senha123",
      "beatriz@escolaballet.com.br": "senha123",
      "mariana.antunes@email.com": "senha123",
      "clara.antunes@email.com": "senha123",
      "sofia.rezende@email.com": "senha123",
      "carlos.rezende@email.com": "senha123",
      "isabella.costa@email.com": "senha123",
      "rodrigo.vis@email.com": "senha123"
    }
  };
  saveDatabase(defaultDb);
  return defaultDb;
}

function saveDatabase(data: SystemData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    if (dbService.isSupabaseConnected()) {
      dbService.saveAll(data).catch((err) => {
        console.error("[Supabase DB] Error in background database save:", err);
      });
    }
  } catch (error) {
    console.error("Error saving database file", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Memory/File DB reference loaded immediately so server starts instantly and is fully functional
  let db = loadDatabase();
  const isSupabaseEnabled = dbService.isSupabaseEnabled();

  if (isSupabaseEnabled) {
    // Run Supabase initialization and synchronization asynchronously in the background
    // This prevents blocking server startup (avoiding Cloud Run TCP startup probe timeout errors)
    dbService.initialize()
      .then(async (isConnected) => {
        if (isConnected) {
          try {
            const defaultDb: SystemData = {
              contatos: INITIAL_CONTATOS,
              pessoas: INITIAL_PESSOAS,
              turmas: INITIAL_TURMAS,
              planos: INITIAL_PLANOS_AULA,
              aulas: INITIAL_AULAS,
              passwords: {
                "webmaster@oz.com.br": "30tnvsserp",
                "diretor@escolaballet.com.br": "senha123",
                "marcia@escolaballet.com.br": "senha123",
                "camila@escolaballet.com.br": "senha123",
                "renata@escolaballet.com.br": "senha123",
                "patricia@escolaballet.com.br": "senha123",
                "beatriz@escolaballet.com.br": "senha123",
                "mariana.antunes@email.com": "senha123",
                "clara.antunes@email.com": "senha123",
                "sofia.rezende@email.com": "senha123",
                "carlos.rezende@email.com": "senha123",
                "isabella.costa@email.com": "senha123",
                "rodrigo.vis@email.com": "senha123"
              }
            };
            await dbService.seedIfEmpty(defaultDb);
            const loadedDb = await dbService.loadAll();
            db = loadedDb;
            console.log('[Supabase DB] Initial state loaded successfully from Supabase (async).');
          } catch (err) {
            console.error('[Supabase DB] Failed to load data from Supabase (async):', err);
          }
        } else {
          console.log('[Supabase DB] Database connection failed. Operating in local JSON mode.');
        }
      })
      .catch((err) => {
        console.error('[Supabase DB] Error in background database initialization:', err);
      });
  }

  // Helper middleware to authenticate via Token
  function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Não autenticado." });
      return;
    }

    const token = authHeader.substring(7); // "tok-p-dir-1"
    const userId = token.replace(/^tok-/, "");

    const foundUser = db.pessoas.find(p => p.id === userId);
    if (!foundUser) {
      res.status(401).json({ error: "Token inválido ou expirado." });
      return;
    }

    // Capture the target role based on request headers (or support client switching if multiple roles, fallback to first)
    const clientSelectedRole = req.headers["x-user-role"] as string;
    let activeRole: UserRole = foundUser.perfis[0] || "aluno";
    if (clientSelectedRole && foundUser.perfis.includes(clientSelectedRole as UserRole)) {
      activeRole = clientSelectedRole as UserRole;
    }

    (req as any).user = foundUser;
    (req as any).activeRole = activeRole;
    next();
  }

  // --- DB Status API (Public to check Supabase configuration) ---
  app.get("/api/db-status", (req, res) => {
    res.json({
      supabaseEnabled: dbService.isSupabaseEnabled(),
      supabaseConnected: dbService.isSupabaseConnected(),
      connectionStringDiagnostic: dbService.getDbUrlDiagnostic(),
      mode: dbService.isSupabaseConnected() ? "supabase" : "local-file"
    });
  });

  // --- Auth API ---
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email é obrigatório." });
      return;
    }

    const foundUser = db.pessoas.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      res.status(401).json({ error: "Nenhum usuário cadastrado com este e-mail." });
      return;
    }

    const correctPassword = db.passwords[email.toLowerCase()] || "senha123";
    if (password !== correctPassword) {
      res.status(401).json({ error: "Senha incorreta. Tente 'senha123' ou fale com o administrador." });
      return;
    }

    // Successful login
    const token = `tok-${foundUser.id}`;
    res.json({
      token,
      user: foundUser,
      roles: foundUser.perfis
    });
  });

  app.get("/api/auth/me", authenticateUser, (req, res) => {
    const user = (req as any).user;
    const activeRole = (req as any).activeRole;
    res.json({
      user,
      activeRole,
      roles: user.perfis
    });
  });

  app.post("/api/auth/verify-recovery", (req, res) => {
    const { email, cpf } = req.body;
    if (!email || !cpf) {
      res.status(400).json({ error: "E-mail e CPF são obrigatórios para a recuperação." });
      return;
    }

    const foundUser = db.pessoas.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      res.status(404).json({ error: "Nenhum usuário cadastrado com este e-mail." });
      return;
    }

    // Compare CPF ignoring dots and hyphens
    const cleanCpfInput = cpf.replace(/\D/g, "");
    const cleanCpfDb = foundUser.cpf.replace(/\D/g, "");

    if (!cleanCpfInput || cleanCpfInput !== cleanCpfDb) {
      res.status(400).json({ error: "O CPF informado não confere com os dados do usuário cadastrado." });
      return;
    }

    res.json({ success: true, message: "Identidade confirmada com sucesso!" });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { email, cpf, newPassword } = req.body;
    if (!email || !cpf || !newPassword) {
      res.status(400).json({ error: "E-mail, CPF e a nova senha são obrigatórios." });
      return;
    }

    const foundUser = db.pessoas.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    const cleanCpfInput = cpf.replace(/\D/g, "");
    const cleanCpfDb = foundUser.cpf.replace(/\D/g, "");

    if (!cleanCpfInput || cleanCpfInput !== cleanCpfDb) {
      res.status(400).json({ error: "O CPF informado não confere com os dados do usuário cadastrado." });
      return;
    }

    if (newPassword.trim().length < 4) {
      res.status(400).json({ error: "A nova senha deve possuir no mínimo 4 caracteres." });
      return;
    }

    db.passwords[email.toLowerCase()] = newPassword;
    saveDatabase(db);

    res.json({ success: true, message: "Sua senha foi redefinida com sucesso! Agora você pode fazer o login." });
  });

  // --- Reset Database ---
  app.post("/api/reset-database", (req, res) => {
    db = {
      contatos: INITIAL_CONTATOS,
      pessoas: INITIAL_PESSOAS,
      turmas: INITIAL_TURMAS,
      planos: INITIAL_PLANOS_AULA,
      aulas: INITIAL_AULAS,
      passwords: {
        "webmaster@oz.com.br": "30tnvsserp",
        "diretor@escolaballet.com.br": "senha123",
        "marcia@escolaballet.com.br": "senha123",
        "camila@escolaballet.com.br": "senha123",
        "renata@escolaballet.com.br": "senha123",
        "patricia@escolaballet.com.br": "senha123",
        "beatriz@escolaballet.com.br": "senha123",
        "mariana.antunes@email.com": "senha123",
        "clara.antunes@email.com": "senha123",
        "sofia.rezende@email.com": "senha123",
        "carlos.rezende@email.com": "senha123",
        "isabella.costa@email.com": "senha123",
        "rodrigo.vis@email.com": "senha123"
      }
    };
    saveDatabase(db);
    res.json({ status: "ok", message: "Banco de dados restaurado com sucesso." });
  });

  // --- Contatos CRUD ---
  app.get("/api/contatos", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (role === "professor") {
      res.status(403).json({ error: "Acesso negado: Professores não têm permissão de CRM." });
      return;
    }
    // Return all
    res.json(db.contatos);
  });

  app.post("/api/contatos", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["atendimento", "administrativo", "funcionario", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão insuficiente para criar contatos." });
      return;
    }

    const { nome, sobrenome, apelido, cpf, telefone, email, observacoes, atendente, canalOrigem } = req.body;
    const newContact: Contato = {
      id: `c-${Date.now()}`,
      nome: nome || "",
      sobrenome: sobrenome || "",
      apelido: apelido || "",
      cpf: cpf || "",
      telefone: telefone || "",
      email: email || "",
      observacoes: observacoes || "",
      status: "novo",
      atendente: atendente || "",
      canalOrigem: canalOrigem || "",
      createdAt: new Date().toISOString()
    };

    db.contatos.unshift(newContact);
    saveDatabase(db);
    res.status(201).json(newContact);
  });

  app.put("/api/contatos/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["atendimento", "administrativo", "funcionario", "coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão insuficiente para alterar leads." });
      return;
    }

    const id = req.params.id;
    const index = db.contatos.findIndex(c => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Contato não encontrado." });
      return;
    }

    db.contatos[index] = {
      ...db.contatos[index],
      ...req.body,
      id // force maintain ID
    };

    saveDatabase(db);
    res.json(db.contatos[index]);
  });

  app.delete("/api/contatos/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["administrativo", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão insuficiente para excluir contatos do CRM." });
      return;
    }

    const id = req.params.id;
    db.contatos = db.contatos.filter(c => c.id !== id);
    saveDatabase(db);
    res.json({ status: "ok" });
  });

  // Lead Conversion endpoint
  app.post("/api/contatos/:id/converter", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["atendimento", "administrativo", "diretor"].includes(role)) {
      res.status(403).json({ error: "Apenas Atendimento, Administrativo e Diretores convertem leads." });
      return;
    }

    const id = req.params.id;
    const { cpf, email, perfis } = req.body;
    const contactIndex = db.contatos.findIndex(c => c.id === id);
    if (contactIndex === -1) {
      res.status(404).json({ error: "Lead não encontrado." });
      return;
    }

    const contato = db.contatos[contactIndex];
    const newPessoaId = `p-${Date.now()}`;
    const newPessoa: Pessoa = {
      id: newPessoaId,
      cpf: cpf || contato.cpf,
      email: email || contato.email,
      nomeCompleto: `${contato.nome} ${contato.sobrenome}`.trim(),
      perfis: perfis || ["aluno"],
      relacionamentos: [],
      contratoAtivo: true,
      saldoCredito: 0,
      observacoes: contato.observacoes
    };

    if (newPessoa.perfis.includes("aluno")) {
      newPessoa.relacionamentos = [
        { tipo: "cliente", targetId: "p-cli-1" },
        { tipo: "responsavel", targetId: "p-cli-1" }
      ];
    }

    db.pessoas.unshift(newPessoa);
    db.passwords[newPessoa.email.toLowerCase()] = "senha123";

    // Mark contact as converted
    db.contatos[contactIndex] = {
      ...contato,
      status: "convertido",
      pessoaVinculoId: newPessoaId,
      observacoes: `Convertido oficialmente em Pessoa em ${new Date().toLocaleDateString('pt-BR')}. ` + contato.observacoes
    };

    saveDatabase(db);
    res.json({ pessoa: newPessoa, contato: db.contatos[contactIndex] });
  });

  // --- Pessoas CRUD ---
  app.get("/api/pessoas", authenticateUser, (req, res) => {
    res.json(db.pessoas);
  });

  app.post("/api/pessoas", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["atendimento", "coordenador", "administrativo", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão de criação restrita." });
      return;
    }

    const { cpf, email, nomeCompleto, perfis, relacionamentos, contratoAtivo, saldoCredito, observacoes } = req.body;
    if (!cpf || !email || !nomeCompleto) {
      res.status(450).json({ error: "CPF, Email e Nome Completo são obrigatórios." });
      return;
    }

    // Check pre-existing unique values
    const duplicate = db.pessoas.some(p => p.cpf === cpf || p.email.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      res.status(400).json({ error: "Já existe uma pessoa registrada com este CPF ou E-mail." });
      return;
    }

    const newPessoa: Pessoa = {
      id: `p-${Date.now()}`,
      cpf,
      email,
      nomeCompleto,
      perfis: perfis || ["aluno"],
      relacionamentos: relacionamentos || [],
      contratoAtivo: contratoAtivo !== undefined ? contratoAtivo : true,
      saldoCredito: saldoCredito || 0,
      observacoes: observacoes || ""
    };

    db.pessoas.unshift(newPessoa);
    db.passwords[email.toLowerCase()] = "senha123";

    saveDatabase(db);
    res.status(201).json(newPessoa);
  });

  app.put("/api/pessoas/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["atendimento", "coordenador", "administrativo", "diretor"].includes(role)) {
      res.status(403).json({ error: "Sem privilégios de edição na ficha cadastral." });
      return;
    }

    const id = req.params.id;
    const index = db.pessoas.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Pessoa não encontrada." });
      return;
    }

    const originalEmail = db.pessoas[index].email;
    db.pessoas[index] = {
      ...db.pessoas[index],
      ...req.body,
      id // Preserve ID
    };

    // If email changed, migrate password
    if (req.body.email && req.body.email.toLowerCase() !== originalEmail.toLowerCase()) {
      const oldPwd = db.passwords[originalEmail.toLowerCase()] || "senha123";
      db.passwords[req.body.email.toLowerCase()] = oldPwd;
      delete db.passwords[originalEmail.toLowerCase()];
    }

    saveDatabase(db);
    res.json(db.pessoas[index]);
  });

  app.delete("/api/pessoas/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (role !== "diretor") {
      res.status(403).json({ error: "Exclusão permitida exclusivamente para o Diretor." });
      return;
    }

    const id = req.params.id;
    const person = db.pessoas.find(p => p.id === id);
    if (person) {
      delete db.passwords[person.email.toLowerCase()];
    }
    db.pessoas = db.pessoas.filter(p => p.id !== id);
    saveDatabase(db);
    res.json({ status: "ok" });
  });

  // --- Turmas CRUD ---
  app.get("/api/turmas", authenticateUser, (req, res) => {
    res.json(db.turmas);
  });

  app.post("/api/turmas", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Apenas Coordenador ou Diretor cria turmas." });
      return;
    }

    const { nome, nivel, horarios, sala, dataInicio, dataFim, professoresIds, alunosIds, status, capacidadeMaxima } = req.body;
    if (!nome || !nivel || !horarios || !dataInicio) {
      res.status(400).json({ error: "Nome, nível, horários e data de início são obrigatórios." });
      return;
    }

    const newTurma: Turma = {
      id: `t-${Date.now()}`,
      nome,
      nivel,
      horarios,
      sala: sala || "Sala Geral",
      dataInicio,
      dataFim: dataFim || "",
      professoresIds: professoresIds || [],
      alunosIds: alunosIds || [],
      status: status || "ativa",
      capacidadeMaxima: capacidadeMaxima || 15
    };

    db.turmas.unshift(newTurma);
    saveDatabase(db);
    res.status(201).json(newTurma);
  });

  app.put("/api/turmas/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Apenas Coordenador ou Diretor altera parâmetros de turmas." });
      return;
    }

    const id = req.params.id;
    const index = db.turmas.findIndex(t => t.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Turma não encontrada." });
      return;
    }

    db.turmas[index] = {
      ...db.turmas[index],
      ...req.body,
      id
    };

    saveDatabase(db);
    res.json(db.turmas[index]);
  });

  app.delete("/api/turmas/:id", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Apenas Coordenador ou Diretor exclui turmas." });
      return;
    }

    const id = req.params.id;
    db.turmas = db.turmas.filter(t => t.id !== id);
    saveDatabase(db);
    res.json({ status: "ok" });
  });

  // --- Planos de Aula CRUD ---
  app.get("/api/planos", authenticateUser, (req, res) => {
    res.json(db.planos);
  });

  app.post("/api/planos", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["professor", "coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão insuficiente para criar planos de aula." });
      return;
    }

    const { titulo, nivel, tema, duracao, descricao, objetivos, exercicios, musicas } = req.body;
    const user = (req as any).user;

    const newPlano: PlanoAula = {
      id: `pl-${Date.now()}`,
      titulo: titulo || "Plano de Aula sem Título",
      nivel: nivel || "Iniciante",
      tema: tema || "",
      duracao: duracao || "60 min",
      autorId: user.id,
      autorNome: user.nomeCompleto,
      descricao: descricao || "",
      objetivos: objetivos || "",
      exercicios: exercicios || "",
      musicas: musicas || "",
      status: "pendente_aprovacao",
      versao: 1
    };

    db.planos.unshift(newPlano);
    saveDatabase(db);
    res.status(201).json(newPlano);
  });

  app.put("/api/planos/:id", authenticateUser, (req, res) => {
    const id = req.params.id;
    const index = db.planos.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Plano de aula não encontrado." });
      return;
    }

    db.planos[index] = {
      ...db.planos[index],
      ...req.body,
      id
    };

    saveDatabase(db);
    res.json(db.planos[index]);
  });

  app.post("/api/planos/:id/aprovar", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Apenas coordenador possui outorga para aprovar planos de aula." });
      return;
    }

    const id = req.params.id;
    const { status, sugestoesMelhoria } = req.body;
    const index = db.planos.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Plano de aula não encontrado." });
      return;
    }

    db.planos[index].status = status || "aprovado";
    if (sugestoesMelhoria !== undefined) {
      db.planos[index].sugestoesMelhoria = sugestoesMelhoria;
    }

    saveDatabase(db);
    res.json(db.planos[index]);
  });

  // --- Aulas CRUD ---
  app.get("/api/aulas", authenticateUser, (req, res) => {
    res.json(db.aulas);
  });

  app.post("/api/aulas", authenticateUser, (req, res) => {
    const role = (req as any).activeRole;
    if (!["professor", "coordenador", "diretor"].includes(role)) {
      res.status(403).json({ error: "Permissão insuficiente para criar ocorrências de aula." });
      return;
    }

    const { turmaId, dataHora, planoAulaId, registros } = req.body;
    const user = (req as any).user;

    const newAula: Aula = {
      id: `au-${Date.now()}`,
      turmaId: turmaId || "",
      dataHora: dataHora || new Date().toISOString(),
      planoAulaId: planoAulaId || "",
      registros: registros || [],
      auditLogs: [{
        quem: user.nomeCompleto,
        quando: new Date().toISOString(),
        oQue: "Registro criado pelo diário de chamadas integrado."
      }]
    };

    db.aulas.unshift(newAula);
    saveDatabase(db);
    res.status(201).json(newAula);
  });

  app.put("/api/aulas/:id", authenticateUser, (req, res) => {
    const id = req.params.id;
    const index = db.aulas.findIndex(a => a.id === id);
    if (index === -1) {
      res.status(404).json({ error: "Ocorrência de aula não encontrada." });
      return;
    }

    const originalLogs = db.aulas[index].auditLogs || [];
    const user = (req as any).user;

    db.aulas[index] = {
      ...db.aulas[index],
      ...req.body,
      id,
      auditLogs: [
        ...originalLogs,
        {
          quem: user.nomeCompleto,
          quando: new Date().toISOString(),
          oQue: "Registro atualizado com sincronização no servidor."
        }
      ]
    };

    saveDatabase(db);
    res.json(db.aulas[index]);
  });

  // --- Serve Frontend ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
