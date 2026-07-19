// ======================================
// CONFIGURAÇÃO DA API DINÂMICA
// ======================================

const getApiUrl = () => {
  const hostname = window.location.hostname;

  // LOCAL

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5500";
  }

  // VERCEL

  return window.location.origin;
};

const API_BASE_URL = getApiUrl();

// ======================================
// LOGIN
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

      body: JSON.stringify({
        email,
        senha,
      }),
    });

    let data;

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const texto = await response.text();

      throw new Error(texto || `Erro no servidor (${response.status})`);
    }

    // ================================
    // ERRO LOGIN
    // ================================

    if (!response.ok) {
      throw new Error(data.message || "Erro ao realizar login.");
    }

    // ================================
    // SALVAR SESSÃO
    // ================================

    localStorage.setItem("token", data.token);

    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    console.log("Usuário logado:", data.usuario);

    // ================================
    // REDIRECIONAMENTO
    // ================================

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
        throw new Error("Perfil não reconhecido.");
    }
  } catch (error) {
    console.error("Erro login:", error);

    alert(error.message);
  }
});
