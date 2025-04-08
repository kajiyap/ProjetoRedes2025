const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = 3000;

// Usa o nome do contêiner como identificador
const SERVER_NAME = process.env.HOSTNAME || "Servidor Desconhecido";

// Configuração do banco de dados PostgreSQL
const pool = new Pool({
  user: "admin",
  host: "", // nome do serviço no docker-compose
  database: "", // nome do seu banco
  password: "", // sua senha
  port: 5432,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Rota para listar usuários com nome do servidor
app.get("/usuarios", async (req, res) => {
  try {
    console.log("Recebida solicitação GET para /usuarios");
    const result = await pool.query("SELECT * FROM usuarios");
    console.log("Consulta executada com sucesso:", result.rows);

    res.json({
      servidor: SERVER_NAME,
      usuarios: result.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).send("Erro ao buscar usuários");
  }
});

// Rota para adicionar usuário
app.post("/usuarios", async (req, res) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ error: "Nome e email são obrigatórios" });
    }

    console.log(`Tentativa de adicionar usuário: ${nome}, ${email}`);
    await pool.query("INSERT INTO usuarios (nome, email) VALUES ($1, $2)", [nome, email]);
    console.log("Usuário adicionado com sucesso");
    res.send("Usuário adicionado!");
  } catch (err) {
    console.error("Erro ao adicionar usuário:", err);
    res.status(500).send("Erro ao adicionar usuário");
  }
});

// Rota para excluir usuário
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Tentativa de deletar usuário com ID: ${id}`);

    const { rowCount } = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    console.log("Usuário removido com sucesso");
    res.send("Usuário removido!");
  } catch (err) {
    console.error("Erro ao excluir usuário:", err);
    res.status(500).send("Erro ao excluir usuário");
  }
});

// Inicializa o servidor apenas após conectar ao banco de dados
pool.connect()
  .then(() => {
    console.log("Banco de dados conectado!");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Identificador do servidor: ${SERVER_NAME}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco:", err);
    process.exit(1);
  });
