const previewIframe = document.getElementById("previewCardapioIframe");
const previewLoading = document.getElementById("previewLoading");
const btnAtualizarPreview = document.getElementById("btnAtualizarPreview");

// ==============================
// CATEGORIAS
// ==============================

const btnNovaCategoria = document.getElementById("btnNovaCategoria");

const btnSalvarCategoria = document.getElementById("btnSalvarCategoria");

const btnCancelarCategoria = document.getElementById("btnCancelarCategoria");

const modalCategoria = document.getElementById("modalCategoria");

const overlayCategoria = document.getElementById("overlayCategoria");

const categoriaNome = document.getElementById("categoria_nome");

const listaCategorias = document.getElementById("listaCategorias");

// ==============================
// PRODUTOS
// ==============================

const btnNovoProduto = document.getElementById("btnNovoProduto");

const btnSalvarProduto = document.getElementById("btnSalvarProduto");

const btnCancelarProduto = document.getElementById("btnCancelarProduto");

const modalProduto = document.getElementById("modalProduto");

const overlayProduto = document.getElementById("overlayProduto");

const produtoNome = document.getElementById("produto_nome");

const produtoDescricao = document.getElementById("produto_descricao");

const produtoPreco = document.getElementById("produto_preco");

const produtoCategoria = document.getElementById("produto_categoria");

const produtoImagemUrl = document.getElementById("produto_imagem_url");

const listaProdutos = document.getElementById("listaProdutos");

const previewProdutoImg = document.getElementById("previewProdutoImg");
const previewProdutoPlaceholder = document.getElementById(
  "previewProdutoPlaceholder",
);

if (produtoImagemUrl && previewProdutoImg) {
  produtoImagemUrl.addEventListener("input", () => {
    atualizarPreviewImagem(
      produtoImagemUrl,
      previewProdutoImg,
      previewProdutoPlaceholder,
    );
  });
}

// =================================
// CARDAPIO
// =================================
// Tudo que acontece aqui alimenta o cardápio que o cliente
// final vê na loja (categorias, produtos, logo e banner).

let categoriasCache = [];
let produtosCache = [];
let categoriaSelecionadaId = null; // null = mostra todos os produtos
let produtoEmEdicaoId = null; // null = criando produto novo
let categoriaEmEdicaoId = null; // null = criando categoria nova

const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="225" viewBox="0 0 300 225">
      <rect width="300" height="225" fill="#f0f1f4"/>
      <g fill="#c3c5cf">
        <circle cx="150" cy="95" r="28"/>
        <path d="M60 175 Q150 100 240 175 Z"/>
      </g>
      <text x="150" y="205" font-family="Arial, sans-serif" font-size="13" fill="#9799a6" text-anchor="middle">Sem imagem</text>
    </svg>
  `);

// ---------- Categorias ----------

async function carregarCategorias() {
  const lista = document.getElementById("listaCategorias");

  try {
    const response = await fetch(`${API}/api/cardapio/categorias`, {
      headers,
    });

    const categorias = await response.json();

    if (!response.ok) {
      throw new Error(categorias?.message || "Erro ao carregar categorias");
    }

    categoriasCache = Array.isArray(categorias) ? categorias : [];

    // se a categoria selecionada foi excluída em outro lugar, limpa o filtro
    if (
      categoriaSelecionadaId &&
      !categoriasCache.some((cat) => cat.id === categoriaSelecionadaId)
    ) {
      categoriaSelecionadaId = null;
    }

    renderizarCategorias();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    lista.innerHTML = `<p class="empty-state">Não foi possível carregar as categorias.</p>`;
    mostrarToast("Erro ao carregar categorias", "erro");
  }
}

function renderizarCategorias() {
  const lista = document.getElementById("listaCategorias");

  if (categoriasCache.length === 0) {
    lista.innerHTML = `<p class="empty-state">Nenhuma categoria ainda. Crie a primeira categoria para começar.</p>`;
    return;
  }

  lista.innerHTML = "";

  // chip "Todos" pra limpar o filtro de produtos
  const chipTodos = document.createElement("button");
  chipTodos.type = "button";
  chipTodos.className = `categoria-chip${categoriaSelecionadaId === null ? " ativa" : ""}`;
  chipTodos.textContent = "Todos";
  chipTodos.onclick = () => {
    categoriaSelecionadaId = null;
    renderizarCategorias();
    renderizarProdutos();
  };
  lista.appendChild(chipTodos);

  categoriasCache.forEach((cat) => {
    const chip = document.createElement("div");
    chip.className = `categoria-chip${categoriaSelecionadaId === cat.id ? " ativa" : ""}`;

    const nomeSpan = document.createElement("span");
    nomeSpan.textContent = cat.nome;
    nomeSpan.onclick = () => {
      categoriaSelecionadaId = cat.id;
      renderizarCategorias();
      renderizarProdutos();
    };

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "categoria-chip-excluir";
    btnExcluir.title = "Excluir categoria";
    btnExcluir.textContent = "✕";
    btnExcluir.onclick = (evento) => {
      evento.stopPropagation();
      excluirCategoria(cat.id);
    };

    chip.appendChild(nomeSpan);
    chip.appendChild(btnExcluir);
    lista.appendChild(chip);
  });
}

function abrirModalCategoria() {
  categoriaEmEdicaoId = null;
  document.getElementById("modalCategoriaTitulo").textContent =
    "🏷️ Nova categoria";
  document.getElementById("categoria_nome").value = "";
  document.getElementById("overlayCategoria").classList.add("ativo");
  document.getElementById("modalCategoria").classList.add("ativo");
}

function fecharModalCategoria() {
  document.getElementById("overlayCategoria").classList.remove("ativo");
  document.getElementById("modalCategoria").classList.remove("ativo");
}

document.getElementById("btnNovaCategoria").onclick = abrirModalCategoria;

document.getElementById("btnVisitarLoja").onclick = () => {
  if (!empresaAtual?.id) {
    mostrarToast("Aguarde os dados da empresa carregarem", "erro");
    return;
  }
  const url = `${window.location.origin}/loja/${empresaAtual.id}`;
  window.open(url, "_blank");
};
document.getElementById("btnCancelarCategoria").onclick = fecharModalCategoria;
document.getElementById("overlayCategoria").onclick = fecharModalCategoria;

document.getElementById("btnSalvarCategoria").onclick = async () => {
  const nome = document.getElementById("categoria_nome").value.trim();

  if (!nome) {
    mostrarToast("Digite o nome da categoria", "erro");
    return;
  }

  const botao = document.getElementById("btnSalvarCategoria");
  botao.disabled = true;

  try {
    const editando = Boolean(categoriaEmEdicaoId);
    const url = editando
      ? `${API}/api/cardapio/categorias/${categoriaEmEdicaoId}`
      : `${API}/api/cardapio/categorias`;

    const response = await fetch(url, {
      method: editando ? "PUT" : "POST",
      headers,
      body: JSON.stringify({ nome }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Erro ao salvar categoria");
    }

    mostrarToast(
      editando ? "Categoria atualizada!" : "Categoria criada!",
      "sucesso",
    );

    fecharModalCategoria();
    await carregarCategorias();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Erro ao salvar categoria", "erro");
  } finally {
    botao.disabled = false;
  }
};

async function excluirCategoria(id) {
  if (
    !confirm(
      "Excluir esta categoria? Os produtos vinculados a ela deixarão de estar categorizados.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`${API}/api/cardapio/categorias/${id}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || "Erro ao excluir categoria");
    }

    mostrarToast("Categoria excluída", "sucesso");

    if (categoriaSelecionadaId === id) categoriaSelecionadaId = null;

    await carregarCategorias();
    await carregarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Erro ao excluir categoria", "erro");
  }
}

function preencherSelectCategorias(categoriaSelecionada = "") {
  const select = document.getElementById("produto_categoria");
  const opcaoPadrao =
    '<option value="" disabled>Selecione uma categoria</option>';

  select.innerHTML =
    opcaoPadrao +
    categoriasCache
      .map((cat) => `<option value="${cat.id}">${cat.nome}</option>`)
      .join("");

  select.value = categoriaSelecionada || "";
  if (!select.value) select.selectedIndex = 0;
}

// ---------- Produtos ----------

async function carregarProdutos() {
  const lista = document.getElementById("listaProdutos");

  try {
    const response = await fetch(`${API}/api/cardapio/produtos`, {
      headers,
    });

    const produtos = await response.json();

    if (!response.ok) {
      throw new Error(produtos?.message || "Erro ao carregar produtos");
    }

    produtosCache = Array.isArray(produtos) ? produtos : [];

    renderizarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    lista.innerHTML = `<p class="empty-state">Não foi possível carregar os produtos.</p>`;
    mostrarToast("Erro ao carregar produtos", "erro");
  }
}

function renderizarProdutos() {
  const lista = document.getElementById("listaProdutos");

  const produtosFiltrados = categoriaSelecionadaId
    ? produtosCache.filter(
        (produto) =>
          produto.categoria_id === categoriaSelecionadaId ||
          produto.categorias?.id === categoriaSelecionadaId,
      )
    : produtosCache;

  if (produtosFiltrados.length === 0) {
    lista.innerHTML = `<p class="empty-state">Nenhum produto aqui ainda. Clique em "Novo Produto" para adicionar.</p>`;
    return;
  }

  lista.innerHTML = "";

  produtosFiltrados.forEach((produto) => {
    const card = document.createElement("div");
    card.className = "produto-card";
    card.innerHTML = `
      <img
        src="${produto.imagem_url || PLACEHOLDER_IMG}"
        alt="${produto.nome}"
        onerror="this.src='${PLACEHOLDER_IMG}'"
      >

      <div class="produto-card-body">
        <small>${produto.categorias?.nome || "Sem categoria"}</small>
        <h4>${produto.nome}</h4>
        <p>${produto.descricao || ""}</p>
        <strong>R$ ${Number(produto.preco || 0).toFixed(2)}</strong>

        <div class="produto-card-actions">
          <button class="btn-editar" type="button">Editar</button>
          <button class="btn-excluir" type="button">Excluir</button>
        </div>
      </div>
    `;

    card
      .querySelector(".btn-editar")
      .addEventListener("click", () => editarProduto(produto.id));
    card
      .querySelector(".btn-excluir")
      .addEventListener("click", () => excluirProduto(produto.id));

    lista.appendChild(card);
  });
}

function abrirModalProduto() {
  produtoEmEdicaoId = null;
  document.getElementById("modalProdutoTitulo").textContent = "🍟 Novo produto";
  document.getElementById("produto_nome").value = "";
  document.getElementById("produto_descricao").value = "";
  document.getElementById("produto_preco").value = "";
  document.getElementById("produto_imagem_url").value = "";
  atualizarPreviewImagem(
    produtoImagemUrl,
    previewProdutoImg,
    previewProdutoPlaceholder,
  );
  preencherSelectCategorias();

  document.getElementById("overlayProduto").classList.add("ativo");
  document.getElementById("modalProduto").classList.add("ativo");
}

function fecharModalProduto() {
  document.getElementById("overlayProduto").classList.remove("ativo");
  document.getElementById("modalProduto").classList.remove("ativo");
}

document.getElementById("btnNovoProduto").onclick = abrirModalProduto;
document.getElementById("btnCancelarProduto").onclick = fecharModalProduto;
document.getElementById("overlayProduto").onclick = fecharModalProduto;

document.getElementById("btnSalvarProduto").onclick = async () => {
  const body = {
    nome: document.getElementById("produto_nome").value.trim(),
    descricao: document.getElementById("produto_descricao").value.trim(),
    preco: Number(document.getElementById("produto_preco").value),
    categoria_id: document.getElementById("produto_categoria").value,
    imagem_url: document.getElementById("produto_imagem_url").value,
  };

  if (!body.nome) {
    mostrarToast("Digite o nome do produto", "erro");
    return;
  }
  if (!body.categoria_id) {
    mostrarToast("Selecione uma categoria", "erro");
    return;
  }
  if (!body.preco || body.preco <= 0) {
    mostrarToast("Informe um preço válido", "erro");
    return;
  }

  const botao = document.getElementById("btnSalvarProduto");
  botao.disabled = true;

  try {
    const editando = Boolean(produtoEmEdicaoId);
    const url = editando
      ? `${API}/api/cardapio/produtos/${produtoEmEdicaoId}`
      : `${API}/api/cardapio/produtos`;

    const response = await fetch(url, {
      method: editando ? "PUT" : "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Erro ao salvar produto");
    }

    mostrarToast(
      editando ? "Produto atualizado!" : "Produto criado!",
      "sucesso",
    );

    fecharModalProduto();
    await carregarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Erro ao salvar produto", "erro");
  } finally {
    botao.disabled = false;
  }
};

function editarProduto(id) {
  const produto = produtosCache.find((item) => item.id === id);
  if (!produto) {
    mostrarToast("Produto não encontrado", "erro");
    return;
  }

  produtoEmEdicaoId = id;
  document.getElementById("modalProdutoTitulo").textContent =
    "🍟 Editar produto";
  document.getElementById("produto_nome").value = produto.nome || "";
  document.getElementById("produto_descricao").value = produto.descricao || "";
  document.getElementById("produto_preco").value = produto.preco || "";
  document.getElementById("produto_imagem_url").value =
    produto.imagem_url || "";
  atualizarPreviewImagem(
    produtoImagemUrl,
    previewProdutoImg,
    previewProdutoPlaceholder,
  );

  preencherSelectCategorias(produto.categoria_id || produto.categorias?.id);

  document.getElementById("overlayProduto").classList.add("ativo");
  document.getElementById("modalProduto").classList.add("ativo");
}

async function excluirProduto(id) {
  if (!confirm("Excluir produto?")) {
    return;
  }

  try {
    const response = await fetch(`${API}/api/cardapio/produtos/${id}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message || "Erro ao excluir produto");
    }

    mostrarToast("Produto excluído", "sucesso");
    await carregarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast(error.message || "Erro ao excluir produto", "erro");
  }
}

// ---------- Prévia do cardápio (visão do cliente final) ----------

// Evita que nome/descrição de produto ou categoria quebre o HTML da
// prévia (ou permita injeção) se tiver <, >, & etc.
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function atualizarPreview() {
  if (!empresaAtual?.id || !previewIframe) return;

  previewIframe.classList.add("carregando");
  previewLoading?.classList.add("mostrar");

  const url = `${window.location.origin}/loja/${empresaAtual.id}?preview=${Date.now()}`;

  previewIframe.src = url;

  previewIframe.onload = () => {
    previewIframe.classList.remove("carregando");
    previewLoading?.classList.remove("mostrar");
  };

  setTimeout(() => {
    previewIframe.classList.remove("carregando");
    previewLoading?.classList.remove("mostrar");
  }, 5000);
}

window.carregarCategorias = carregarCategorias;
window.carregarProdutos = carregarProdutos;

window.excluirCategoria = excluirCategoria;
window.excluirProduto = excluirProduto;

window.atualizarPreview = atualizarPreview;
