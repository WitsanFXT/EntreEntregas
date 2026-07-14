// ======================================
// LOGIN - ENTRE CORRIDAS
// ======================================

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    // 🚀 DETECTA SE VOCÊ ESTÁ NO LOCALHOST OU NA VERCEL
    // Se estiver no PC, aponta para a porta 3001. Na Vercel, usa a URL do próprio site.
    const URL_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3001"
        : ""; // Deixar vazio faz o navegador usar a URL atual da Vercel automaticamente

    try {
        // Agora o fetch usa a variável dinâmica combinada com a sua rota
        const response = await fetch(`${URL_BASE}/api/auth/login`, {
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