// ======================================
// ENTREENTREGAS - APP PÚBLICO
// ======================================

// ======================================
// CONFIGURAÇÃO
// ======================================

const API_URL = (() => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5500";
  }
  return window.location.origin;
})();

console.log("📡 API_URL:", API_URL);

// ======================================
// ESTADO
// ======================================

let todasLojas = [];
let lojasFiltradas = [];
let categoriaAtiva = "todos";
let termoBusca = "";

// ======================================
// DOM REFERÊNCIAS
// ======================================

const lojasGrid = document.getElementById("lojasGrid");
const loadingLojas = document.getElementById("loadingLojas");
const semLojas = document.getElementById("semLojas");
const inputBusca = document.getElementById("inputBusca");
const btnBuscar = document.getElementById("btnBuscar");
const categoriasFiltros = document.getElementById("categoriasFiltros");

// ======================================
// CARREGAR LOJAS
// ======================================

async function carregarLojas() {
  try {
    mostrarLoading();

    // Busca todas as empresas (lojas)
    const response = await fetch(`${API_URL}/api/publico/empresas`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const lojas = await response.json();
    console.log("🏪 Lojas carregadas:", lojas.length);

    todasLojas = lojas.filter((loja) => loja.ativo !== false);
    lojasFiltradas = [...todasLojas];

    renderizarLojas(lojasFiltradas);
  } catch (error) {
    console.error("❌ Erro ao carregar lojas:", error);
    mostrarErro("Não foi possível carregar as lojas. Tente novamente.");
  }
}

// ======================================
// RENDERIZAR LOJAS
// ======================================

function renderizarLojas(lojas) {
  const container = lojasGrid;
  container.innerHTML = "";

  if (!lojas || lojas.length === 0) {
    semLojas.style.display = "block";
    loadingLojas.style.display = "none";
    return;
  }

  semLojas.style.display = "none";
  loadingLojas.style.display = "none";

  lojas.forEach((loja) => {
    const card = criarCardLoja(loja);
    container.appendChild(card);
  });
}

function criarCardLoja(loja) {
  const card = document.createElement("a");

  card.className = "loja-card";

  card.href = `/loja/${loja.id}`;

  const categoria = loja.categoria || "Geral";

  const cidade = loja.cidade || "";

  const bairro = loja.bairro || "";

  const bannerHTML = loja.banner_url
    ? `
      <img
        src="${loja.banner_url}"
        alt="${loja.nome_fantasia}"
      >
    `
    : `
      <div class="placeholder-banner">
        🏪
      </div>
    `;

  const logoHTML = loja.logo_url
    ? `
      <img
        class="loja-card-logo"
        src="${loja.logo_url}"
        alt="${loja.nome_fantasia}"
      >
    `
    : "";

  card.innerHTML = `

    <div class="loja-card-banner">

      ${bannerHTML}

      <div class="card-badge">
        🔥 Destaque
      </div>

    </div>

    <div class="loja-card-body">

      ${logoHTML}

      <div class="loja-card-info">

        <h3>
          ${loja.nome_fantasia}
        </h3>

        <div class="loja-categoria">
          ${categoria}
        </div>

        <div class="card-rating">
          ⭐ 4.9
        </div>

        <div class="card-delivery">
          🛵 Entrega rápida
        </div>

        <div class="loja-meta">

          <span class="loja-status">
            🟢 Aberto
          </span>

          <span>
            📍 ${bairro}
          </span>

        </div>

      </div>

    </div>

  `;

  return card;
}
// ======================================
// FILTRAR LOJAS
// ======================================

function filtrarLojas() {
  let resultado = [...todasLojas];

  // Filtro por categoria
  if (categoriaAtiva !== "todos") {
    resultado = resultado.filter(
      (loja) =>
        loja.categoria &&
        loja.categoria.toLowerCase() === categoriaAtiva.toLowerCase(),
    );
  }

  // Filtro por busca
  if (termoBusca.trim()) {
    const busca = termoBusca.toLowerCase().trim();
    resultado = resultado.filter(
      (loja) =>
        loja.nome_fantasia?.toLowerCase().includes(busca) ||
        loja.categoria?.toLowerCase().includes(busca) ||
        loja.bairro?.toLowerCase().includes(busca) ||
        loja.cidade?.toLowerCase().includes(busca),
    );
  }

  lojasFiltradas = resultado;
  renderizarLojas(lojasFiltradas);
}

// ======================================
// FUNÇÕES DE UI
// ======================================

function mostrarLoading() {
  loadingLojas.style.display = "none";

  semLojas.style.display = "none";

  lojasGrid.innerHTML = `

    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>

  `;
}

function mostrarErro(mensagem) {
  loadingLojas.style.display = "none";
  semLojas.style.display = "block";
  semLojas.innerHTML = `
        <span class="empty-icon">⚠️</span>
        <h3>Ops!</h3>
        <p>${mensagem}</p>
    `;
}

// ======================================
// EVENTOS
// ======================================

// Busca
btnBuscar?.addEventListener("click", () => {
  termoBusca = inputBusca.value;
  filtrarLojas();
});

inputBusca?.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    termoBusca = inputBusca.value;
    filtrarLojas();
  }
});

// Categorias
categoriasFiltros?.addEventListener("click", (e) => {
  const btn = e.target.closest(".categoria-card");
  if (!btn) return;

  document
    .querySelectorAll(".categoria-card")
    .forEach((b) => b.classList.remove("ativo"));

  btn.classList.add("ativo");

  categoriaAtiva = btn.dataset.categoria;

  filtrarLojas();
});

// Localização
document.getElementById("btnLocalizacao")?.addEventListener("click", () => {
  document.getElementById("modalLocalizacao").classList.add("ativo");
});

document
  .getElementById("fecharModalLocalizacao")
  ?.addEventListener("click", () => {
    document.getElementById("modalLocalizacao").classList.remove("ativo");
  });

document
  .getElementById("btnConfirmarEndereco")
  ?.addEventListener("click", () => {
    const endereco = document.getElementById("inputEndereco").value;
    if (endereco) {
      document.getElementById("textoLocalizacao").textContent = endereco;
      document.getElementById("modalLocalizacao").classList.remove("ativo");
      mostrarToast("📍 Endereço atualizado!");
    }
  });

document
  .getElementById("btnUsarLocalizacaoAtual")
  ?.addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById("textoLocalizacao").textContent =
            "📍 Você está aqui";
          document.getElementById("modalLocalizacao").classList.remove("ativo");
          mostrarToast("📍 Localização capturada!");
        },
        () => {
          mostrarToast("❌ Não foi possível obter localização", "erro");
        },
      );
    }
  });

// Fechar modal ao clicar fora
document.getElementById("modalLocalizacao")?.addEventListener("click", (e) => {
  if (e.target.id === "modalLocalizacao") {
    document.getElementById("modalLocalizacao").classList.remove("ativo");
  }
});

// ======================================
// TOAST (mensagens temporárias)
// ======================================

function mostrarToast(mensagem, tipo = "sucesso") {
  const existing = document.querySelector(".toast-flutuante");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast-flutuante ${tipo}`;
  toast.textContent = mensagem;
  toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${tipo === "erro" ? "#ef4444" : "#22c55e"};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 999999;
        animation: toastIn 0.3s ease;
        font-size: 0.9rem;
        max-width: 90%;
        text-align: center;
    `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Adiciona animação do toast
const styleToast = document.createElement("style");
styleToast.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleToast);

// ======================================
// INICIALIZAÇÃO
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  carregarLojas();
});
