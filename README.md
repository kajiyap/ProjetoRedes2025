---

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

---

## 6. Configurando OpenVPN para Acesso Seguro

### 6.1. Preparação e Diretórios

No servidor Ubuntu onde o projeto está hospedado, crie uma pasta para armazenar os dados do OpenVPN, incluindo certificados e configurações:

```sh
cd ~
mkdir -p openvpn-data
```

### 6.2. Inicializando a PKI (Infraestrutura de Chaves Públicas)

Rode o container oficial para inicializar a PKI (autoridade certificadora) do OpenVPN:

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn ovpn_initpki nopass
```

> Nota: O parâmetro `nopass` evita que você precise digitar senha para proteger a chave da CA. Se quiser mais segurança, remova `nopass` e defina uma senha.

Esse comando cria a infraestrutura necessária na pasta `openvpn-data`.

### 6.3. Configurando o Servidor OpenVPN

Crie a configuração do servidor OpenVPN executando:

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn --rm kylemanna/openvpn ovpn_genconfig -u udp://SEU_IP_OU_DNS
```

> Substitua `SEU_IP_OU_DNS` pelo IP público ou domínio do seu servidor AWS.

### 6.4. Inicializando o Servidor OpenVPN

Agora, gere os certificados para o servidor e inicialize o serviço:

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn ovpn_initpki nopass
```

> Se já rodou no passo 6.2, pule este.

Em seguida, inicie o container do OpenVPN em modo daemon (background):

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn -d --net=host --cap-add=NET_ADMIN --name openvpn kylemanna/openvpn
```

* `--net=host` usa a rede do host para facilitar o roteamento.
* `--cap-add=NET_ADMIN` concede permissões de rede necessárias.

### 6.5. Criando Usuários VPN

Para permitir conexões VPN, crie perfis de clientes. Exemplo criando um usuário chamado `usuario1`:

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn easyrsa build-client-full usuario1 nopass
```

Após criar, gere o arquivo `.ovpn` para esse usuário:

```sh
docker run -v $HOME/openvpn-data:/etc/openvpn --rm kylemanna/openvpn ovpn_getclient usuario1 > usuario1.ovpn
```

Esse arquivo `usuario1.ovpn` é o perfil que deve ser importado no cliente OpenVPN (computador, celular, etc).

### 6.6. Testando a VPN

* Baixe o arquivo `.ovpn` para seu computador.
* Instale o cliente OpenVPN (ex: openvpn.net).
* Importe o arquivo `.ovpn`.
* Conecte-se à VPN.

### 6.7. Ajustando o Nginx para Permitir Acesso Somente pela VPN

Atualize seu arquivo `nginx.conf` para que o acesso ao Nginx seja permitido apenas para a faixa da VPN (geralmente `10.8.0.0/24`):

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
            allow 10.8.0.0/24;
            deny all;

            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

Depois, aplique as alterações:

```sh
docker exec loadbalancer nginx -s reload
```

---

## 6.8. Atualização do IP Público e Uso de Elastic IP

### IP Público Dinâmico (padrão da AWS)

O IP público padrão da instância AWS **pode mudar toda vez que a instância for reiniciada**. Isso afeta o funcionamento do OpenVPN, pois o perfil `.ovpn` dos clientes contém o IP do servidor.

**Se o IP mudar, você precisa:**

1. Atualizar a configuração do OpenVPN com o novo IP:

```bash
docker run -v $HOME/openvpn-data:/etc/openvpn --rm kylemanna/openvpn ovpn_genconfig -u udp://NOVO_IP
```

2. (Se for o caso) Criar novamente o certificado do cliente:

```bash
docker run -v $HOME/openvpn-data:/etc/openvpn --rm -it kylemanna/openvpn easyrsa build-client-full NOME_CLIENTE nopass
```

3. Gerar o novo arquivo `.ovpn` para o cliente:

```bash
docker run -v $HOME/openvpn-data:/etc/openvpn --rm kylemanna/openvpn ovpn_getclient NOME_CLIENTE > NOME_CLIENTE.ovpn
```

---

### Elastic IP (IP fixo e recomendado)

Para evitar essa dor de cabeça, **recomenda-se usar um Elastic IP**:

* O Elastic IP é um endereço público fixo que permanece o mesmo mesmo após reiniciar a instância.
* Assim, você configura o OpenVPN uma vez com esse IP fixo e não precisa mais atualizar os perfis após reinicializações.

**Como associar um Elastic IP:**

1. No Console AWS, acesse **Elastic IPs** no menu EC2.
2. Clique em **Allocate Elastic IP** para reservar um novo IP.
3. Clique em **Associate Elastic IP** e associe-o à sua instância.
4. Atualize o OpenVPN para usar esse IP (se ainda não tiver feito):

```bash
docker run -v $HOME/openvpn-data:/etc/openvpn --rm kylemanna/openvpn ovpn_genconfig -u udp://SEU_ELASTIC_IP
```

Após isso, basta gerar seus perfis normalmente e eles funcionarão sem precisar ser atualizados após reinícios.

---

## 7. Considerações Finais

* Garanta que a porta UDP 1194 (padrão do OpenVPN) esteja liberada no grupo de segurança da AWS para seu servidor.
* Use o comando `docker logs openvpn` para verificar logs do servidor VPN.
* Sempre armazene com segurança as chaves e arquivos `.ovpn`.

---
