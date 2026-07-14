// ======================================
// CONFIGURAÇÃO DA API DINÂMICA
// ======================================
const getApiUrl = () => {
    const hostname = window.location.hostname;

    // Se estiver rodando localmente
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        // Altere a porta 3001 se o seu backend rodar em outra porta local
        return "http://localhost:3001"; 
    }

    // Se estiver no Vercel (ou produção), assume que a API está no mesmo domínio
    // Exemplo: se o frontend tá em site.vercel.app, a API será chamada no mesmo domínio.
    // Caso sua API esteja em outro subdomínio (ex: api.meusite.com), substitua pelo link dela aqui.
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
        // Agora a URL é dinâmica utilizando a constante definida acima
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Erro ao realizar login."
            );
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