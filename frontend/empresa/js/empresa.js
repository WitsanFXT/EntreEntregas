// ==============================
// PERSONALIZAÇÃO DA LOJA
// ==============================

const logoLojaUrl = document.getElementById("logoLojaUrl");
const bannerLojaUrl = document.getElementById("bannerLojaUrl");

const previewLogoImg = document.getElementById("previewLogoImg");
const previewBannerImg = document.getElementById("previewBannerImg");

const previewLogo = document.getElementById("previewLogo");
const previewLogoPlaceholder = document.getElementById(
  "previewLogoPlaceholder",
);

const previewBanner = document.getElementById("previewBanner");
const previewBannerPlaceholder = document.getElementById(
  "previewBannerPlaceholder",
);

const removeLogoBtn = document.getElementById("removeLogoBtn");
const removeBannerBtn = document.getElementById("removeBannerBtn");

let previewTimeout;

function atualizarPreviewComDelay() {
  clearTimeout(previewTimeout);

  previewTimeout = setTimeout(() => {
    atualizarPreview();
  }, 700);
}

logoLojaUrl.addEventListener("input", () => {
  atualizarPreviewImagem(
    logoLojaUrl,
    previewLogoImg,
    previewLogoPlaceholder,
    removeLogoBtn,
  );
  atualizarPreviewComDelay();
});

bannerLojaUrl.addEventListener("input", () => {
  atualizarPreviewImagem(
    bannerLojaUrl,
    previewBannerImg,
    previewBannerPlaceholder,
    removeBannerBtn,
  );
  atualizarPreviewComDelay();
});

removeLogoBtn?.addEventListener("click", () => {
  logoLojaUrl.value = "";
  atualizarPreviewImagem(
    logoLojaUrl,
    previewLogoImg,
    previewLogoPlaceholder,
    removeLogoBtn,
  );
  atualizarPreview();
});

removeBannerBtn?.addEventListener("click", () => {
  bannerLojaUrl.value = "";
  atualizarPreviewImagem(
    bannerLojaUrl,
    previewBannerImg,
    previewBannerPlaceholder,
    removeBannerBtn,
  );
  atualizarPreview();
});

// Comprime uma imagem escolhida no computador e devolve um data URL
// (base64) já redimensionado. Assim o valor cabe tranquilamente no
// mesmo campo de texto (logoLojaUrl/bannerLojaUrl) e é salvo do mesmo
// jeito que uma URL colada — sem precisar de um endpoint de upload.
function comprimirImagemParaDataUrl(
  arquivo,
  larguraMaxima = 700,
  qualidade = 0.82,
) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = (evento) => {
      const img = new Image();

      img.onload = () => {
        const escala = Math.min(1, larguraMaxima / img.width);
        const largura = Math.round(img.width * escala);
        const altura = Math.round(img.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;

        canvas.getContext("2d").drawImage(img, 0, 0, largura, altura);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };

      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = evento.target.result;
    };

    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

// ==============================
// PEDIDOS
// ==============================

const btnBuscarEndereco = document.getElementById("btnBuscarEndereco");

// ==============================
// ALERTAS
// ==============================

const alertBanner = document.getElementById("alertBanner");

const qtdSemEntregador = document.getElementById("qtdSemEntregador");

// ==============================
// SISTEMA
// ==============================

const btnLogout = document.getElementById("btnLogout");
// =================================
// NAVEGAÇÃO ENTRE TELAS
// =================================

const TITULOS_TELA = {
  dashboard: { titulo: "Painel Geral", crumb: "Dashboard" },
  pedidos: { titulo: "Pedidos", crumb: "Pedidos" },
  entregas: { titulo: "Entregas", crumb: "Entregas" },
  cardapio: {
    titulo: "Cardápio",
    crumb: "Cardápio",
  },
  financeiro: { titulo: "Financeiro", crumb: "Financeiro" },
  configuracoes: { titulo: "Configurações", crumb: "Configurações" },
};

function irParaTela(tela) {
  document
    .querySelectorAll(".tela-app")
    .forEach((el) => el.classList.remove("ativa"));
  document
    .getElementById(`tela${tela.charAt(0).toUpperCase()}${tela.slice(1)}`)
    ?.classList.add("ativa");

  document.querySelectorAll("[data-tela]").forEach((btn) => {
    btn.classList.toggle("ativo", btn.dataset.tela === tela);
  });

  const info = TITULOS_TELA[tela];
  if (info) {
    document.getElementById("tituloTela").textContent = info.titulo;
    document.getElementById("breadcrumbTela").textContent = info.crumb;
  }

  if (tela === "pedidos") carregarPedidos();
  if (tela === "financeiro") atualizarFinanceiro();
  if (tela === "configuracoes") carregarConfiguracoes();
}

document.querySelectorAll("[data-tela]").forEach((btn) => {
  btn.addEventListener("click", () => irParaTela(btn.dataset.tela));
});

document
  .querySelectorAll(".menu-item.em-breve, .mobile-nav .em-breve")
  .forEach((btn) => {
    btn.addEventListener("click", () =>
      mostrarToast("Essa área ainda está em construção 🚧"),
    );
  });

document
  .getElementById("alertBanner")
  .addEventListener("click", () => irParaTela("entregas"));

// =================================
// MODAL: SEM ENTREGADOR
// =================================

function abrirModalSemEntregador(entrega) {
  entregaProblema = entrega;
  document.getElementById("overlayModal").classList.add("ativo");
  document.getElementById("modalSemEntregador").classList.add("ativo");
}

function fecharModalSemEntregador() {
  entregaProblema = null;
  document.getElementById("overlayModal").classList.remove("ativo");
  document.getElementById("modalSemEntregador").classList.remove("ativo");
}

async function acaoModal(
  botao,
  url,
  mensagemSucesso,
  { fechar = true, atualizarLista = true } = {},
) {
  if (!entregaProblema) return;
  const entregaId = entregaProblema.id ?? entregaProblema._id;

  if (!entregaId) {
    mostrarToast("Entrega sem ID válido — veja o console", "erro");
    return;
  }

  botao.disabled = true;

  try {
    const response = await fetch(
      `${API}/api/empresa/entrega/${entregaId}/${url}`,
      {
        method: "POST",
        headers,
      },
    );

    let data = null;
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      const detalhe = data?.message || data?.error || response.statusText;
      mostrarToast(`Erro ${response.status}: ${detalhe}`, "erro");
      return;
    }

    mostrarToast(data?.message || mensagemSucesso, "sucesso");
    if (fechar) fecharModalSemEntregador();
    if (atualizarLista) carregarEntregas();
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível conectar ao servidor", "erro");
  } finally {
    botao.disabled = false;
  }
}

document.getElementById("btnTentarNovamente").onclick = function () {
  acaoModal(this, "tentar-novamente", "Buscando novo entregador...");
};
document.getElementById("btnCancelar").onclick = function () {
  acaoModal(this, "cancelar", "Pedido cancelado");
};
document.getElementById("btnExterno").onclick = function () {
  acaoModal(this, "externo", "Entrega marcada como externa");
};

// =================================
// CONFIGURAÇÕES
// =================================

let configuracoesCarregadas = false;

async function carregarConfiguracoes() {
  if (configuracoesCarregadas) return;

  try {
    const response = await fetch(`${API}/api/empresa/me`, { headers });
    const empresa = await response.json();

    if (!response.ok || !empresa?.id) {
      mostrarToast(
        empresa?.message || "Não foi possível carregar os dados da empresa",
        "erro",
      );
      return;
    }

    empresaAtual = empresa;
    configuracoesCarregadas = true;

    document.getElementById("cfg_nome_fantasia").value =
      empresa.nome_fantasia || "";
    document.getElementById("cfg_telefone").value =
      empresa.telefone_comercial || "";
    document.getElementById("cfg_categoria").value = empresa.categoria || "";
    document.getElementById("cfg_endereco").value = empresa.endereco || "";
    document.getElementById("cfg_bairro").value = empresa.bairro || "";
    document.getElementById("cfg_cidade").value = empresa.cidade || "";
    document.getElementById("cfg_latitude").value = empresa.latitude ?? "";
    document.getElementById("cfg_longitude").value = empresa.longitude ?? "";

    logoLojaUrl.value = empresa.logo_url || "";
    bannerLojaUrl.value = empresa.banner_url || "";
    atualizarPreviewImagem(
      logoLojaUrl,
      previewLogoImg,
      previewLogoPlaceholder,
      removeLogoBtn,
    );
    atualizarPreviewImagem(
      bannerLojaUrl,
      previewBannerImg,
      previewBannerPlaceholder,
      removeBannerBtn,
    );
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar configurações", "erro");
  }
}

document.getElementById("btnSalvarConfiguracoes").onclick = async () => {
  const botao = document.getElementById("btnSalvarConfiguracoes");

  const body = {
    nome_fantasia: document.getElementById("cfg_nome_fantasia").value,
    telefone_comercial: document.getElementById("cfg_telefone").value,
    categoria: document.getElementById("cfg_categoria").value,
    endereco: document.getElementById("cfg_endereco").value,
    bairro: document.getElementById("cfg_bairro").value,
    cidade: document.getElementById("cfg_cidade").value,
    latitude: Number(document.getElementById("cfg_latitude").value) || null,
    longitude: Number(document.getElementById("cfg_longitude").value) || null,
  };

  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    const response = await fetch(`${API}/api/empresa/me`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    mostrarToast(
      data.message || "Configurações salvas",
      response.ok ? "sucesso" : "erro",
    );

    if (response.ok && data.empresa) {
      empresaAtual = data.empresa;
      document.getElementById("nomeEmpresaTopo").textContent =
        data.empresa.nome_fantasia || "Painel da empresa";
      document.getElementById("avatarLoja").textContent = (
        data.empresa.nome_fantasia || "E"
      )
        .charAt(0)
        .toUpperCase();
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível salvar as configurações", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar alterações";
  }
};

// =================================
// CONECTAR EMPRESA
// =================================

async function conectarEmpresa() {
  try {
    const response = await fetch(`${API}/api/empresa/me`, { headers });
    const empresa = await response.json();

    if (!empresa?.id) return;

    empresaAtual = empresa;

    // Atualiza interface
    const nomeEmpresaTopo = document.getElementById("nomeEmpresaTopo");
    const avatarLoja = document.getElementById("avatarLoja");

    if (nomeEmpresaTopo) {
      nomeEmpresaTopo.textContent =
        empresa.nome_fantasia || "Painel da empresa";
    }
    if (avatarLoja) {
      avatarLoja.textContent = (empresa.nome_fantasia || "E")
        .charAt(0)
        .toUpperCase();
    }

    // Popula logo/banner (verifica se os elementos existem)
    const logoInput = document.getElementById("logoLojaUrl");
    const bannerInput = document.getElementById("bannerLojaUrl");

    if (logoInput) {
      logoInput.value = empresa.logo_url || "";
      // Chama a função de preview de imagem se existir
      if (typeof atualizarPreviewImagem === "function") {
        const previewLogoImg = document.getElementById("previewLogoImg");
        const previewLogoPlaceholder = document.getElementById(
          "previewLogoPlaceholder",
        );
        const removeLogoBtn = document.getElementById("removeLogoBtn");
        atualizarPreviewImagem(
          logoInput,
          previewLogoImg,
          previewLogoPlaceholder,
          removeLogoBtn,
        );
      }
    }

    if (bannerInput) {
      bannerInput.value = empresa.banner_url || "";
      if (typeof atualizarPreviewImagem === "function") {
        const previewBannerImg = document.getElementById("previewBannerImg");
        const previewBannerPlaceholder = document.getElementById(
          "previewBannerPlaceholder",
        );
        const removeBannerBtn = document.getElementById("removeBannerBtn");
        atualizarPreviewImagem(
          bannerInput,
          previewBannerImg,
          previewBannerPlaceholder,
          removeBannerBtn,
        );
      }
    }

    // CARREGA O PREVIEW
    setTimeout(atualizarPreview, 500);
  } catch (error) {
    console.log("Erro ao conectar empresa:", error);
  }
}
// =================================
// INICIALIZAÇÃO
// =================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarMapa();
});

(async () => {
  await conectarEmpresa();

  await Promise.all([
    carregarEntregas(),
    carregarPedidos(),
    carregarDashboardKpis(),
    carregarCategorias(),
    carregarProdutos(),
    carregarBairros(),
  ]);

  // Carrega o financeiro se estiver na tela
  const telaAtiva = document.querySelector(".tela-app.ativa");
  if (telaAtiva && telaAtiva.id === "telaFinanceiro") {
    atualizarFinanceiro();
  }

  // 🔥 Garante que o preview seja carregado mesmo se a empresa já estiver pronta
  if (empresaAtual?.id) {
    setTimeout(atualizarPreview, 500);
  }

  await iniciarRealtime();
})();

// =================================
// LOGOUT
// =================================

document.getElementById("btnLogout").addEventListener("click", () => {
  if (!confirm("Deseja realmente sair da conta?")) return;
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});
