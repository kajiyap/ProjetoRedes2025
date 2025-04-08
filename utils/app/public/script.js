async function carregarUsuarios() {
    const res = await fetch("/usuarios");
    const data = await res.json();
  
    // Atualiza o nome do servidor
    document.getElementById("servidor").innerText = `Servidor: ${data.servidor}`;
  
    const lista = document.getElementById("lista");
    lista.innerHTML = "";
  
    data.usuarios.forEach(u => {
      const li = document.createElement("li");
      li.innerHTML = `${u.id}: ${u.nome} - ${u.email}
        <button onclick="removerUsuario(${u.id})">X</button>`;
      lista.appendChild(li);
    });
  }
  
  async function adicionarUsuario() {
    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
  
    const res = await fetch("/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nome, email })
    });
  
    if (res.ok) {
      carregarUsuarios();
    }
  }
  
  async function removerUsuario(id) {
    const res = await fetch(`/usuarios/${id}`, {
      method: "DELETE"
    });
  
    if (res.ok) {
      carregarUsuarios();
    }
  }
  
  carregarUsuarios();
  