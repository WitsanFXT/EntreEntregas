// =================================
// PEDIDOS
// =================================
window.STATUS_SEQUENCIA;
window.STATUS_PROXIMA_ACAO;

function criarLinhaPedido(pedido, comAcoes = true) {
  const row = document.createElement("div");
  row.className = "pedido-row";

  const info = document.createElement("div");
  info.className = "cliente-info";
  const codigo = `#${(pedido.id || "").slice(0, 6).toUpperCase()}`;
  info.innerHTML = `
    <strong><span class="pedido-codigo">${codigo}</span> ${pedido.cliente_nome}</strong>
    <p>${pedido.itens}</p>
  `;

  const origem = document.createElement("span");
  origem.className = `origem-badge origem-${pedido.origem}`;
  origem.textContent = ORIGEM_LABELS[pedido.origem] || pedido.origem;

  const valor = document.createElement("span");
  valor.className = "valor-total";
  valor.textContent = Number(pedido.valor_total || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge status-${pedido.status}`;
  statusBadge.textContent = STATUS_LABELS[pedido.status] || pedido.status;

  row.append(info, origem, statusBadge, valor);

  if (comAcoes) {
    const acoes = document.createElement("div");
    acoes.className = "pedido-actions";

    const proximaAcao = STATUS_PROXIMA_ACAO[pedido.status];
    if (proximaAcao) {
      const btnAvancar = document.createElement("button");
      btnAvancar.className = "btn-mini";
      btnAvancar.textContent = proximaAcao;
      btnAvancar.onclick = () => avancarStatusPedido(pedido);
      acoes.appendChild(btnAvancar);
    }

    if (pedido.status !== "entregue" && pedido.status !== "cancelado") {
      const btnCancelar = document.createElement("button");
      btnCancelar.className = "btn-mini";
      btnCancelar.textContent = "Cancelar";
      btnCancelar.onclick = () => atualizarStatusPedido(pedido, "cancelado");
      acoes.appendChild(btnCancelar);
    }

    row.appendChild(acoes);
  }

  return row;
}

async function atualizarStatusPedido(pedido, novoStatus) {
  try {
    const response = await fetch(
      `${API}/api/empresa/pedidos/${pedido.id}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: novoStatus }),
      },
    );

    const data = await response.json();
    mostrarToast(
      data.message || "Status atualizado",
      response.ok ? "sucesso" : "erro",
    );

    if (response.ok) {
      carregarPedidos();
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível atualizar o status", "erro");
  }
}

function avancarStatusPedido(pedido) {
  const indiceAtual = STATUS_SEQUENCIA.indexOf(pedido.status);
  const proximo = STATUS_SEQUENCIA[indiceAtual + 1];
  if (proximo) atualizarStatusPedido(pedido, proximo);
}

async function carregarPedidos() {
  const div = document.getElementById("listaPedidos");

  try {
    const response = await fetch(`${API}/api/empresa/pedidos`, { headers });
    const pedidos = await response.json();

    pedidosCache = Array.isArray(pedidos) ? pedidos : [];

    div.innerHTML = "";
    if (!pedidosCache.length) {
      div.innerHTML = `<p class="empty-state">Nenhum pedido ainda.</p>`;
    } else {
      pedidosCache.forEach((p) => div.appendChild(criarLinhaPedido(p)));
    }

    renderizarPedidosRecentes();
    atualizarBadgePedidos();
  } catch (error) {
    console.error(error);
    div.innerHTML = `<p class="empty-state">Não foi possível carregar os pedidos.</p>`;
  }
}

function renderizarPedidosRecentes() {
  const container = document.getElementById("listaPedidosRecentes");
  const recentes = pedidosCache.slice(0, 5);

  container.innerHTML = "";
  if (!recentes.length) {
    container.innerHTML = `<p class="empty-state">Nenhum pedido ainda.</p>`;
    return;
  }

  recentes.forEach((p) => container.appendChild(criarLinhaPedido(p, false)));
}

function atualizarBadgePedidos() {
  const pendentes = pedidosCache.filter(
    (p) => p.status === "aguardando" || p.status === "confirmado",
  ).length;
  const badge = document.getElementById("badgePedidosSidebar");
  badge.textContent = pendentes;
  badge.style.display = pendentes > 0 ? "flex" : "none";
}

// =================================
// EXPORTAR FUNÇÕES GLOBAIS
// =================================

window.carregarPedidos = carregarPedidos;

window.criarLinhaPedido = criarLinhaPedido;

window.atualizarStatusPedido = atualizarStatusPedido;

window.avancarStatusPedido = avancarStatusPedido;

window.renderizarPedidosRecentes = renderizarPedidosRecentes;

window.atualizarBadgePedidos = atualizarBadgePedidos;
