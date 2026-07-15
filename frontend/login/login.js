// ======================================
// CONFIGURAÇÃO DA API DINÂMICA
// ======================================
const getApiUrl = () => {
  const hostname = window.location.hostname;

  // Se estiver rodando localmente no seu PC
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5500";
  }

  // Se estiver no Vercel, a rota /api é redirecionada internamente
  return window.location.origin;
};

const API_BASE_URL = getApiUrl();

// ======================================
// LOGIN - ENTRE CORRIDAS
// ======================================
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, senha }),
    });

    // Evita o erro "Unexpected token T" validando o Content-Type
    const contentType = response.headers.get("content-type");
    let data = {};

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      throw new Error(
        `Erro no servidor (${response.status}). Resposta inesperada.`,
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Erro ao realizar login.");
    }

    // ==================================
    // SALVAR SESSÃO
    // ==================================
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    console.log("Usuário logado:", data.usuario);
    alert("Login realizado com sucesso!");

    // ==================================
    // DIRECIONAMENTO POR PERFIL
    // ==================================
    switch (data.usuario.tipo) {
      case "cliente":
        window.location.href = "../cliente/dashboard.html";
        break;
      case "empresa":
        window.location.href = "../empresa/dashboard.html";
        break;
      case "entregador":
        window.location.href = "../entregador/dashboard.html";
        break;
      default:
        alert("Perfil não reconhecido.");
        break;
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});
