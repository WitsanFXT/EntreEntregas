// ======================================
// CONFIG
// ======================================

const params = new URLSearchParams(window.location.search);

const empresaId = params.get("id");

console.log("🏪 Empresa ID:", empresaId);

// 🔥 CONFIGURAÇÃO PARA PRODUÇÃO E DESENVOLVIMENTO
const API_URL = (() => {
  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://entre-entregas-backend.vercel.app";
  }
  return "http://localhost:5500";
})();

const TAXA_SERVICO = 0;

const lojaId = params.get("id");

console.log("Loja:", lojaId);

//const lojaId = new URLSearchParams(window.location.search).get("id");

console.log("📡 API_URL:", API_URL);
console.log("🏪 Empresa ID:", empresaId);

// ======================================
// ESTADO
// ======================================

let dadosCardapio = null;
let carrinho = [];
let tipoEntrega = "Entrega";
let taxaEntrega = 0;
let bairroSelecionado = "";
let enderecoTexto = "";
let bairrosDisponiveis = [];
let cupomAplicado = null;
let produtoAtual = null;
let ultimoPedidoEnviado = null;
let metodoPagamentoSelecionado = "app";

// ======================================
// UTILS
// ======================================

function formatarPreco(valor) {
  return `R$ ${Number(valor || 0).toFixed(2)}`;
}

function subtotalCarrinho() {
  return carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0,
  );
}

function descontoCupom(subtotal) {
  if (!cupomAplicado) return 0;
  if (cupomAplicado.tipo === "percentual") {
    return subtotal * (cupomAplicado.valor / 100);
  }
  return Math.min(cupomAplicado.valor, subtotal);
}

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function carregarCarrinhoSalvo() {
  try {
    const salvo = localStorage.getItem("carrinho");
    carrinho = salvo ? JSON.parse(salvo) : [];
  } catch {
    carrinho = [];
  }
}

// ======================================
// CARDÁPIO — carregar e renderizar
// ======================================

async function carregarCardapio() {
  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/cardapio`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const dados = await response.json();

    if (!dados.empresa) {
      throw new Error("Empresa não encontrada");
    }

    dadosCardapio = dados;
    renderizarLoja(dados.empresa);
    renderizarCategorias(dados.categorias);
    renderizarProdutos(dados.categorias, dados.produtos);
    atualizarBarraSacola();

    console.log("✅ Cardápio carregado:", dados.empresa.nome_fantasia);
  } catch (error) {
    console.error("❌ Erro ao carregar cardápio:", error);
    document.getElementById("nomeLoja").textContent = "Loja não encontrada";
    document.querySelector(".loja-status").textContent = "🔴 Loja indisponível";
    document.querySelector(".loja-status").className = "loja-status fechado";
  }
}

function renderizarLoja(empresa) {
  document.getElementById("nomeLoja").textContent =
    empresa.nome_fantasia || "Loja";

  const partesEndereco = [empresa.bairro, empresa.cidade].filter(Boolean);
  document.getElementById("enderecoLoja").textContent = partesEndereco.length
    ? `📍 ${partesEndereco.join(" — ")}`
    : "";

  // Logo
  const logo = document.getElementById("logoLoja");
  if (empresa.logo_url) {
    logo.src = empresa.logo_url;
    logo.hidden = false;
  } else {
    logo.hidden = true;
  }

  // Banner
  aplicarBannerLoja(empresa.banner_url);

  // Avaliação
  if (empresa.avaliacao) {
    const el = document.getElementById("avaliacaoLoja");
    el.textContent = `⭐ ${Number(empresa.avaliacao).toFixed(1)}`;
    el.hidden = false;
  }
}

function aplicarBannerLoja(bannerUrl) {
  const img = document.getElementById("bannerLojaImg");
  if (!bannerUrl) {
    img.hidden = true;
    return;
  }

  const teste = new Image();
  teste.onload = () => {
    img.src = bannerUrl;
    img.hidden = false;
  };
  teste.onerror = () => {
    img.hidden = true;
  };
  teste.src = bannerUrl;
}

function renderizarCategorias(categorias) {
  const nav = document.getElementById("navCategorias");
  nav.innerHTML = "";

  if (!categorias || categorias.length === 0) {
    return;
  }

  categorias.forEach((cat, indice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `categoria-link${indice === 0 ? " ativo" : ""}`;
    btn.textContent = cat.nome;
    btn.onclick = () => {
      document
        .querySelectorAll(".categoria-link")
        .forEach((el) => el.classList.remove("ativo"));
      btn.classList.add("ativo");
      document
        .getElementById(`categoria-${cat.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    nav.appendChild(btn);
  });
}

function renderizarProdutos(categorias, produtos) {
  const main = document.getElementById("produtosMain");
  main.innerHTML = "";

  if (!categorias || !produtos) return;

  categorias.forEach((cat) => {
    const produtosDaCategoria = produtos.filter(
      (p) => p.categoria_id === cat.id && p.ativo !== false,
    );
    if (produtosDaCategoria.length === 0) return;

    const secao = document.createElement("section");
    secao.id = `categoria-${cat.id}`;

    const titulo = document.createElement("h2");
    titulo.className = "titulo-categoria";
    titulo.textContent = cat.nome;
    secao.appendChild(titulo);

    const lista = document.createElement("div");
    lista.className = "produtos-lista";

    produtosDaCategoria.forEach((produto) => {
      lista.appendChild(criarItemProduto(produto));
    });

    secao.appendChild(lista);
    main.appendChild(secao);
  });
}

function criarItemProduto(produto) {
  const item = document.createElement("div");
  item.className = "produto-item";
  item.dataset.produtoId = produto.id;

  const imgSrc = produto.imagem_url || "";

  item.innerHTML = `
    <img src="${imgSrc}" alt="${produto.nome}" onerror="this.style.display='none'">
    <div class="produto-item-info">
      <h3>${produto.nome}</h3>
      <p>${produto.descricao || ""}</p>
      <span class="preco">${formatarPreco(produto.preco)}</span>
    </div>
    <div class="produto-item-acao"></div>
  `;

  item.querySelector("img").onclick = () => abrirModalProduto(produto);
  item.querySelector(".produto-item-info").onclick = () =>
    abrirModalProduto(produto);

  renderizarAcaoProduto(item, produto);

  return item;
}

function renderizarAcaoProduto(item, produto) {
  const acao = item.querySelector(".produto-item-acao");
  const noCarrinho = carrinho.filter(
    (i) => i.produtoId === produto.id && !i.observacao,
  );
  const qtd = noCarrinho.reduce((soma, i) => soma + i.quantidade, 0);

  if (qtd === 0) {
    acao.innerHTML = `<button class="btn-add-produto" type="button">+</button>`;
    acao.querySelector("button").onclick = (e) => {
      e.stopPropagation();
      adicionarAoCarrinhoRapido(produto);
    };
  } else {
    acao.innerHTML = `
      <div class="stepper-produto">
        <button type="button" data-acao="menos">-</button>
        <span>${qtd}</span>
        <button type="button" data-acao="mais">+</button>
      </div>
    `;
    acao.querySelector('[data-acao="menos"]').onclick = (e) => {
      e.stopPropagation();
      removerUmaUnidadeRapida(produto);
    };
    acao.querySelector('[data-acao="mais"]').onclick = (e) => {
      e.stopPropagation();
      adicionarAoCarrinhoRapido(produto);
    };
  }
}

function reRenderizarAcoesProdutos() {
  document.querySelectorAll(".produto-item").forEach((item) => {
    const produto = dadosCardapio?.produtos?.find(
      (p) => p.id === item.dataset.produtoId,
    );
    if (produto) renderizarAcaoProduto(item, produto);
  });
}

// ======================================
// CARRINHO — adicionar/remover rápido
// ======================================

function adicionarAoCarrinhoRapido(produto) {
  const existente = carrinho.find(
    (i) => i.produtoId === produto.id && !i.observacao,
  );

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      id: `${produto.id}-${Date.now()}`,
      produtoId: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      quantidade: 1,
      observacao: "",
    });
  }

  salvarCarrinho();
  reRenderizarAcoesProdutos();
  atualizarBarraSacola();
}

function removerUmaUnidadeRapida(produto) {
  const existente = carrinho.find(
    (i) => i.produtoId === produto.id && !i.observacao,
  );
  if (!existente) return;

  existente.quantidade -= 1;
  if (existente.quantidade <= 0) {
    carrinho = carrinho.filter((i) => i.id !== existente.id);
  }

  salvarCarrinho();
  reRenderizarAcoesProdutos();
  atualizarBarraSacola();
}

// ======================================
// MODAL PRODUTO
// ======================================

function abrirModalProduto(produto) {
  produtoAtual = produto;
  document.getElementById("produtoNome").textContent = produto.nome;
  document.getElementById("produtoPreco").textContent = formatarPreco(
    produto.preco,
  );
  document.getElementById("quantidadeInput").value = 1;
  document.getElementById("observacao").value = "";
  atualizarSubtotalModal();

  document.getElementById("modalProduto").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModalProduto() {
  document.getElementById("modalProduto").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

function atualizarSubtotalModal() {
  const qtd = Number(document.getElementById("quantidadeInput").value) || 1;
  const total = produtoAtual ? produtoAtual.preco * qtd : 0;
  document.getElementById("subtotalModal").textContent =
    `Total: ${formatarPreco(total)}`;
}

document.getElementById("fecharModal").onclick = fecharModalProduto;
document.getElementById("modalProduto").onclick = (e) => {
  if (e.target.id === "modalProduto") fecharModalProduto();
};

document.getElementById("menosBtn").onclick = () => {
  const input = document.getElementById("quantidadeInput");
  input.value = Math.max(1, Number(input.value) - 1);
  atualizarSubtotalModal();
};

document.getElementById("maisBtn").onclick = () => {
  const input = document.getElementById("quantidadeInput");
  input.value = Number(input.value) + 1;
  atualizarSubtotalModal();
};

document
  .getElementById("quantidadeInput")
  .addEventListener("input", atualizarSubtotalModal);

document.getElementById("adicionarCarrinho").onclick = () => {
  if (!produtoAtual) return;

  const qtd = Number(document.getElementById("quantidadeInput").value) || 1;
  const observacao = document.getElementById("observacao").value.trim();

  carrinho.push({
    id: `${produtoAtual.id}-${Date.now()}`,
    produtoId: produtoAtual.id,
    nome: produtoAtual.nome,
    preco: Number(produtoAtual.preco),
    quantidade: qtd,
    observacao,
  });

  salvarCarrinho();
  reRenderizarAcoesProdutos();
  atualizarBarraSacola();
  fecharModalProduto();
};

// ======================================
// BARRA "VER SACOLA"
// ======================================

function atualizarBarraSacola() {
  const barra = document.getElementById("barraSacola");
  const qtdTotal = carrinho.reduce((soma, i) => soma + i.quantidade, 0);

  if (qtdTotal === 0) {
    barra.hidden = true;
    return;
  }

  barra.hidden = false;
  document.getElementById("qtdSacola").textContent =
    `${qtdTotal} ${qtdTotal === 1 ? "item" : "itens"}`;
  document.getElementById("totalSacolaBarra").textContent =
    formatarPreco(subtotalCarrinho());
}

document.getElementById("barraSacola").onclick = abrirModalSacola;

// ======================================
// ETAPA 1: SACOLA
// ======================================

function abrirModalSacola() {
  if (!dadosCardapio) return;

  document.getElementById("sacolaLogoLoja").src =
    dadosCardapio.empresa.logo_url || "";
  document.getElementById("sacolaNomeLoja").textContent =
    dadosCardapio.empresa.nome_fantasia;

  renderizarItensSacola();
  renderizarUpsell("upsellSacola");
  atualizarResumoSacola();

  document.getElementById("modalSacola").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModalSacola() {
  document.getElementById("modalSacola").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

function renderizarItensSacola() {
  const container = document.getElementById("itensSacola");

  if (carrinho.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:#999;padding:20px;">Sua sacola está vazia.</p>`;
    return;
  }

  container.innerHTML = carrinho
    .map(
      (item) => `
      <div class="item-sacola">
        <div class="item-sacola-info">
          <h4>${item.quantidade}x ${item.nome}</h4>
          ${item.observacao ? `<small>${item.observacao}</small>` : ""}
        </div>
        <span class="item-sacola-preco">${formatarPreco(item.preco * item.quantidade)}</span>
      </div>
    `,
    )
    .join("");
}

function renderizarUpsell(containerId) {
  const container = document.getElementById(containerId);
  if (!dadosCardapio) {
    container.innerHTML = "";
    return;
  }

  const idsNoCarrinho = new Set(carrinho.map((i) => i.produtoId));
  const sugestoes = dadosCardapio.produtos
    .filter((p) => !idsNoCarrinho.has(p.id) && p.ativo !== false)
    .slice(0, 6);

  if (sugestoes.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <p class="upsell-inline-titulo">🔥 Combina com seu pedido</p>
    <div class="upsell-inline-lista">
      ${sugestoes
        .map(
          (produto) => `
        <div class="upsell-card">
          <img src="${produto.imagem_url || ""}" alt="${produto.nome}" onerror="this.style.display='none'">
          <h5>${produto.nome}</h5>
          <span class="preco">${formatarPreco(produto.preco)}</span>
          <button type="button" data-produto-id="${produto.id}">Adicionar</button>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("button[data-produto-id]").forEach((btn) => {
    btn.onclick = () => {
      const produto = dadosCardapio.produtos.find(
        (p) => p.id === btn.dataset.produtoId,
      );
      if (!produto) return;
      adicionarAoCarrinhoRapido(produto);
      renderizarItensSacola();
      renderizarUpsell(containerId);
      atualizarResumoSacola();
    };
  });
}

function atualizarResumoSacola() {
  const subtotal = subtotalCarrinho();
  const desconto = descontoCupom(subtotal);
  const totalSemEntrega = Math.max(0, subtotal - desconto);

  document.getElementById("subtotalSacola").textContent =
    formatarPreco(subtotal);
  document.getElementById("totalSemEntregaSacola").textContent =
    formatarPreco(totalSemEntrega);

  document.getElementById("btnContinuarEntrega").disabled =
    carrinho.length === 0;
}

document.getElementById("fecharSacola").onclick = fecharModalSacola;
document.getElementById("modalSacola").addEventListener("click", (e) => {
  if (e.target.id === "modalSacola") fecharModalSacola();
});

// Cupom
document.getElementById("btnAplicarCupom").onclick = async () => {
  const codigo = document.getElementById("cupomInput").value.trim();
  const status = document.getElementById("cupomStatus");

  if (!codigo) return;

  status.textContent = "Verificando cupom...";
  status.className = "cupom-status";

  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/cupons/validar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data?.message || "Cupom inválido");

    cupomAplicado = {
      codigo,
      tipo: data.tipo || "percentual",
      valor: Number(data.valor) || 0,
    };

    status.textContent = `Cupom "${codigo}" aplicado!`;
    status.className = "cupom-status sucesso";
  } catch (error) {
    console.error(error);
    cupomAplicado = null;
    status.textContent = "Cupom inválido ou não disponível.";
    status.className = "cupom-status erro";
  }

  atualizarResumoSacola();
};

document.getElementById("btnContinuarEntrega").onclick = () => {
  if (carrinho.length === 0) return;
  fecharModalSacola();
  abrirModalEntrega();
};

// ======================================
// ETAPA 2: ENTREGA
// ======================================

async function abrirModalEntrega() {
  document.getElementById("modalEntrega").classList.add("ativo");
  document.body.classList.add("sem-scroll");

  mostrarFormEnderecoManual();
  atualizarResumoEntrega();
}

function fecharModalEntrega() {
  document.getElementById("modalEntrega").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

function mostrarFormEnderecoManual() {
  document.getElementById("enderecoConfirmado").hidden = true;
  document.getElementById("formEnderecoManual").hidden = false;
}

function mostrarEnderecoConfirmado() {
  const endereco = document.getElementById("enderecoClienteInput").value.trim();
  const bairro = document.getElementById("bairroClienteSelect").value;

  if (endereco && bairro) {
    document.getElementById("textoEndereco").textContent =
      `${endereco}, ${bairro}`;
    document.getElementById("enderecoConfirmado").hidden = false;
    document.getElementById("formEnderecoManual").hidden = true;
  }
}

document.getElementById("btnTrocarEndereco").onclick = () => {
  mostrarFormEnderecoManual();
};

function selecionarTipoEntrega(tipo) {
  tipoEntrega = tipo;

  document
    .getElementById("btnEntregaStep")
    .classList.toggle("ativo", tipo === "Entrega");
  document
    .getElementById("btnRetiradaStep")
    .classList.toggle("ativo", tipo === "Retirada");

  document.getElementById("enderecoConfirmado").hidden = tipo !== "Entrega";
  document.getElementById("formEnderecoManual").hidden = true;
  document.getElementById("avisoRetiradaStep").hidden = tipo !== "Retirada";

  taxaEntrega = tipo === "Entrega" ? taxaEntrega : 0;
  atualizarResumoEntrega();
}

document.getElementById("btnEntregaStep").onclick = () =>
  selecionarTipoEntrega("Entrega");
document.getElementById("btnRetiradaStep").onclick = () =>
  selecionarTipoEntrega("Retirada");

// ======================================
// BAIRROS - Buscar da tabela_precos (Supabase)
// ======================================

async function carregarBairros() {
  const select = document.getElementById("bairroClienteSelect");

  try {
    const url = `${API_URL}/api/publico/tabela-precos`;
    console.log("📡 Buscando bairros em:", url);

    const response = await fetch(url);
    console.log("📊 Status da resposta:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na resposta:", errorText);
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const dados = await response.json();
    console.log("📦 Dados recebidos:", dados.length, "bairros");

    if (Array.isArray(dados) && dados.length > 0) {
      bairrosDisponiveis = dados.sort((a, b) =>
        a.bairro.localeCompare(b.bairro),
      );
      console.log(
        `✅ ${bairrosDisponiveis.length} bairros carregados da Supabase`,
      );
    } else {
      console.warn("⚠️ Nenhum bairro encontrado, usando fallback");
      bairrosDisponiveis = [
        { bairro: "Centro", valor: 5.0 },
        { bairro: "Bairro A", valor: 8.0 },
        { bairro: "Bairro B", valor: 10.0 },
      ];
    }
  } catch (error) {
    console.error("❌ Erro ao carregar bairros:", error);
    // Fallback
    bairrosDisponiveis = [
      { bairro: "Centro", valor: 5.0 },
      { bairro: "Bairro A", valor: 8.0 },
      { bairro: "Bairro B", valor: 10.0 },
    ];
  }

  // Popula o select
  select.innerHTML = '<option value="">Selecione o bairro</option>';
  bairrosDisponiveis.forEach((b) => {
    const option = document.createElement("option");
    option.value = b.bairro;
    option.textContent = `${b.bairro} - ${formatarPreco(b.valor)}`;
    if (b.bairro === bairroSelecionado) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  console.log("📋 Select populado com", bairrosDisponiveis.length, "bairros");

  // Evento de mudança
  select.onchange = () => {
    const bairro = bairrosDisponiveis.find((b) => b.bairro === select.value);
    if (bairro) {
      taxaEntrega = Number(bairro.valor);
      bairroSelecionado = bairro.bairro;
      console.log(
        "📍 Bairro selecionado:",
        bairroSelecionado,
        "Taxa:",
        taxaEntrega,
      );
    } else {
      taxaEntrega = 0;
      bairroSelecionado = "";
    }
    atualizarResumoEntrega();
  };
}

// ======================================
// GERENCIAR ENDEREÇO
// ======================================

document
  .getElementById("enderecoClienteInput")
  .addEventListener("input", (e) => {
    enderecoTexto = e.target.value.trim();
    const bairro = document.getElementById("bairroClienteSelect").value;
    if (enderecoTexto && bairro) {
      mostrarEnderecoConfirmado();
    }
  });

document
  .getElementById("bairroClienteSelect")
  .addEventListener("change", () => {
    const bairro = document.getElementById("bairroClienteSelect").value;
    if (enderecoTexto && bairro) {
      mostrarEnderecoConfirmado();
    }
  });

// ======================================
// RESUMO DA ENTREGA
// ======================================

function atualizarResumoEntrega() {
  const subtotal = subtotalCarrinho();
  const desconto = descontoCupom(subtotal);
  const totalSemEntrega = Math.max(0, subtotal - desconto);
  const totalComEntrega =
    totalSemEntrega + (tipoEntrega === "Entrega" ? taxaEntrega : 0);

  document.getElementById("subtotalEntrega").textContent =
    formatarPreco(totalSemEntrega);
  document.getElementById("taxaEntregaValor").textContent =
    tipoEntrega === "Entrega" ? formatarPreco(taxaEntrega) : "Grátis";
  document.getElementById("totalComEntrega").textContent =
    formatarPreco(totalComEntrega);

  const endereco = document.getElementById("enderecoClienteInput").value.trim();
  const bairro = document.getElementById("bairroClienteSelect").value;

  const podeContinuar = tipoEntrega === "Retirada" || (endereco && bairro);
  document.getElementById("btnContinuarPagamento").disabled = !podeContinuar;
}

document.getElementById("fecharEntrega").onclick = fecharModalEntrega;
document.getElementById("modalEntrega").addEventListener("click", (e) => {
  if (e.target.id === "modalEntrega") fecharModalEntrega();
});

document.getElementById("btnContinuarPagamento").onclick = () => {
  fecharModalEntrega();
  abrirModalPagamento();
};

// ======================================
// ETAPA 3: PAGAMENTO
// ======================================

function abrirModalPagamento() {
  document.getElementById("pagamentoLogoLoja").src =
    dadosCardapio?.empresa?.logo_url || "";
  document.getElementById("pagamentoNomeLoja").textContent =
    dadosCardapio?.empresa?.nome_fantasia || "Loja";

  atualizarResumoPagamento();

  document.getElementById("modalPagamento").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModalPagamento() {
  document.getElementById("modalPagamento").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

function atualizarResumoPagamento() {
  const subtotal = subtotalCarrinho();
  const desconto = descontoCupom(subtotal);
  const totalSemEntrega = Math.max(0, subtotal - desconto);
  const entrega = tipoEntrega === "Entrega" ? taxaEntrega : 0;
  const total = totalSemEntrega + entrega + TAXA_SERVICO;

  const avisoCupom = document.getElementById("cupomAplicadoResumo");
  if (cupomAplicado) {
    avisoCupom.hidden = false;
    avisoCupom.textContent = `🎟️ Cupom "${cupomAplicado.codigo}" aplicado (-${formatarPreco(desconto)})`;
  } else {
    avisoCupom.hidden = true;
  }

  document.getElementById("subtotalPagamento").textContent =
    formatarPreco(totalSemEntrega);
  document.getElementById("taxaEntregaPagamento").textContent =
    entrega > 0 ? formatarPreco(entrega) : "Grátis";
  document.getElementById("taxaServicoPagamento").textContent =
    formatarPreco(TAXA_SERVICO);
  document.getElementById("totalPagamento").textContent = formatarPreco(total);
}

document.querySelectorAll(".opcao-pagamento").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    document
      .querySelectorAll(".opcao-pagamento")
      .forEach((el) => el.classList.remove("ativo"));
    btn.classList.add("ativo");
    metodoPagamentoSelecionado = btn.dataset.metodo;
  });
});

document.getElementById("cpfNotaCheckbox").addEventListener("change", (e) => {
  document.getElementById("cpfNotaInput").hidden = !e.target.checked;
});

document.getElementById("fecharPagamento").onclick = fecharModalPagamento;
document.getElementById("modalPagamento").addEventListener("click", (e) => {
  if (e.target.id === "modalPagamento") fecharModalPagamento();
});

document.getElementById("btnRevisarPedido").onclick = () => {
  fecharModalPagamento();
  abrirModalRevisar();
};

// ======================================
// ETAPA 4: REVISAR PEDIDO
// ======================================

const METODOS_PAGAMENTO_LABEL = {
  app: "Pagamento pelo app",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
};

function abrirModalRevisar() {
  const subtotal = subtotalCarrinho();
  const desconto = descontoCupom(subtotal);
  const totalSemEntrega = Math.max(0, subtotal - desconto);
  const entrega = tipoEntrega === "Entrega" ? taxaEntrega : 0;
  const total = totalSemEntrega + entrega + TAXA_SERVICO;

  const endereco = document.getElementById("enderecoClienteInput").value.trim();
  const bairro = document.getElementById("bairroClienteSelect").value;
  const enderecoCompleto =
    endereco && bairro ? `${endereco}, ${bairro}` : "Endereço não informado";

  document.getElementById("revisaoTipoEntrega").textContent =
    tipoEntrega === "Entrega" ? "🏠 Entrega" : "🛍️ Retirada na loja";
  document.getElementById("revisaoPrevisao").textContent =
    tipoEntrega === "Entrega" ? "30–50 min" : "15–25 min";
  document.getElementById("revisaoEndereco").textContent =
    tipoEntrega === "Entrega"
      ? enderecoCompleto
      : dadosCardapio?.empresa?.bairro
        ? `Retirar em: ${dadosCardapio.empresa.bairro}`
        : "Retirar na loja";

  const blocoCupom = document.getElementById("revisaoCupomBloco");
  if (cupomAplicado) {
    blocoCupom.hidden = false;
    document.getElementById("revisaoCupom").textContent =
      `${cupomAplicado.codigo} (-${formatarPreco(desconto)})`;
  } else {
    blocoCupom.hidden = true;
  }

  document.getElementById("revisaoPagamento").textContent =
    METODOS_PAGAMENTO_LABEL[metodoPagamentoSelecionado] || "Pagamento pelo app";
  document.getElementById("revisaoTotal").textContent = formatarPreco(total);

  document.getElementById("modalRevisar").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModalRevisar() {
  document.getElementById("modalRevisar").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

document.getElementById("fecharRevisar").onclick = fecharModalRevisar;
document.getElementById("modalRevisar").addEventListener("click", (e) => {
  if (e.target.id === "modalRevisar") fecharModalRevisar();
});

document.getElementById("btnAlterarPedido").onclick = () => {
  fecharModalRevisar();
  abrirModalPagamento();
};

// ======================================
// PAGAR — cria o pedido
// ======================================

function montarItensTexto() {
  return carrinho
    .map((item) => {
      let linha = `${item.quantidade}x ${item.nome}`;
      if (item.observacao) linha += ` (${item.observacao})`;
      return linha;
    })
    .join(", ");
}

document.getElementById("btnPagarPedido").onclick = async () => {
  const cliente_nome = prompt("Seu nome:");
  if (!cliente_nome) return;
  const cliente_telefone = prompt("Seu celular/WhatsApp:");
  if (!cliente_telefone) return;

  const subtotal = subtotalCarrinho();
  const desconto = descontoCupom(subtotal);

  const dadosPedido = {
    cliente_nome,
    cliente_telefone,
    itens: montarItensTexto(),
    valor_total: Math.max(0, subtotal - desconto),
    valor_entrega: tipoEntrega === "Entrega" ? taxaEntrega : 0,
    tipo_entrega: tipoEntrega,
    endereco: tipoEntrega === "Entrega" ? enderecoTexto : null,
    bairro:
      tipoEntrega === "Entrega"
        ? bairroSelecionado || null
        : "Retirada na loja",
    cidade: dadosCardapio?.empresa?.cidade || null,
    cupom: cupomAplicado?.codigo || null,
    metodo_pagamento: metodoPagamentoSelecionado,
    status_pagamento: "aguardando_pagamento",
  };

  const botao = document.getElementById("btnPagarPedido");
  botao.disabled = true;
  botao.textContent = "Enviando pedido...";

  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/pedidos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosPedido),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data?.message || "Erro ao enviar pedido");

    ultimoPedidoEnviado = data.pedido || dadosPedido;

    await iniciarPagamentoPlataforma(ultimoPedidoEnviado);

    fecharModalRevisar();
    abrirModalConfirmacao(dadosPedido);

    carrinho = [];
    cupomAplicado = null;
    localStorage.removeItem("carrinho");
    atualizarBarraSacola();
    reRenderizarAcoesProdutos();
  } catch (error) {
    console.error(error);
    alert("Não foi possível enviar seu pedido. Tente novamente.");
  } finally {
    botao.disabled = false;
    botao.textContent = "Pagar";
  }
};

async function iniciarPagamentoPlataforma(pedido) {
  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/pedidos/${pedido.id}/pagamento`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({}));

    if (response.ok && data.checkout_url) {
      window.location.href = data.checkout_url;
    }
  } catch (error) {
    console.log("Gateway de pagamento não configurado:", error);
  }
}

// ======================================
// CONFIRMAÇÃO FINAL
// ======================================

function abrirModalConfirmacao(dadosPedido) {
  const total =
    dadosPedido.valor_total + dadosPedido.valor_entrega + TAXA_SERVICO;

  document.getElementById("resumoConfirmacao").innerHTML = `
    <p><strong>Itens:</strong> ${dadosPedido.itens}</p>
    <p><strong>Total:</strong> ${formatarPreco(total)}</p>
    <p><strong>${dadosPedido.tipo_entrega === "Entrega" ? "Entrega" : "Retirada"}:</strong>
      ${dadosPedido.tipo_entrega === "Entrega" ? dadosPedido.endereco || "" : "Retirada na loja"}
    </p>
  `;

  document.getElementById("modalConfirmacao").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModalConfirmacao() {
  document.getElementById("modalConfirmacao").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

document.getElementById("fecharConfirmacao").onclick = fecharModalConfirmacao;
document.getElementById("modalConfirmacao").addEventListener("click", (e) => {
  if (e.target.id === "modalConfirmacao") fecharModalConfirmacao();
});
document.getElementById("btnNovoPedido").onclick = fecharModalConfirmacao;

// ======================================
// INICIALIZAÇÃO
// ======================================

carregarCarrinhoSalvo();
carregarCardapio();
carregarBairros();

console.log("🚀 Loja inicializada com sucesso!");
