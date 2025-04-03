const express = require('express');
const app = express();
const PORT = 3000;
const os = require('os');

// Endpoint que retorna o nome do contêiner que está processando a requisição
app.get('/', (req, res) => {
  res.send(`Rodando no contêiner: ${os.hostname()}`);
});

// Inicia o servidor na porta 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});