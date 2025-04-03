# Projeto: Redes 2025-1

---

## Arquitetura do Projeto

1. Banco de Dados: PostgreSQL rodando em um contêiner.
2. Aplicação Web: Três instâncias rodando simultaneamente. A aplicação mostra onde está rodando
3. Balanceador de Carga: Nginx distribuindo as requisições entre os contêineres.
5. Proxy Reverso: 
6. VPN Segura: usando OpenVPN
7. Implementação de DHCP

Estrutura de Diretórios:

```
/home/ubuntu/projeto-loadbalancer
│── docker-compose.yml
│── nginx.conf
│── /app
│   │── package.json
│   │── server.js
│   │── Dockerfile
```

---

## 1. Configurando a Instância AWS Ubuntu

1. Acesse a instância via SSH:

```sh
ssh -i "seu-arquivo.pem" ubuntu@SEU_IP
```

2. Instale o Docker e Docker Compose:

```sh
sudo apt update
sudo apt install -y docker.io docker-compose
```

3. **Autorizar o Usuário para Usar o Docker**

Por padrão, apenas o usuário root pode executar comandos Docker. Para permitir que o usuário **ubuntu** utilize o Docker sem `sudo`, adicione-o ao grupo Docker:

```sh
sudo usermod -aG docker ubuntu
```

Aplique as alterações sem precisar sair da sessão:

```sh
newgrp docker
```

Para garantir que o Docker está rodando corretamente, execute:

```sh
docker ps
```

Se ocorrer erro de permissão, reinicie a máquina:

```sh
sudo reboot
```

---

## 2. Criando a Aplicação Web

Criar a pasta e os arquivos:

```sh
mkdir -p ~/projeto-loadbalancer/app && cd ~/projeto-loadbalancer/app
```

### Criar o `package.json`

```json
{
  "name": "minha-aplicacao",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.17.1"
  }
}
```

### Criar o `server.js`

```js
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
```

### Criar o `Dockerfile`

```dockerfile
# Usa a imagem oficial do Node.js na versão 18
FROM node:18

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia o arquivo package.json para instalar dependências
COPY package.json .

# Instala as dependências do projeto
RUN npm install

# Copia todos os arquivos do diretório atual para dentro do contêiner
COPY . .

# Define o comando padrão para rodar a aplicação
CMD ["node", "server.js"]
```

Criar a imagem da aplicação:

```sh
cd ~/projeto-loadbalancer/app
docker build -t minha-aplicacao .
```

---

## 3. Criando o Arquivo `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:latest  # Usa a última versão do PostgreSQL
    container_name: banco-dados
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: senha123
      POSTGRES_DB: meu_banco
    ports:
      - "5432:5432"  # Mapeia a porta do banco de dados
    volumes:
      - db_data:/var/lib/postgresql/data  # Persistência de dados

  app1:
    image: minha-aplicacao:latest
    container_name: app1
    restart: always
    depends_on:
      - db  # Aguarda o banco de dados estar disponível antes de iniciar
    networks:
      - app_network

  app2:
    image: minha-aplicacao:latest
    container_name: app2
    restart: always
    depends_on:
      - db
    networks:
      - app_network

  app3:
    image: minha-aplicacao:latest
    container_name: app3
    restart: always
    depends_on:
      - db
    networks:
      - app_network

  nginx:
    image: nginx:latest
    container_name: loadbalancer
    restart: always
    depends_on:
      - app1
      - app2
      - app3
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro  # Carrega a configuração do Nginx
    networks:
      - app_network

networks:
  app_network:

volumes:
  db_data:
```

---

## 4. Configurando o Balanceador de Carga (Nginx)

Criar o arquivo de configuração do Nginx:

```sh
nano ~/projeto-loadbalancer/nginx.conf
```

```nginx
worker_processes auto;  # Define o número de processos de trabalho automaticamente

events {
    worker_connections 1024;  # Número máximo de conexões simultâneas por worker
}

http {
    upstream app_servers {
        server app1:3000;
        server app2:3000;
        server app3:3000;  # Lista de servidores backend para balanceamento
    }
    server {
        listen 80;  # Escuta requisições na porta 80
        location / {
            proxy_pass http://app_servers;  # Direciona as requisições para os servidores backend
        }
    }
}
```

---

## 5. Subindo Todos os Contêineres

```sh
cd ~/projeto-loadbalancer
docker-compose up -d
```

Verificar contêineres:

```sh
docker ps
```

Testar a aplicação no navegador ou via curl:

```sh
curl http://SEU_IP_PUBLICO
```

