// =================================
// CONFIG / AUTENTICAÇÃO
// =================================

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5500"
    : "";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login/login.html";
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// =================================
// SUPABASE REALTIME
// =================================

const SUPABASE_URL = "https://gnrhxvbyxnixnrppwnul.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_FzazGW0YE3mAcFO6NlUk6g_e5_pq_Nw";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

let empresaAtual = null;
const entregasCache = new Map();
let pedidosCache = [];
let entregaProblema = null;

let bairrosTabela = [];
let valorEntregaAtual = 0;

let mapaPedido = null;
let marcadorPedido = null;

const STATUS_LABELS = {
  pendente: "Pendente",
  aceita: "Aceita",
  aceito: "Aceita",
  retirada: "Retirada",
  em_rota: "Em rota",
  a_caminho: "A caminho",
  entregue: "Entregue",
  finalizada: "Entregue",
  concluida: "Entregue",
  concluido: "Entregue",
  cancelada: "Cancelada",
  cancelado: "Cancelado",
  sem_entregador: "Sem entregador",
  aguardando: "Aguardando",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu p/ entrega",
};

const ORIGEM_LABELS = {
  ifood: "iFood",
  manual: "Manual",
  site: "Site próprio",
};

// =================================
// TOAST
// =================================

function mostrarToast(mensagem, tipo = "") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`.trim();
  toast.textContent = mensagem;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("mostrar"));
  setTimeout(() => {
    toast.classList.remove("mostrar");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// =================================
// NAVEGAÇÃO ENTRE TELAS
// =================================

const TITULOS_TELA = {
  dashboard: { titulo: "Painel Geral", crumb: "Dashboard" },
  pedidos: { titulo: "Pedidos", crumb: "Pedidos" },
  entregas: { titulo: "Entregas", crumb: "Entregas" },
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
// GEOLOCALIZAÇÃO (reutilizada no form de entrega e no de configurações)
// =================================

async function carregarBairros() {
  try {
    const resposta = await fetch(`${API}/api/tabela-precos`, {
      headers,
    });

    const dados = await resposta.json();

    bairrosTabela = dados;

    console.log("BAIRROS CARREGADOS:", bairrosTabela);
  } catch (error) {
    console.error("Erro bairros", error);
  }
}

const inputBairro = document.getElementById("np_bairro");

const listaBairros = document.getElementById("listaBairros");

inputBairro.addEventListener("input", () => {
  const texto = inputBairro.value.toLowerCase().trim();

  listaBairros.innerHTML = "";

  if (!texto) {
    listaBairros.classList.remove("ativo");
    return;
  }

  const encontrados = bairrosTabela.filter((b) => {
    return b.bairro
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(texto.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  });

  encontrados.forEach((bairro) => {
    const item = document.createElement("div");

    item.className = "item-bairro";

    item.innerHTML = `

        <span>
          ${bairro.bairro}
        </span>

        <strong>
          R$ ${Number(bairro.valor).toFixed(2)}
        </strong>

    `;

    item.onclick = () => {
      inputBairro.value = bairro.bairro;

      valorEntregaAtual = Number(bairro.valor);

      document.getElementById("np_taxa_entrega").value =
        valorEntregaAtual.toFixed(2);

      calcularTotalPedido();

      listaBairros.classList.remove("ativo");
    };

    listaBairros.appendChild(item);
  });

  if (encontrados.length) {
    listaBairros.classList.add("ativo");
  } else {
    listaBairros.classList.remove("ativo");
  }
});

document.getElementById("np_bairro").addEventListener("change", () => {
  const bairro = document.getElementById("np_bairro").value;

  const encontrado = bairrosTabela.find(
    (b) => b.bairro.toLowerCase() === bairro.toLowerCase(),
  );

  if (encontrado) {
    valorEntregaAtual = Number(encontrado.valor);

    document.getElementById("np_taxa_entrega").value =
      valorEntregaAtual.toFixed(2);

    calcularTotalPedido();
  }
});

function calcularTotalPedido() {
  const produtos =
    Number(document.getElementById("np_valor_produtos").value) || 0;

  const entrega = Number(valorEntregaAtual) || 0;

  const total = produtos + entrega;

  document.getElementById("np_valor_total").value = total.toFixed(2);

  console.log("TOTAL PEDIDO:", {
    produtos,
    entrega,
    total,
  });
}

document
  .getElementById("np_valor_produtos")
  .addEventListener("input", calcularTotalPedido);

async function buscarEnderecoPedido() {
  const endereco = document.getElementById("np_endereco").value;
  const bairro = document.getElementById("np_bairro").value;
  const cidade = document.getElementById("np_cidade").value;

  const tentativas = [
    `${endereco}, ${bairro}, ${cidade}, MG, Brasil`,
    `${endereco}, ${cidade}, MG, Brasil`,
    `${bairro}, ${cidade}, MG, Brasil`,
    `${cidade}, MG, Brasil`,
  ];

  for (const busca of tentativas) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busca)}`,
    );

    const data = await response.json();

    if (data.length) {
      const local = data[0];

      document.getElementById("np_latitude").value = local.lat;
      document.getElementById("np_longitude").value = local.lon;

      mostrarToast("Endereço localizado", "sucesso");

      return;
    }
  }

  mostrarToast("Endereço não encontrado. Selecione no mapa.", "erro");
}
document
  .getElementById("btnBuscarEndereco")
  .addEventListener("click", async () => {
    console.log("BOTÃO BUSCAR CLICADO");

    const endereco = document.getElementById("np_endereco").value.trim();

    const bairro = document.getElementById("np_bairro").value.trim();

    const cidade = document.getElementById("np_cidade").value.trim();

    if (!endereco) {
      mostrarToast("Digite o endereço primeiro", "erro");
      return;
    }

    if (!mapaPedido) {
      iniciarMapaPedido();
    }

    const tentativas = [
      `${endereco}, ${bairro}, ${cidade}, Minas Gerais, Brasil`,

      `${endereco}, ${cidade}, Minas Gerais, Brasil`,

      `${endereco}, Unaí, MG, Brasil`,

      `${bairro}, ${cidade}, Minas Gerais, Brasil`,
    ];

    console.log("TENTATIVAS:", tentativas);

    try {
      let encontrado = null;

      for (const busca of tentativas) {
        console.log("CONSULTANDO:", busca);

        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(busca)}`;

        const resposta = await fetch(url, {
          headers: {
            "Accept-Language": "pt-BR",
          },
        });

        const dados = await resposta.json();

        console.log("RESULTADO:", dados);

        if (dados.length) {
          encontrado = dados[0];
          break;
        }
      }

      if (!encontrado) {
        mostrarToast("Não encontrei. Clique no mapa para marcar.", "erro");

        return;
      }

      const lat = Number(encontrado.lat);
      const lng = Number(encontrado.lon);

      console.log("COORDENADAS PESQUISA:", lat, lng);

      adicionarMarcador(lat, lng);

      document.getElementById("np_latitude").value = lat.toFixed(8);

      document.getElementById("np_longitude").value = lng.toFixed(8);

      mostrarToast("Endereço localizado", "sucesso");
    } catch (error) {
      console.error(error);

      mostrarToast("Erro ao buscar endereço", "erro");
    }
  });

// Inicializar mapa para seleção de coordenadas
let map = null;

function inicializarMapa() {
  const mapContainer = document.getElementById("mapa");
  if (!mapContainer) return;

  map = L.map("mapa").setView([-16.3518, -46.912], 13); // Unai como padrão

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // Capturar clique no mapa para preenchimento de coordenadas
  map.on("click", function (e) {
    document.getElementById("np_latitude").value = e.latlng.lat;
    document.getElementById("np_longitude").value = e.latlng.lng;
    mostrarToast("Coordenadas atualizadas no mapa", "sucesso");
  });
}

function ligarBotaoLocalizacao(idBotao, idLat, idLon, idStatus) {
  const el = document.getElementById(idBotao);
  if (!el) return;

  el.onclick = () => {
    const botao = document.getElementById(idBotao);
    const status = document.getElementById(idStatus);

    botao.disabled = true;
    botao.textContent = "Buscando localização...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById(idLat).value = pos.coords.latitude;
        document.getElementById(idLon).value = pos.coords.longitude;
        status.textContent = "✓ Localização capturada";
        botao.disabled = false;
        botao.textContent = "Usar minha localização";
      },
      () => {
        mostrarToast("Erro ao pegar localização", "erro");
        botao.disabled = false;
        botao.textContent = "Usar minha localização";
      },
    );
  };
}

ligarBotaoLocalizacao(
  "buscarLocalizacao",
  "latitude",
  "longitude",
  "gpsStatus",
);
ligarBotaoLocalizacao(
  "cfgBuscarLocalizacao",
  "cfg_latitude",
  "cfg_longitude",
  "cfgGpsStatus",
);

// =================================
// ENTREGAS — criar
// =================================

document.getElementById("btnCriarEntrega").onclick = async () => {
  const botao = document.getElementById("btnCriarEntrega");

  const body = {
    cliente_nome: document.getElementById("cliente_nome").value,
    cliente_telefone: document.getElementById("cliente_telefone").value,
    endereco: document.getElementById("endereco").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    descricao: document.getElementById("descricao").value,
    latitude: Number(document.getElementById("latitude").value),
    longitude: Number(document.getElementById("longitude").value),
  };

  botao.disabled = true;
  botao.textContent = "Criando entrega...";

  try {
    const response = await fetch(`${API}/api/entregas`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    mostrarToast(
      data.message || "Entrega criada",
      response.ok ? "sucesso" : "erro",
    );

    if (response.ok) {
      [
        "cliente_nome",
        "cliente_telefone",
        "endereco",
        "bairro",
        "cidade",
        "descricao",
        "latitude",
        "longitude",
      ].forEach((id) => (document.getElementById(id).value = ""));
      document.getElementById("gpsStatus").textContent = "";
    }

    carregarEntregas();
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível criar a entrega", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Criar entrega";
  }
};

// =================================
// ENTREGAS — listar
// =================================

function criarCardEntrega(entrega) {
  const item = document.createElement("div");
  item.className = "entrega-card";
  if (["sem_entregador", "sem_entregadores"].includes(entrega.status))
    item.classList.add("sem-entregador");

  const header = document.createElement("div");
  header.className = "entrega-header";

  const cliente = document.createElement("span");
  cliente.className = "entrega-cliente";
  cliente.textContent = entrega.cliente_nome || "Cliente";

  const badge = document.createElement("span");
  badge.className = `status-badge status-${entrega.status}`;
  badge.textContent = STATUS_LABELS[entrega.status] || entrega.status || "—";

  header.append(cliente, badge);
  item.appendChild(header);

  const endereco = document.createElement("p");
  endereco.className = "entrega-info";
  endereco.textContent = `📍 ${entrega.endereco || "-"}`;
  item.appendChild(endereco);

  const bairro = document.createElement("p");
  bairro.className = "entrega-info";
  bairro.textContent = `🏙️ ${entrega.bairro || "-"}${entrega.cidade ? " · " + entrega.cidade : ""}`;
  item.appendChild(bairro);

  if (entrega.status === "sem_entregador") {
    const footer = document.createElement("div");
    footer.className = "entrega-footer";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "acao btn-solucionar";
    btn.textContent = "⚠️ Solucionar";
    btn.onclick = () => abrirModalSemEntregador(entrega);
    footer.appendChild(btn);
    item.appendChild(footer);
  }
  if (entrega.entregadores) {
    const entregador = document.createElement("p");

    entregador.className = "entrega-info";

    entregador.textContent = `🛵 ${
      entrega.entregadores.usuarios?.nome || "Entregador"
    }`;

    item.appendChild(entregador);
  }

  return item;
}

function atualizarAlertBanner() {
  const semEntregador = [...entregasCache.values()].filter(
    (e) => e.status === "sem_entregador",
  ).length;

  document.getElementById("qtdSemEntregador").textContent = semEntregador;
  document
    .getElementById("alertBanner")
    .classList.toggle("oculto", semEntregador === 0);

  const badgeEntregas = document.getElementById("badgeEntregasSidebar");
  badgeEntregas.textContent = semEntregador;
  badgeEntregas.style.display = semEntregador > 0 ? "flex" : "none";
}

function renderizarEntregasAoVivo() {
  const container = document.getElementById("entregasAoVivo");
  const emRota = [...entregasCache.values()].filter((e) =>
    ["pendente", "aceita", "retirada", "em_rota", "a_caminho"].includes(
      e.status,
    ),
  );

  container.innerHTML = "";
  if (!emRota.length) {
    container.innerHTML = `<p class="empty-state">Nenhuma entrega em rota.</p>`;
    return;
  }

  emRota.forEach((entrega) => {
    const card = document.createElement("div");
    card.className = "entrega-live-card";

    const codigo = `#${(entrega.id || "").slice(0, 6).toUpperCase()}`;
    const nomeEntregador =
      entrega.entregadores?.usuarios?.nome || "Entregador a caminho";

    card.innerHTML = `
      <div class="entrega-live-topo">
        <span class="entrega-live-codigo">${codigo}</span>
        <span class="status-badge status-${entrega.status}">${STATUS_LABELS[entrega.status] || entrega.status}</span>
      </div>
      <div class="entrega-live-entregador">🛵 <strong>${nomeEntregador}</strong></div>
      <div class="entrega-live-endereco">📍 ${entrega.endereco || ""}${entrega.bairro ? " — " + entrega.bairro : ""}</div>
    `;
    container.appendChild(card);
  });
}

function atualizarPendingPill(qtd) {
  const pill = document.getElementById("pendingPill");
  document.getElementById("pendingPillTexto").textContent =
    `${qtd} pedido${qtd === 1 ? "" : "s"} pendente${qtd === 1 ? "" : "s"}`;
  pill.style.display = qtd > 0 ? "flex" : "none";
}

async function carregarEntregas() {
  const div = document.getElementById("listaEntregas");

  try {
    const response = await fetch(`${API}/api/entregas/empresa`, { headers });

    const entregas = await response.json();

    console.log("ENTREGAS RECEBIDAS:", entregas);

    div.innerHTML = "";

    entregasCache.clear();

    if (!Array.isArray(entregas) || entregas.length === 0) {
      div.innerHTML = `
        <p class="empty-state">
          Nenhuma entrega encontrada.
        </p>
      `;

      renderizarEntregasAoVivo();

      return;
    }

    entregas.forEach((entrega) => {
      entregasCache.set(entrega.id, entrega);

      div.appendChild(criarCardEntrega(entrega));
    });

    atualizarAlertBanner();

    renderizarEntregasAoVivo();

    atualizarMetricEmEntrega();
  } catch (error) {
    console.error(error);

    div.innerHTML = `
      <p class="empty-state">
        Não foi possível carregar entregas.
      </p>
    `;
  }
}

function atualizarMetricEmEntrega() {
  const emEntrega = [...entregasCache.values()].filter(
    (e) => e.status === "aceita" || e.status === "retirada",
  ).length;
  const el = document.getElementById("metricEntrega");
  if (el) el.textContent = emEntrega;
}

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
// PEDIDOS
// =================================

const STATUS_SEQUENCIA = [
  "aguardando",
  "confirmado",
  "em_preparo",
  "saiu_para_entrega",
  "entregue",
];
const STATUS_PROXIMA_ACAO = {
  aguardando: "Confirmar",
  confirmado: "Em preparo",
  em_preparo: "Saiu p/ entrega",
  saiu_para_entrega: "Marcar entregue",
};

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

// ---------- Modal Novo Pedido ----------

function iniciarMapaPedido() {
  if (mapaPedido) return;

  mapaPedido = L.map("mapaPedido").setView([-16.3605, -46.8845], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapaPedido);

  mapaPedido.on("click", function (e) {
    adicionarMarcador(e.latlng.lat, e.latlng.lng);
  });

  setTimeout(() => {
    mapaPedido.invalidateSize();
  }, 500);
}

function adicionarMarcador(lat, lng) {
  console.log("ADICIONANDO MARCADOR:", lat, lng);

  const posicao = [Number(lat), Number(lng)];

  if (marcadorPedido) {
    marcadorPedido.setLatLng(posicao);
  } else {
    marcadorPedido = L.marker(posicao, {
      draggable: true,
    })
      .addTo(mapaPedido)
      .bindPopup(
        `
    <strong>📍 Cliente</strong><br>
    Local da entrega
`,
      )
      .openPopup();
  }

  mapaPedido.setView(posicao, 18, {
    animate: true,
  });

  document.getElementById("np_latitude").value = Number(lat).toFixed(8);

  document.getElementById("np_longitude").value = Number(lng).toFixed(8);
}

function abrirModalNovoPedido() {
  document.getElementById("overlayNovoPedido").classList.add("ativo");

  document.getElementById("modalNovoPedido").classList.add("ativo");

  setTimeout(() => {
    iniciarMapaPedido();

    mapaPedido.invalidateSize(true);
  }, 800);
}

function fecharModalNovoPedido() {
  document.getElementById("overlayNovoPedido").classList.remove("ativo");
  document.getElementById("modalNovoPedido").classList.remove("ativo");
  [
    "np_cliente_nome",
    "np_cliente_telefone",
    "np_itens",
    "np_valor_total",
    "np_endereco",
    "np_bairro",
    "np_cidade",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("np_origem").value = "manual";
}

document.getElementById("btnNovoPedido").onclick = abrirModalNovoPedido;
document.getElementById("btnCancelarNovoPedido").onclick =
  fecharModalNovoPedido;

document.getElementById("btnConfirmarNovoPedido").onclick = async function () {
  const botao = this;

  const body = {
    cliente_nome: document.getElementById("np_cliente_nome").value,

    cliente_telefone: document.getElementById("np_cliente_telefone").value,

    itens: document.getElementById("np_itens").value,

    valor_total: Number(document.getElementById("np_valor_total").value) || 0,

    valor_entrega: valorEntregaAtual,

    origem: document.getElementById("np_origem").value,

    endereco: document.getElementById("np_endereco").value,

    bairro: document.getElementById("np_bairro").value,

    cidade: document.getElementById("np_cidade").value,

    latitude: Number(document.getElementById("np_latitude").value) || null,

    longitude: Number(document.getElementById("np_longitude").value) || null,
  };

  botao.disabled = true;
  botao.textContent = "Criando...";

  try {
    const response = await fetch(`${API}/api/empresa/pedidos`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    mostrarToast(
      data.message || "Pedido criado",
      response.ok ? "sucesso" : "erro",
    );

    if (response.ok) {
      fecharModalNovoPedido();
      carregarPedidos();
      carregarEntregas();
      carregarDashboardKpis();
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível criar o pedido", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Criar pedido";
  }
};

// =================================
// DASHBOARD — KPIs
// =================================

async function carregarDashboardKpis() {
  try {
    const response = await fetch(`${API}/api/empresa/pedidos/dashboard-kpis`, {
      headers,
    });
    const kpis = await response.json();

    console.log("KPIs recebidos:", response.status, kpis);

    if (!response.ok) {
      mostrarToast(
        `Erro ${response.status} ao carregar KPIs: ${kpis?.message || "veja o console"}`,
        "erro",
      );
      return;
    }

    document.getElementById("metricFaturamento").textContent = Number(
      kpis.faturamentoHoje || 0,
    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById("metricPedidos").textContent =
      kpis.pedidosHoje || 0;
    document.getElementById("metricTicket").textContent = Number(
      kpis.ticketMedio || 0,
    ).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    document.getElementById("metricEntrega").textContent = kpis.emEntrega || 0;

    const canais = kpis.canais || { ifood: 0, manual: 0, site: 0 };
    const total =
      (canais.ifood || 0) + (canais.manual || 0) + (canais.site || 0) || 1;

    document.getElementById("canalIfoodQtd").textContent =
      `${canais.ifood || 0} pedidos`;
    document.getElementById("canalManualQtd").textContent =
      `${canais.manual || 0} pedidos`;
    document.getElementById("canalSiteQtd").textContent =
      `${canais.site || 0} pedidos`;

    document.getElementById("canalIfood").style.width =
      `${((canais.ifood || 0) / total) * 100}%`;
    document.getElementById("canalManual").style.width =
      `${((canais.manual || 0) / total) * 100}%`;
    document.getElementById("canalSite").style.width =
      `${((canais.site || 0) / total) * 100}%`;

    atualizarPendingPill(kpis.pedidosPendentes || 0);
  } catch (error) {
    console.error("Erro ao carregar KPIs:", error);
    mostrarToast(
      "Não foi possível carregar os indicadores do dashboard",
      "erro",
    );
  }
}

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
    document.getElementById("nomeEmpresaTopo").textContent =
      empresa.nome_fantasia || "Painel da empresa";
    document.getElementById("avatarLoja").textContent = (
      empresa.nome_fantasia || "E"
    )
      .charAt(0)
      .toUpperCase();
  } catch (error) {
    console.log(error);
  }
}

// =================================
// SUPABASE REALTIME
// =================================

async function iniciarRealtime() {
  try {
    const response = await fetch(`${API}/api/empresa/token-realtime`, {
      headers,
    });
    const { token: tokenRealtime } = await response.json();

    if (!tokenRealtime) {
      console.log("Token realtime não recebido");
      return;
    }

    supabaseClient.realtime.setAuth(tokenRealtime);

    supabaseClient
      .channel(`empresa-${empresaAtual.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entregas",
          filter: `empresa_id=eq.${empresaAtual.id}`,
        },
        (payload) => {
          console.log("REALTIME:", payload);

          carregarEntregas();
        },
      )
      .subscribe((status) => {
        const el = document.getElementById("statusRealtime");
        if (status === "SUBSCRIBED") {
          el.textContent = "Conectado em tempo real";
          el.classList.add("conectado");
        } else {
          el.textContent = "Reconectando...";
          el.classList.remove("conectado");
        }
      });
  } catch (error) {
    console.log(error);
  }
}

// =================================
// LOGOUT
// =================================

document.getElementById("btnLogout").addEventListener("click", () => {
  if (!confirm("Deseja realmente sair da conta?")) return;
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
});

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
  ]);
  await iniciarRealtime();
})();

(async () => {
  await carregarBairros();
})();
