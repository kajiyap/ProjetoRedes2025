# Projeto: Redes 2025-1

---

## Arquitetura do Projeto

1. **Banco de Dados:** PostgreSQL rodando em um contêiner.
2. **Aplicação Web:** Três instâncias rodando simultaneamente com Node.js + Express, exibindo o nome do contêiner.
3. **Balanceador de Carga:** Nginx distribuindo as requisições entre os contêineres da aplicação.

### Estrutura de Diretórios:

```
/home/ubuntu/projeto-loadbalancer
├── docker-compose.yml
├── nginx.conf
├── /app
│   ├── package.json
│   ├── server.js
│   ├── Dockerfile
│   ├── /public
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── script.js
```

![alt text](<utils/Topologia de Rede.svg>)
---

## 1. Configurando a Instância AWS Ubuntu

1. Acesse via SSH:

```sh
ssh -i "seu-arquivo.pem" ubuntu@SEU_IP
```

2. Instale Docker e Docker Compose:

```sh
sudo apt update
sudo apt install -y docker.io docker-compose
```

3. Dê permissão para o usuário `ubuntu`:

```sh
sudo usermod -aG docker ubuntu
newgrp docker
```

Reinicie se necessário:

```sh
sudo reboot
```

---

## 2. Criando a Aplicação Web

### `package.json`

```json
{
  "name": "minha-aplicacao",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.17.1",
    "pg": "^8.7.1"
  }
}
```

### `server.js`

```js
const express = require('express');
const os = require('os');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = 3000;

const SERVER_NAME = process.env.SERVER_NAME || os.hostname();

const pool = new Pool({
  user: 'admin',
  host: 'db',
  database: 'meu_banco',
  password: 'senha123',
  port: 5432
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/usuarios', async (req, res) => {
  const result = await pool.query('SELECT * FROM usuarios');
  res.json({ servidor: SERVER_NAME, usuarios: result.rows });
});

app.post('/usuarios', async (req, res) => {
  const { nome, email } = req.body;
  await pool.query('INSERT INTO usuarios (nome, email) VALUES ($1, $2)', [nome, email]);
  res.sendStatus(201);
});

app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

### `Dockerfile`

```dockerfile
FROM node:18
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gerenciar Usuários</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h3 id="servidor">Servidor: </h3>
  <h2>Gerenciar Usuários</h2>
  <input type="text" id="nome" placeholder="Nome">
  <input type="email" id="email" placeholder="Email">
  <button onclick="adicionarUsuario()">Adicionar</button>
  <h3>Lista de Usuários</h3>
  <ul id="lista"></ul>
  <script src="script.js"></script>
</body>
</html>
```

### `script.js`

```js
async function carregarUsuarios() {
  const res = await fetch("/usuarios");
  const data = await res.json();

  document.getElementById("servidor").innerText = `Servidor: ${data.servidor}`;

  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  data.usuarios.forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `${u.id}: ${u.nome} - ${u.email} <button onclick="removerUsuario(${u.id})">X</button>`;
    lista.appendChild(li);
  });
}

async function adicionarUsuario() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;

  await fetch("/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email })
  });

  carregarUsuarios();
}

async function removerUsuario(id) {
  await fetch(`/usuarios/${id}`, { method: "DELETE" });
  carregarUsuarios();
}

carregarUsuarios();
```

### `style.css`

```css
body {
  font-family: sans-serif;
  margin: 2rem;
  background-color: #f9f9f9;
}

input {
  margin: 0.5rem;
  padding: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  margin-left: 0.5rem;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
}

ul {
  list-style-type: none;
  padding-left: 0;
}

li {
  margin: 0.5rem 0;
  background: #ffffff;
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

---

## 3. Arquivo `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:latest
    container_name: banco-dados
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: senha123
      POSTGRES_DB: meu_banco
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  app1:
    build: ./app
    container_name: app1
    restart: always
    environment:
      SERVER_NAME: "container 1"
    depends_on:
      - db
    networks:
      - app_network

  app2:
    build: ./app
    container_name: app2
    restart: always
    environment:
      SERVER_NAME: "container 2"
    depends_on:
      - db
    networks:
      - app_network

  app3:
    build: ./app
    container_name: app3
    restart: always
    environment:
      SERVER_NAME: "container 3"
    depends_on:
      - db
    networks:
      - app_network

  nginx:
    image: nginx
    container_name: loadbalancer
    depends_on:
      - app1
      - app2
      - app3
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - app_network

networks:
  app_network:

volumes:
  db_data:
```

---

## 4. Arquivo `nginx.conf`

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    upstream app_servers {
        server app1:3000;
        server app2:3000;
        server app3:3000;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://app_servers;
        }
    }
}
```

---

## 5. Subindo o Projeto

```sh
cd ~/projeto-loadbalancer

docker-compose up -d

docker ps

```

