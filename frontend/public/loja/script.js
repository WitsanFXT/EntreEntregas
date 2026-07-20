// ======================================
// ENTREENTREGAS - LOJA PÚBLICA
// ======================================

// ======================================
// CONFIGURAÇÃO
// ======================================

const empresaId =
  new URLSearchParams(window.location.search).get("empresa") ||
  window.location.pathname.split("/").filter(Boolean).pop();
const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5500"
    : "";

// ======================================
// ESTADO
// ======================================

let dadosCardapio = null;
let carrinho = [];
let categoriaAtiva = null;
let produtoSelecionado = null;
let tipoEntrega = "Entrega";
let taxaEntrega = 0;
let bairroSelecionado = "";

// ======================================
// DOM REFERÊNCIAS
// ======================================

const app = document.getElementById("heroLoja");
const logoLoja = document.getElementById("logoLoja");
const nomeLoja = document.getElementById("nomeLoja");
const descricaoLoja = document.getElementById("descricaoLoja");
const statusLoja = document.getElementById("statusLoja");
const navCategorias = document.getElementById("navCategorias");
const produtosMain = document.getElementById("produtosMain");
const listaMaisPedidos = document.getElementById("listaMaisPedidos");

// ======================================
// FUNÇÃO PRINCIPAL - CARREGAR CARDÁPIO
// ======================================

async function carregarCardapio() {
  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/cardapio`,
    );
    const dados = await response.json();

    if (!response.ok) {
      mostrarErro(
        "Loja não encontrada",
        "Verifique o link ou tente novamente.",
      );
      return;
    }

    dadosCardapio = dados;
    renderizarLoja();
  } catch (error) {
    console.error("Erro:", error);
    mostrarErro("Erro ao carregar", "Não foi possível carregar o cardápio.");
  }
}

// ======================================
// BANNER DA LOJA
// ======================================
// A .hero já tem uma imagem padrão no CSS (fallback). Aqui a gente só
// sobrescreve com o banner real da loja quando ele existe e carrega
// direito — senão, mantém o padrão em vez de mostrar um banner quebrado.

function aplicarBannerLoja(bannerUrl) {
  if (!bannerUrl) {
    app.style.backgroundImage = "";
    return;
  }

  const testeImagem = new Image();
  testeImagem.onload = () => {
    app.style.backgroundImage = `linear-gradient(180deg, rgba(27, 21, 18, 0.35), rgba(27, 21, 18, 0.85)), url("${bannerUrl}")`;
  };
  testeImagem.onerror = () => {
    app.style.backgroundImage = "";
  };
  testeImagem.src = bannerUrl;
}

// ======================================
// RENDERIZAR LOJA
// ======================================

function renderizarLoja() {
  if (!dadosCardapio) return;

  const { empresa, categorias, produtos } = dadosCardapio;

  // HEADER
  if (empresa.logo_url) {
    logoLoja.src = empresa.logo_url;
    logoLoja.alt = `Logo ${empresa.nome_fantasia}`;
  } else {
    logoLoja.style.display = "none";
  }

  aplicarBannerLoja(empresa.banner_url);

  nomeLoja.textContent = empresa.nome_fantasia || "Loja";
  descricaoLoja.textContent = `📍 ${empresa.bairro || ""} - ${empresa.cidade || ""}`;
  statusLoja.className = "status-loja aberto";
  statusLoja.textContent = "🟢 Aberto agora";

  // CATEGORIAS (NAV)
  navCategorias.innerHTML = `
        <button class="categoria-link ${!categoriaAtiva ? "ativo" : ""}" onclick="filtrarCategoria(null)">
            Todos
        </button>
        ${categorias
          .map(
            (cat) => `
            <button class="categoria-link ${categoriaAtiva === cat.id ? "ativo" : ""}" onclick="filtrarCategoria('${cat.id}')">
                ${cat.nome}
            </button>
        `,
          )
          .join("")}
    `;

  // PRODUTOS
  const produtosFiltrados = categoriaAtiva
    ? produtos.filter((p) => p.categoria_id === categoriaAtiva)
    : produtos;

  const produtosAtivos = produtosFiltrados.filter((p) => p.ativo !== false);

  // Agrupa por categoria para exibir
  const categoriasComProdutos = categorias.filter((cat) =>
    produtosAtivos.some((p) => p.categoria_id === cat.id),
  );

  if (categoriasComProdutos.length === 0) {
    produtosMain.innerHTML = `
            <div class="vazio" style="text-align:center;padding:40px;color:#999;">
                <p>Nenhum produto disponível no momento.</p>
            </div>
        `;
    return;
  }

  let html = "";
  categoriasComProdutos.forEach((cat) => {
    const produtosCat = produtosAtivos.filter((p) => p.categoria_id === cat.id);
    html += `
            <h2 class="titulo-categoria">${cat.nome}</h2>
            <div class="produtos-grid">
                ${produtosCat
                  .map(
                    (p) => `
                    <div class="produto-card" data-id="${p.id}">
                        <img src="${p.imagem_url || ""}" alt="${p.nome}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23eee%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%22150%22 y=%22150%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E🍔%3C/text%3E%3C/svg%3E'">
                        <h3>${p.nome}</h3>
                        <p>${p.descricao || ""}</p>
                        <span class="preco">R$ ${Number(p.preco).toFixed(2)}</span>
                        <button class="btn-adicionar" onclick="abrirModal('${p.id}')">Adicionar</button>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  });

  produtosMain.innerHTML = html;

  // MAIS PEDIDOS (top 4)
  const maisPedidos = produtosAtivos.slice(0, 4);
  listaMaisPedidos.innerHTML = maisPedidos
    .map(
      (p) => `
        <div class="produto-card">
            <img src="${p.imagem_url || ""}" alt="${p.nome}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23eee%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%22150%22 y=%22150%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23999%22%3E🔥%3C/text%3E%3C/svg%3E'">
            <h3>${p.nome}</h3>
            <span class="preco">R$ ${Number(p.preco).toFixed(2)}</span>
            <button class="btn-adicionar" onclick="abrirModal('${p.id}')">Adicionar</button>
        </div>
    `,
    )
    .join("");

  // Atualizar carrinho
  atualizarCarrinho();
}

// ======================================
// FILTRAR POR CATEGORIA
// ======================================

function filtrarCategoria(categoriaId) {
  categoriaAtiva = categoriaId;
  renderizarLoja();
}

// ======================================
// MOSTRAR ERRO
// ======================================

function mostrarErro(titulo, mensagem) {
  document.getElementById("heroLoja").innerHTML = `
        <div class="overlay">
            <div style="text-align:center;color:#fff;padding:40px;">
                <h2>${titulo}</h2>
                <p>${mensagem}</p>
            </div>
        </div>
    `;
}

// ======================================
// MODAL PRODUTO
// ======================================

function abrirModal(id) {
  const produto = dadosCardapio.produtos.find((p) => p.id === id);
  if (!produto) return;

  produtoSelecionado = produto;
  document.getElementById("produtoNome").textContent = produto.nome;
  document.getElementById("produtoPreco").textContent =
    `R$ ${Number(produto.preco).toFixed(2)}`;
  document.getElementById("quantidadeInput").value = 1;
  document.getElementById("observacao").value = "";
  atualizarSubtotalModal();
  document.getElementById("modalProduto").classList.add("ativo");
  document.body.classList.add("sem-scroll");
}

function fecharModal() {
  document.getElementById("modalProduto").classList.remove("ativo");
  document.body.classList.remove("sem-scroll");
}

document.getElementById("fecharModal").addEventListener("click", fecharModal);
document.getElementById("modalProduto").addEventListener("click", (e) => {
  if (e.target.id === "modalProduto") fecharModal();
});

function atualizarSubtotalModal() {
  if (!produtoSelecionado) return;
  const qtd = Number(document.getElementById("quantidadeInput").value);
  const subtotal = produtoSelecionado.preco * qtd;
  document.getElementById("subtotalModal").textContent =
    `Total: R$ ${subtotal.toFixed(2)}`;
}

document
  .getElementById("quantidadeInput")
  .addEventListener("input", atualizarSubtotalModal);

document.getElementById("maisBtn").addEventListener("click", () => {
  const input = document.getElementById("quantidadeInput");
  input.value = Number(input.value) + 1;
  atualizarSubtotalModal();
});

document.getElementById("menosBtn").addEventListener("click", () => {
  const input = document.getElementById("quantidadeInput");
  if (Number(input.value) > 1) {
    input.value = Number(input.value) - 1;
    atualizarSubtotalModal();
  }
});

// ======================================
// ADICIONAR AO CARRINHO
// ======================================

document.getElementById("adicionarCarrinho").addEventListener("click", () => {
  if (!produtoSelecionado) return;

  const qtd = Number(document.getElementById("quantidadeInput").value);
  const obs = document.getElementById("observacao").value;

  const existente = carrinho.find(
    (item) => item.id === produtoSelecionado.id && item.observacao === obs,
  );

  if (existente) {
    existente.quantidade += qtd;
  } else {
    carrinho.push({
      ...produtoSelecionado,
      chave: crypto.randomUUID(),
      quantidade: qtd,
      observacao: obs,
    });
  }

  fecharModal();
  atualizarCarrinho();
  salvarCarrinho();
});

// ======================================
// CARRINHO
// ======================================

function atualizarCarrinho() {
  const container = document.getElementById("itensCarrinho");
  container.innerHTML = "";

  let total = 0;

  carrinho.forEach((item) => {
    const subtotal = item.preco * item.quantidade;
    total += subtotal;

    container.innerHTML += `
            <div class="carrinho-item">
                <h4>${item.nome}</h4>
                <p>${item.quantidade}x - R$ ${subtotal.toFixed(2)}</p>
                ${item.observacao ? `<small>${item.observacao}</small>` : ""}
                <button class="btn-remover" onclick="removerItem('${item.chave}')">Remover</button>
            </div>
        `;
  });

  const totalFinal = total + taxaEntrega;
  document.getElementById("totalCarrinho").textContent =
    `Total: R$ ${totalFinal.toFixed(2)}`;

  const badge = document.getElementById("badgeCarrinho");
  badge.textContent = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
}

function removerItem(chave) {
  carrinho = carrinho.filter((item) => item.chave !== chave);
  atualizarCarrinho();
  salvarCarrinho();
}

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function carregarCarrinhoSalvo() {
  const salvo = localStorage.getItem("carrinho");
  if (salvo) {
    carrinho = JSON.parse(salvo);
    atualizarCarrinho();
  }
}

// ======================================
// CARRINHO TOGGLE
// ======================================

document.getElementById("btnCarrinho").addEventListener("click", () => {
  document.getElementById("carrinho").classList.toggle("aberto");
});

document.getElementById("fecharCarrinho").addEventListener("click", () => {
  document.getElementById("carrinho").classList.remove("aberto");
});

// ======================================
// TIPO DE ENTREGA
// ======================================

function alternarTipoEntrega(tipo) {
  tipoEntrega = tipo;
  const btnEntrega = document.getElementById("btnEntrega");
  const btnRetirada = document.getElementById("btnRetirada");
  const camposEntrega = document.getElementById("camposEntrega");
  const avisoRetirada = document.getElementById("avisoRetirada");

  if (tipo === "Entrega") {
    btnEntrega.classList.add("ativo");
    btnRetirada.classList.remove("ativo");
    camposEntrega.style.display = "flex";
    avisoRetirada.style.display = "none";
  } else {
    btnRetirada.classList.add("ativo");
    btnEntrega.classList.remove("ativo");
    camposEntrega.style.display = "none";
    avisoRetirada.style.display = "block";
    taxaEntrega = 0;
    bairroSelecionado = "Retirada na loja";
  }
  atualizarCarrinho();
}

document
  .getElementById("btnEntrega")
  .addEventListener("click", () => alternarTipoEntrega("Entrega"));
document
  .getElementById("btnRetirada")
  .addEventListener("click", () => alternarTipoEntrega("Retirada"));

// ======================================
// BAIRROS
// ======================================

let bairrosDisponiveis = [];

async function carregarBairros() {
  const select = document.getElementById("bairroCliente");

  try {
    const response = await fetch(
      `${API_URL}/api/publico/empresas/${empresaId}/tabela-precos`,
    );

    const dados = await response.json();

    bairrosDisponiveis = response.ok && Array.isArray(dados) ? dados : [];
  } catch (error) {
    console.error("Erro ao carregar bairros:", error);
    bairrosDisponiveis = [];
  }

  select.innerHTML = '<option value="">Selecione o bairro</option>';

  bairrosDisponiveis.forEach((b) => {
    select.innerHTML += `<option value="${b.bairro}">${b.bairro} - R$ ${Number(b.valor).toFixed(2)}</option>`;
  });

  select.onchange = () => {
    const bairro = bairrosDisponiveis.find((b) => b.bairro === select.value);
    if (bairro && tipoEntrega === "Entrega") {
      taxaEntrega = Number(bairro.valor);
      bairroSelecionado = bairro.bairro;
    } else {
      taxaEntrega = 0;
    }
    atualizarCarrinho();
  };
}

// ======================================
// FINALIZAR PEDIDO
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

let ultimoPedidoEnviado = null;

document
  .getElementById("finalizarPedido")
  .addEventListener("click", async () => {
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio!");
      return;
    }

    const cliente_nome = document.getElementById("nomeCliente").value.trim();
    const cliente_telefone = document
      .getElementById("celularCliente")
      .value.trim();
    const endereco = document.getElementById("enderecoCliente").value.trim();

    if (!cliente_nome || !cliente_telefone) {
      alert("Preencha nome e celular.");
      return;
    }

    if (tipoEntrega === "Entrega" && (!endereco || !bairroSelecionado)) {
      alert("Preencha o endereço e selecione o bairro.");
      return;
    }

    const valor_total = carrinho.reduce(
      (sum, item) => sum + item.preco * item.quantidade,
      0,
    );

    const dadosPedido = {
      cliente_nome,
      cliente_telefone,
      itens: montarItensTexto(),
      valor_total,
      valor_entrega: tipoEntrega === "Entrega" ? taxaEntrega : 0,
      tipo_entrega: tipoEntrega,
      endereco: tipoEntrega === "Entrega" ? endereco : null,
      bairro:
        tipoEntrega === "Entrega" ? bairroSelecionado : "Retirada na loja",
      cidade: dadosCardapio?.empresa?.cidade || null,
      latitude: null,
      longitude: null,
      // status inicial — o pedido só é confirmado de fato quando o
      // gateway avisar (via webhook) que o pagamento passou.
      status_pagamento: "aguardando_pagamento",
    };

    const botao = document.getElementById("finalizarPedido");
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

      if (!response.ok) {
        throw new Error(data?.message || "Erro ao enviar pedido");
      }

      ultimoPedidoEnviado = data.pedido || dadosPedido;
      abrirModalConfirmacao(ultimoPedidoEnviado);

      carrinho = [];
      localStorage.removeItem("carrinho");
      atualizarCarrinho();
      document.getElementById("carrinho").classList.remove("aberto");
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível enviar seu pedido agora. Tente novamente em instantes.",
      );
    } finally {
      botao.disabled = false;
      botao.textContent = "Finalizar Pedido";
    }
  });

// ======================================
// MODAL CONFIRMAÇÃO + PAGAMENTO
// ======================================

function abrirModalConfirmacao(dadosPedido) {
  const total = dadosPedido.valor_total + dadosPedido.valor_entrega;

  document.getElementById("resumoConfirmacao").innerHTML = `
    <p><strong>Itens:</strong> ${dadosPedido.itens}</p>
    <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
    <p><strong>${dadosPedido.tipo_entrega === "Entrega" ? "Entrega" : "Retirada"}:</strong>
      ${dadosPedido.tipo_entrega === "Entrega" ? `${dadosPedido.endereco} — ${dadosPedido.bairro}` : "Retirada na loja"}
    </p>
  `;

  document.getElementById("modalConfirmacao").classList.add("ativo");
}

function fecharModalConfirmacao() {
  document.getElementById("modalConfirmacao").classList.remove("ativo");
}

document
  .getElementById("fecharConfirmacao")
  .addEventListener("click", fecharModalConfirmacao);

document.getElementById("modalConfirmacao").addEventListener("click", (e) => {
  if (e.target.id === "modalConfirmacao") fecharModalConfirmacao();
});

document.getElementById("btnNovoPedido").addEventListener("click", () => {
  fecharModalConfirmacao();
});

// ⚠️ PLACEHOLDER — ainda não sei qual gateway vocês vão usar
// (Mercado Pago, PagBank, Stripe, Asaas, Pagar.me...). O real vai
// ser: chamar o backend, que cria uma sessão/checkout no gateway e
// devolve uma URL — aí sim a gente redireciona o cliente pra lá.
document
  .getElementById("btnPagarConfirmacao")
  .addEventListener("click", async () => {
    if (!ultimoPedidoEnviado) return;

    const botao = document.getElementById("btnPagarConfirmacao");
    botao.disabled = true;
    botao.textContent = "Abrindo pagamento...";

    try {
      const response = await fetch(
        `${API_URL}/api/publico/empresas/${empresaId}/pedidos/${ultimoPedidoEnviado.id}/pagamento`,
        { method: "POST" },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.checkout_url) {
        throw new Error("Pagamento pela plataforma ainda não está ligado.");
      }

      window.location.href = data.checkout_url;
    } catch (error) {
      console.error(error);
      alert(
        "O pagamento pela plataforma ainda está sendo configurado. Aguarde a loja confirmar seu pedido.",
      );
    } finally {
      botao.disabled = false;
      botao.textContent = "Ir para o pagamento";
    }
  });

// ======================================
// INICIALIZAÇÃO
// ======================================

carregarCarrinhoSalvo();
carregarCardapio();
carregarBairros();
