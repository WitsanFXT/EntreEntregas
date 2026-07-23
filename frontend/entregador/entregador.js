// =========================================================
// CONFIG / AUTENTICAÇÃO
// =========================================================

// Detecta automaticamente onde o site está rodando
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5500" // Se for no seu PC, aponta para a porta do backend
    : ""; // Se for na Vercel, usa rota relativa (o vercel.json resolve)

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../login/login.html";
}

const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

const headers = {
  Authorization: `Bearer ${token}`,

  "Content-Type": "application/json",
};
// =========================================================
// SUPABASE REALTIME (substitui o Socket.IO)
// =========================================================

// Publishable key — pública, ok deixar no front (RLS protege os dados).
const SUPABASE_URL = "https://gnrhxvbyxnixnrppwnul.supabase.co"; // <-- ajuste
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_FzazGW0YE3mAcFO6NlUk6g_e5_pq_Nw";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

// =========================================================
// ESTADO GLOBAL
// =========================================================

let entregadorId = null;
let ultimaLista = [];
let ultimoPedidoNotificado = null;
let ultimaQuantidadeDisponiveis = 0;
let quantidadeEntregasAtivas = 0;

let entregaAtual = null; // entrega mostrada no modal de nova corrida
let abaAtual = "disponiveis"; // disponiveis | coletas | rota | historico
let filtroHistoricoAtual = "hoje";

let contadorInterval = null;

let estadoPainel = "medio";

const somNovaEntrega = new Audio("../assets/nova-entrega.mp3");
somNovaEntrega.volume = 1;
let alertaSonoro = null;

function iniciarAlertaEntrega() {
  somNovaEntrega.currentTime = 0;
  somNovaEntrega.play().catch(() => {});

  alertaSonoro = setInterval(() => {
    somNovaEntrega.currentTime = 0;
    somNovaEntrega.play().catch(() => {});
  }, 3000);

  setTimeout(() => {
    pararAlertaEntrega();
  }, 30000);
}

function pararAlertaEntrega() {
  if (alertaSonoro) {
    clearInterval(alertaSonoro);
    alertaSonoro = null;
  }
}

const painel = document.getElementById("painelOperacional");
const alca = document.getElementById("alcaPainelOperacional");

if (alca) {
  alca.addEventListener("click", () => {
    painel.classList.toggle("recolhido");

    if (estadoPainel === "medio") {
      painel.dataset.estado = "aberto";
      estadoPainel = "aberto";
    } else {
      painel.dataset.estado = "medio";
      estadoPainel = "medio";
    }
  });
}
// =========================================================
// TOASTS — feedback não bloqueante
// =========================================================

function toast(mensagem, tipo = "sucesso") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.textContent = mensagem;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("mostrar"));

  setTimeout(() => {
    el.classList.remove("mostrar");
    setTimeout(() => el.remove(), 250);
  }, 2500);
}

// =========================================================
// ENDEREÇO — extrai número da residência em destaque
//
// IMPORTANTE: o backend hoje só manda "endereco" (string) e
// "bairro". Como o mapa nem sempre acerta a casa exata, o
// número precisa ficar bem visível. Enquanto o backend não
// expuser um campo "numero" dedicado, extraímos com regex.
// Recomendação: adicionar `numero` como campo próprio na API
// para eliminar essa heurística.
// =========================================================

function obterNumeroEndereco(entrega) {
  if (entrega.numero) return String(entrega.numero);
  if (!entrega.endereco) return null;
  const match = entrega.endereco.match(/\b(\d{1,6})\b/);
  return match ? match[1] : null;
}

function obterRuaSemNumero(entrega) {
  if (!entrega.endereco) return "-";
  return entrega.endereco
    .replace(/\bn[ºo°]?\.?\s*\d{1,6}\b/gi, "")
    .replace(/,?\s*\b\d{1,6}\b/, "")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/, "")
    .trim();
}

// gera o bloco de endereço (rua + número em destaque + bairro)
// usado tanto no card de entrega atual quanto no modal
function montarBlocoEndereco(entrega) {
  const numero = obterNumeroEndereco(entrega);
  const rua = obterRuaSemNumero(entrega);

  return `
    <p class="endereco-rua">📍 ${rua}</p>
    ${numero ? `<p class="endereco-numero">🏠 Nº ${numero}</p>` : ""}
    <p class="endereco-bairro">🏘️ ${entrega.bairro || "-"}</p>
  `;
}

function atualizarEnderecoTopo(entrega) {
  const el = document.getElementById("infoEntregaTopo");

  if (!el) return;

  if (!entrega) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = `
      <p>📍 ${obterRuaSemNumero(entrega)}</p>
      <p>🏠 Nº ${obterNumeroEndereco(entrega) || "-"}</p>
      <p>🏘 ${entrega.bairro || "-"}</p>
  `;
}

// =========================================================
// MAPA
// =========================================================

let mapa;
let marcador;

const gpsIcon = L.divIcon({
  className: "gps-marker",
  html: `
        <div class="gps-marker-pulse"></div>
        <div class="gps-marker-dot"></div>
    `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function iniciarMapa() {
  mapa = L.map("mapa", {
    zoomControl: false,
  }).setView([-16.359, -46.906], 15);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(mapa);

  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(mapa);
}

function atualizarMapa(latitude, longitude) {
  if (!mapa) return;

  const posicao = [Number(latitude), Number(longitude)];

  if (!marcador) {
    marcador = L.marker(posicao, { icon: gpsIcon })
      .addTo(mapa)
      .bindPopup("🚴 Você está aqui", {
        className: "popup-entregador",
        closeButton: false,
      })
      .openPopup();
  } else {
    marcador.setLatLng(posicao);
  }

  mapa.setView(posicao, 16);
}

// =========================================================
// MARCADORES DE COLETA / ENTREGA (durante uma corrida ativa)
// =========================================================

let marcadoresEntregaAtiva = [];

function obterCoordenadasColeta(entrega) {
  const objetos = [
    entrega.empresas,
    entrega.empresa,
    entrega.loja,
    entrega.coleta,
    entrega.origem,
  ];

  for (const obj of objetos) {
    if (obj && obj.latitude && obj.longitude) {
      return { lat: obj.latitude, lng: obj.longitude };
    }
  }

  const pares = [
    ["coleta_latitude", "coleta_longitude"],
    ["latitude_coleta", "longitude_coleta"],
    ["origem_latitude", "origem_longitude"],
  ];

  for (const [chaveLat, chaveLng] of pares) {
    if (entrega[chaveLat] && entrega[chaveLng]) {
      return { lat: entrega[chaveLat], lng: entrega[chaveLng] };
    }
  }

  return null;
}

function obterCoordenadasEntregaFinal(entrega) {
  if (entrega.latitude && entrega.longitude) {
    return { lat: entrega.latitude, lng: entrega.longitude };
  }

  const pares = [
    ["cliente_latitude", "cliente_longitude"],
    ["destino_latitude", "destino_longitude"],
    ["entrega_latitude", "entrega_longitude"],
  ];

  for (const [chaveLat, chaveLng] of pares) {
    if (entrega[chaveLat] && entrega[chaveLng]) {
      return { lat: entrega[chaveLat], lng: entrega[chaveLng] };
    }
  }

  return null;
}

function mostrarMarcadoresEntrega(entrega) {
  if (!mapa || !entrega) return;

  removerMarcadoresEntrega();

  const pontos = [];

  const coleta = obterCoordenadasColeta(entrega);
  if (coleta) pontos.push({ ...coleta, tipo: "coleta", label: "🏪 Coleta" });

  const destino = obterCoordenadasEntregaFinal(entrega);
  if (destino)
    pontos.push({ ...destino, tipo: "entrega", label: "🏠 Entrega" });

  pontos.forEach((ponto) => {
    const icone = L.divIcon({
      className: "",
      html: `<div class="marcador-ponto marcador-${ponto.tipo}"><span>${
        ponto.tipo === "coleta" ? "🏪" : "🏠"
      }</span></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const m = L.marker([ponto.lat, ponto.lng], { icon: icone })
      .addTo(mapa)
      .bindPopup(ponto.label, { closeButton: false });

    marcadoresEntregaAtiva.push(m);
  });

  const pontosMapa = pontos.map((p) => [p.lat, p.lng]);
  if (marcador) pontosMapa.push(marcador.getLatLng());

  if (pontosMapa.length > 1) {
    mapa.fitBounds(pontosMapa, { padding: [60, 60] });
  } else if (pontosMapa.length === 1) {
    mapa.setView(pontosMapa[0], 16);
  }
}

function removerMarcadoresEntrega() {
  marcadoresEntregaAtiva.forEach((m) => mapa && mapa.removeLayer(m));
  marcadoresEntregaAtiva = [];
}

// =========================================================
// NAVEGAÇÃO ENTRE TELAS (Início / Entregas / Ganhos / Perfil)
// =========================================================

let telaEntregasAtiva = false;

function mostrarTela(idTela) {
  document.querySelectorAll(".tela").forEach((tela) => {
    tela.classList.toggle("ativa", tela.id === idTela);
  });

  document
    .querySelectorAll(".menu-inferior button[data-tela]")
    .forEach((botao) => {
      botao.classList.toggle("ativo", botao.dataset.tela === idTela);
    });

  telaEntregasAtiva = idTela === "telaEntregas";

  if (telaEntregasAtiva) {
    carregarListaEntregas();
  }
}

document
  .querySelectorAll(".menu-inferior button[data-tela]")
  .forEach((botao) => {
    botao.onclick = () => mostrarTela(botao.dataset.tela);
  });

document.getElementById("menuSair").onclick = () => fazerLogout();

// =========================================================
// PERFIL
// =========================================================

async function carregarPerfil() {
  try {
    const response = await fetch(`${API}/api/entregador/me`, { headers });
    const data = await response.json();

    entregadorId = data.id;
    iniciarRealtimeEntregador();

    document.getElementById("nomeUsuario").innerHTML =
      data.nome || "Entregador";
    document.getElementById("veiculo").innerHTML = data.tipo_veiculo || "-";
    document.getElementById("placa").innerHTML = data.placa || "-";

    // tela Perfil
    document.getElementById("perfilNome").innerHTML = data.nome || "-";
    document.getElementById("perfilTelefone").innerHTML =
      data.telefone || usuario?.telefone || "-";
    document.getElementById("perfilVeiculo").innerHTML =
      data.tipo_veiculo || "-";
    document.getElementById("perfilPlaca").innerHTML = data.placa || "-";

    await forcarOfflineAoAbrir();

    if (data.latitude && data.longitude) {
      atualizarMapa(data.latitude, data.longitude);
    }
  } catch (error) {
    console.log(error);
  }
}

document.getElementById("btnConfiguracoes").onclick = () => {
  toast("Configurações em breve", "sucesso");
};

// =========================================================
// STATUS ONLINE / OFFLINE — botão único que alterna
// ("Online" -> clica -> fica "Offline" -> clica -> volta a "Online")
// =========================================================

let onlineAtual = false;

async function forcarOfflineAoAbrir() {
  try {
    await fetch(`${API}/api/entregador/offline`, {
      method: "POST",
      headers,
    });
  } catch (error) {
    console.log("Erro ao forçar offline no início:", error);
  } finally {
    atualizarStatus(false);
  }
}

function atualizarStatus(online) {
  onlineAtual = Boolean(online);

  const botao = document.getElementById("btnToggleOnline");
  const texto = document.getElementById("status");

  texto.innerHTML = onlineAtual ? "Online" : "Offline";
  botao.classList.toggle("online", onlineAtual);
  botao.classList.toggle("offline", !onlineAtual);
}

const toggleDetalhes = document.getElementById("toggleDetalhesStatus");

if (toggleDetalhes) {
  toggleDetalhes.onclick = () => {
    const card = document.getElementById("cardStatusOnline");

    const aberto = card.classList.toggle("aberto");

    toggleDetalhes.setAttribute("aria-expanded", aberto);
  };
}

document.getElementById("btnToggleOnline").onclick = async () => {
  const irParaOnline = !onlineAtual;
  const rota = irParaOnline ? "online" : "offline";

  try {
    const response = await fetch(`${API}/api/entregador/${rota}`, {
      method: "POST",
      headers,
    });
    const data = await response.json();

    if (response.ok) {
      atualizarStatus(irParaOnline);
      toast(
        data.message ||
          (irParaOnline ? "Você está online" : "Você está offline"),
        "sucesso",
      );
    } else {
      toast(data.message || `Não foi possível ficar ${rota}`, "erro");
    }
  } catch (error) {
    console.log(error);
    toast("Erro ao conectar com o servidor", "erro");
  }
};

// =========================================================
// ABAS DA TELA ENTREGAS
// =========================================================

document.getElementById("tabDisponiveis").onclick = () =>
  selecionarAba("disponiveis");
document.getElementById("tabColetas").onclick = () => selecionarAba("coletas");
document.getElementById("tabRota").onclick = () => selecionarAba("rota");
document.getElementById("tabHistorico").onclick = () =>
  selecionarAba("historico");

function selecionarAba(aba) {
  abaAtual = aba;
  atualizarTabsVisual();

  const filtros = document.getElementById("filtrosHistorico");
  filtros.classList.toggle("mostrar", aba === "historico");

  if (aba !== "historico") {
    document.getElementById("filtroPersonalizado").classList.remove("mostrar");
  }

  carregarListaEntregas();
}

function atualizarTabsVisual() {
  document
    .querySelectorAll(".tab-entrega")
    .forEach((tab) => tab.classList.remove("ativa"));

  const mapaTabs = {
    disponiveis: "tabDisponiveis",
    coletas: "tabColetas",
    rota: "tabRota",
    historico: "tabHistorico",
  };

  document.getElementById(mapaTabs[abaAtual]).classList.add("ativa");
}

// mapeia aba (UI) -> status (API)
const STATUS_POR_ABA = {
  disponiveis: "pendente",
  coletas: "aceita",
  rota: "retirada",
  historico: "finalizada",
};

// =========================================================
// FILTROS DE HISTÓRICO
// =========================================================

document.querySelectorAll(".filtro-historico").forEach((botao) => {
  botao.onclick = () => {
    const filtro = botao.dataset.filtro;
    filtroHistoricoAtual = filtro;

    document
      .querySelectorAll(".filtro-historico")
      .forEach((b) => b.classList.remove("ativo"));
    botao.classList.add("ativo");

    document
      .getElementById("filtroPersonalizado")
      .classList.toggle("mostrar", filtro === "personalizado");

    if (filtro !== "personalizado") {
      carregarListaEntregas();
    }
  };
});

document.getElementById("btnAplicarFiltroPersonalizado").onclick = () => {
  carregarListaEntregas();
};

function obterDataEntrega(entrega) {
  return (
    entrega.criado_em ||
    entrega.data_criacao ||
    entrega.created_at ||
    entrega.finalizado_em ||
    null
  );
}

function passaNoFiltroHistorico(entrega) {
  if (filtroHistoricoAtual === "personalizado") {
    const inicio = document.getElementById("filtroDataInicio").value;
    const fim = document.getElementById("filtroDataFim").value;
    if (!inicio || !fim) return true; // sem intervalo definido ainda, não filtra

    const dataStr = obterDataEntrega(entrega);
    if (!dataStr) return true;

    const data = new Date(dataStr);
    return data >= new Date(inicio) && data <= new Date(`${fim}T23:59:59`);
  }

  const dataStr = obterDataEntrega(entrega);
  if (!dataStr) return true; // sem dado suficiente pra filtrar, não exclui

  const data = new Date(dataStr);
  const agora = new Date();
  const inicioHoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
  );
  const diffDias = Math.floor(
    (inicioHoje -
      new Date(data.getFullYear(), data.getMonth(), data.getDate())) /
      86400000,
  );

  switch (filtroHistoricoAtual) {
    case "hoje":
      return diffDias === 0;
    case "ontem":
      return diffDias === 1;
    case "7dias":
      return diffDias >= 0 && diffDias <= 7;
    case "30dias":
      return diffDias >= 0 && diffDias <= 30;
    default:
      return true;
  }
}

// =========================================================
// CARREGAR TODAS AS ENTREGAS (disponíveis + minhas)
// usado tanto pela tela Entregas quanto pelos badges
// =========================================================

async function buscarTodasEntregas() {
  const minhasReq = await fetch(`${API}/api/entregas/minhas`, { headers });
  const minhas = await minhasReq.json();

  console.log("MINHAS", minhas);

  return Array.isArray(minhas) ? minhas : minhas.entregas || [];
}

function atualizarBadges(entregas) {
  const contadores = { pendente: 0, aceita: 0, retirada: 0, finalizada: 0 };

  entregas.forEach((e) => {
    if (contadores.hasOwnProperty(e.status)) contadores[e.status]++;
  });

  document.getElementById("badgeDisponiveis").innerHTML = contadores.pendente;
  document.getElementById("badgeColetas").innerHTML = contadores.aceita;
  document.getElementById("badgeRota").innerHTML = contadores.retirada;
  document.getElementById("badgeHistorico").innerHTML = contadores.finalizada;

  return contadores;
}

function detectarNovaEntregaEDisparar(entregas) {
  const idsAntigos = new Set(ultimaLista.map((e) => String(e.id)));
  const novasEntregas = entregas.filter((e) => !idsAntigos.has(String(e.id)));

  if (novasEntregas.length > 0 && ultimaLista.length > 0) {
    const novaPendente = novasEntregas.find((e) => {
      return e.status === "pendente" && !quantidadeEntregasAtivas;
    });
    const entregaParaNotificar = novaPendente || novasEntregas[0];

    if (
      entregaParaNotificar &&
      String(entregaParaNotificar.id) !== String(ultimoPedidoNotificado)
    ) {
      abrirModalEntrega(entregaParaNotificar);
      ultimoPedidoNotificado = String(entregaParaNotificar.id);
    }
  }

  ultimaLista = entregas.map((e) => ({ ...e }));
}

// renderiza a lista da tela Entregas (aba ativa)
async function carregarListaEntregas() {
  try {
    const entregas = await buscarTodasEntregas();
    atualizarBadges(entregas);
    detectarNovaEntregaEDisparar(entregas);

    const statusAlvo = STATUS_POR_ABA[abaAtual];
    let filtradas = entregas.filter((e) => e.status === statusAlvo);

    if (abaAtual === "historico") {
      filtradas = filtradas.filter(passaNoFiltroHistorico);
    }

    const container = document.getElementById("listaEntregas");
    container.innerHTML = "";

    if (!filtradas.length) {
      container.innerHTML = `<div class="sem-entrega">Nenhuma entrega encontrada.</div>`;
      return;
    }

    filtradas.forEach((entrega) => {
      container.appendChild(criarCardEntrega(entrega));
    });
  } catch (error) {
    console.log(error);
  }
}

function criarCardEntrega(entrega) {
  const div = document.createElement("div");
  div.className = "entrega-card";
  div.innerHTML = `
    <div class="entrega-card-header">
      <span class="entrega-card-badge">📦 Corrida</span>
      <span class="entrega-card-valor">R$ ${Number(entrega.valor || 0).toFixed(2)}</span>
    </div>
    <p class="entrega-cliente">${entrega.cliente_nome || "Cliente"}</p>
    ${montarBlocoEndereco(entrega)}
    ${entrega.descricao ? `<p class="entrega-descricao">${entrega.descricao}</p>` : ""}
    ${
      entrega.status === "pendente"
        ? `<button class="btn-aceitar-corrida" data-id="${entrega.id}">Aceitar entrega</button>`
        : `<span class="status-entrega">${entrega.status}</span>`
    }
  `;

  const botaoAceitar = div.querySelector(".btn-aceitar-corrida");
  if (botaoAceitar) {
    botaoAceitar.onclick = () => aceitarEntrega(entrega.id);
  }

  if (entrega.status === "retirada") {
    const bloco = document.createElement("div");

    bloco.innerHTML = `
    <input
      id="codigo-${entrega.id}"
      placeholder="Código do cliente"
    >

    <button
      onclick="confirmarEntrega('${entrega.id}')"
    >
      Confirmar entrega
    </button>
  `;

    div.appendChild(bloco);
  }

  return div;
}

// =========================================================
// ENTREGA ATUAL (tela Início) — a corrida em andamento agora
// =========================================================

async function confirmarRetirada(id) {
  try {
    const codigo = document.getElementById("codigoRetirada").value;

    const response = await fetch(
      `${API}/api/entregador/entrega/${id}/confirmar-retirada`,
      {
        method: "POST",

        headers: {
          ...headers,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          codigo,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      toast(data.message, "erro");
      return;
    }

    toast("Pedido retirado", "sucesso");

    carregarListaEntregas();
    carregarEntregaAtualInicio();
  } catch (error) {
    console.log(error);
  }
}

async function carregarEntregaAtualInicio() {
  try {
    const response = await fetch(`${API}/api/entregas/minhas`, { headers });
    const resposta = await response.json();

    const entregas = Array.isArray(resposta)
      ? resposta
      : resposta.entregas || [];
    const ativas = entregas.filter(
      (e) => e.status === "aceita" || e.status === "em_rota",
    );
    quantidadeEntregasAtivas = ativas.length;

    const container = document.getElementById("cardEntregaAtualInicio");

    if (!ativas.length) {
      container.innerHTML = `<div class="sem-entrega">Nenhuma entrega em andamento.</div>`;
      atualizarEnderecoTopo(null);
      removerMarcadoresEntrega();
      return;
    }

    const principal = ativas[0];

    const emColeta = principal.status === "aceita";

    const nomeDestino = emColeta
      ? principal.empresas?.nome_fantasia || "Estabelecimento"
      : principal.cliente_nome || "Cliente";

    const enderecoDestino = emColeta
      ? {
          endereco: principal.empresas?.endereco || "",
          bairro: principal.empresas?.bairro || "",
        }
      : { endereco: principal.endereco || "", bairro: principal.bairro || "" };

    atualizarEnderecoTopo(enderecoDestino);
    mostrarMarcadoresEntrega(principal);

    console.log("ENTREGA ATUAL:", principal);
    // >>> SUA SUBSTITUIÇÃO COMEÇA AQUI >>>
    container.innerHTML = `
<div class="entrega-atual">

  <div class="entrega-atual-topo">
      <span class="entrega-atual-status">
          ${
            principal.status === "aceita"
              ? "🟡 Aguardando coleta"
              : "🟢 Em rota"
          }
      </span>
  </div>


  <div class="destino-atual">

    <span class="tipo-destino">
      ${principal.status === "aceita" ? "📦 Coleta" : "🏠 Entrega"}
    </span>


    <h3>${nomeDestino}</h3>


    ${montarBlocoEndereco(enderecoDestino)}

  </div>


  <p class="entrega-atual-valor">
      💰 R$ ${Number(principal.valor || 0).toFixed(2)}
  </p>



  <div class="entrega-atual-botoes">


    ${
      principal.status === "aceita"
        ? `
<div class="acoes-principais">


  <div class="confirmacao-retirada">


      <p>
        Código retirada:
        <strong>
          ${principal.codigo_retirada || ""}
        </strong>
      </p>






      <button
        class="btn-retirar"
        data-acao="retirar"
        data-id="${principal.id}">

        📦 Confirmar retirada

      </button>


  </div>


</div>



<div class="acoes-navegacao">

${
  principal.empresas?.latitude && principal.empresas?.longitude
    ? `

<button

class="btn-mapa"

data-acao="navegar"

data-lat="${principal.empresas.latitude}"

data-lng="${principal.empresas.longitude}">

📦 Ir para coleta

</button>

`
    : ""
}


</div>

`
        : `

<div class="acoes-principais">


<div class="confirmacao-entrega">



<input
type="text"
id="codigoEntrega"
placeholder="Código do cliente"
/>


<button
class="btn-finalizar"
data-acao="confirmar"
data-id="${principal.id}">
✅ Confirmar entrega
</button>


</div>



</div>





<div class="acoes-navegacao">


${
  principal.latitude && principal.longitude
    ? `

<button

class="btn-mapa"

data-acao="navegar"

data-lat="${principal.latitude}"

data-lng="${principal.longitude}">


🏠 Ir para entrega


</button>


`
    : ""
}


</div>



`
    }


  </div>


</div>
`;
    // <<< SUA SUBSTITUIÇÃO TERMINA AQUI <<<

    // Mantém a ligação dos eventos de clique nos novos botões gerados
    container.querySelectorAll("[data-acao='retirar']").forEach((btn) => {
      btn.onclick = () => retirarEntrega(btn.dataset.id);
    });
    container.querySelectorAll("[data-acao='confirmar']").forEach((btn) => {
      btn.onclick = () => confirmarEntrega(btn.dataset.id);
    });
    container.querySelectorAll("[data-acao='navegar']").forEach((btn) => {
      btn.onclick = () => {
        console.log("LAT:", btn.dataset.lat);
        console.log("LNG:", btn.dataset.lng);

        abrirSeletorMapa(btn.dataset.lat, btn.dataset.lng);
      };
    });
  } catch (error) {
    console.log(error);
  }
}

// =========================================================
// AÇÕES DE ENTREGA (aceitar / retirar / finalizar)
// =========================================================

/*async function confirmarEntrega(id) {
  try {
    const codigo = document.getElementById("codigoEntrega").value;

    const response = await fetch(
      `${API}/api/entregador/${id}/confirmar-entrega`,
      {
        method: "POST",

        headers: {
          ...headers,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          codigo: codigo,
        }),
      },
    );

    const data = await response.json();

    toast(data.message, response.ok ? "sucesso" : "erro");

    carregarEntregaAtualInicio();
    carregarMinhasEntregas();
    carregarFinanceiro();
  } catch (error) {
    console.log(error);
  }
} */

async function aceitarEntrega(id) {
  try {
    const response = await fetch(`/api/entregas/${id}/aceitar`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      toast(data.message || "Erro ao aceitar entrega", "erro");
      return;
    }

    toast("Entrega aceita com sucesso", "sucesso");

    carregarListaEntregas();
    carregarEntregaAtualInicio();
  } catch (error) {
    console.log(error);
    toast("Erro ao aceitar entrega", "erro");
  }
}

async function carregarMinhasEntregas() {
  try {
    const response = await fetch(`${API}/api/entregador/minhas-entregas`, {
      headers,
    });

    const data = await response.json();

    console.log("Minhas entregas:", data);

    renderizarEntregas(data);
  } catch (error) {
    console.log("Erro ao carregar entregas:", error);
  }
}

async function retirarEntrega(id) {
  try {
    const response = await fetch(`${API}/api/entregas/${id}/retirar`, {
      method: "PUT",
      headers,
    });
    const data = await response.json();

    if (data.codigo_entrega) {
      alert(
        `Código da entrega: ${data.codigo_entrega}\n\nMostre este código ao cliente.`,
      );
    }

    toast(
      data.message || (response.ok ? "Pedido retirado" : "Erro ao retirar"),
      response.ok ? "sucesso" : "erro",
    );

    carregarListaEntregas();
    carregarEntregaAtualInicio();
  } catch (error) {
    console.log(error);
  }
}

async function confirmarEntrega(id) {
  const input = document.getElementById("codigoEntrega");

  if (!input) {
    console.log("Campo codigoEntrega não encontrado");
    return;
  }

  const codigo = input.value;

  const response = await fetch(
    `${API}/api/entregador/entrega/${id}/confirmar-entrega`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo,
      }),
    },
  );

  const data = await response.json();

  toast(data.message, response.ok ? "sucesso" : "erro");

  await carregarEntregaAtualInicio();
  await carregarMinhasEntregas();
  await carregarFinanceiro();
}

// =========================================================
// MODAL DE NOVA ENTREGA
// Fica sempre no topo de tudo (ver z-index no CSS).
// =========================================================

function abrirModalEntrega(entrega) {
  entregaAtual = entrega;

  document.getElementById("modalCliente").innerHTML =
    entrega.cliente_nome || "Cliente";
  document.getElementById("modalEnderecoBloco").innerHTML =
    montarBlocoEndereco(entrega);
  document.getElementById("modalValor").innerHTML =
    `R$ ${Number(entrega.valor || 0).toFixed(2)}`;

  const temDescricao = Boolean(entrega.descricao);
  document.getElementById("modalDescricao").innerHTML = entrega.descricao || "";
  document.getElementById("modalDescricao").style.display = temDescricao
    ? "block"
    : "none";

  const temDistancia =
    entrega.distancia !== undefined && entrega.distancia !== null;
  const temTempo =
    entrega.tempo_estimado !== undefined && entrega.tempo_estimado !== null;

  document.getElementById("modalDistancia").innerHTML = temDistancia
    ? `${entrega.distancia} km`
    : "-";
  document.getElementById("modalTempo").innerHTML = temTempo
    ? `${entrega.tempo_estimado} min`
    : "-";
  document.getElementById("modalMetricas").style.display =
    temDistancia || temTempo ? "flex" : "none";

  iniciarAlertaEntrega();

  document.getElementById("overlayModal").classList.add("ativo");
  document.getElementById("modalEntrega").classList.add("ativo");
  document.getElementById("modalEntrega").classList.remove("minimizado");

  mostrarMarcadoresEntrega(entrega);

  let tempo = 30;
  document.getElementById("contadorEntrega").innerHTML = tempo;
  document.getElementById("contadorWrap").classList.remove("urgente");

  clearInterval(contadorInterval);
  contadorInterval = setInterval(() => {
    tempo--;
    document.getElementById("contadorEntrega").innerHTML = tempo;

    if (tempo <= 10) {
      document.getElementById("contadorWrap").classList.add("urgente");
    }

    if (tempo <= 0) {
      // a decisão de expirar é sempre do servidor (verificarTimeouts);
      // aqui só fechamos o modal pra não travar a tela do entregador
      fecharModalEntrega();
    }
  }, 1000);
}

function fecharModalEntrega() {
  pararAlertaEntrega();
  clearInterval(contadorInterval);

  document.getElementById("overlayModal").classList.remove("ativo");
  document.getElementById("modalEntrega").classList.remove("ativo");
  document.getElementById("modalEntrega").classList.remove("minimizado");
  document.getElementById("contadorWrap").classList.remove("urgente");

  removerMarcadoresEntrega();
}

document.getElementById("btnAceitarModal").onclick = async () => {
  if (!entregaAtual) return;
  await aceitarEntrega(entregaAtual.id);
  fecharModalEntrega();
};

async function recusarEntregaAtual(id) {
  try {
    await fetch(`${API}/api/entregas/${id}/recusar`, {
      method: "PUT",
      headers,
    });
  } catch (error) {
    console.log("Erro ao recusar entrega:", error);
  }
}

document.getElementById("btnRecusarModal").onclick = async () => {
  if (!entregaAtual) return;
  await recusarEntregaAtual(entregaAtual.id);
  fecharModalEntrega();
  carregarListaEntregas();
};

// minimizar / expandir — some com o escurecimento ao minimizar,
// já que o objetivo é liberar a visão do mapa, mas mantém o modal
// como a camada mais alta (barra minimizada continua clicável)
document.getElementById("minimizarModal").onclick = () => {
  document.getElementById("modalEntrega").classList.add("minimizado");
  document.getElementById("overlayModal").classList.remove("ativo");
};

document.getElementById("expandirModal").onclick = () => {
  document.getElementById("modalEntrega").classList.remove("minimizado");
  document.getElementById("overlayModal").classList.add("ativo");
};

function sincronizarContadorMinimizado() {
  const min = document.getElementById("contadorEntregaMin");
  if (min) {
    min.innerHTML = document.getElementById("contadorEntrega").innerHTML;
  }
}

setInterval(sincronizarContadorMinimizado, 1000);

// =========================================================
// NAVEGAÇÃO (Google Maps / Waze / Apple Maps)
// =========================================================

function abrirGoogleMaps(lat, lng) {
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    "_blank",
  );
}

function abrirWaze(lat, lng) {
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank");
}

function abrirAppleMaps(lat, lng) {
  window.open(`https://maps.apple.com/?daddr=${lat},${lng}`, "_blank");
}

function abrirSeletorMapa(lat, lng) {
  const modal = document.createElement("div");
  modal.className = "modal-seletor-mapa";
  modal.innerHTML = `
    <div class="modal-seletor-mapa-conteudo">
      <h3>Escolha o aplicativo de navegação</h3>
      <div class="opcoes-mapa">
        <button data-app="google">🗺 Google Maps</button>
        <button data-app="waze">📍 Waze</button>
        <button data-app="apple">🍎 Apple Maps</button>
      </div>
      <button class="btn-fechar-modal">Cancelar</button>
    </div>
  `;

  modal.querySelector("[data-app='google']").onclick = () =>
    navegarCom("google", lat, lng);
  modal.querySelector("[data-app='waze']").onclick = () =>
    navegarCom("waze", lat, lng);
  modal.querySelector("[data-app='apple']").onclick = () =>
    navegarCom("apple", lat, lng);
  modal.querySelector(".btn-fechar-modal").onclick = () => modal.remove();

  document.body.appendChild(modal);
}

function navegarCom(app, lat, lng) {
  if (app === "google") abrirGoogleMaps(lat, lng);
  if (app === "waze") abrirWaze(lat, lng);
  if (app === "apple") abrirAppleMaps(lat, lng);

  document.querySelector(".modal-seletor-mapa")?.remove();
}

// =========================================================
// GPS
// =========================================================

let watchId;

function iniciarGPS() {
  if (!navigator.geolocation) {
    toast("GPS não disponível neste dispositivo", "erro");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      const precisao = pos.coords.accuracy;

      document.getElementById("localizacao").innerHTML =
        `GPS ativo · precisão de ${Math.round(precisao)}m`;

      if (precisao <= 100) {
        await fetch(`${API}/api/entregador/localizacao`, {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ latitude, longitude }),
        });
      }

      atualizarMapa(latitude, longitude);
    },
    (error) => {
      console.log("Erro GPS", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  );
}

// =========================================================
// LOGOUT
// =========================================================

function fazerLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "../login/login.html";
}

// =========================================================
// FINANCEIRO / GANHOS
// =========================================================

let ganhoHojeReal = 0;
let ganhosOcultos = localStorage.getItem("ganhosOcultos") === "1";

function aplicarVisibilidadeGanhos() {
  const valor = document.getElementById("resumoDiaGanhos");
  const botao = document.getElementById("btnOcultarGanhos");

  if (valor) {
    valor.innerHTML = ganhosOcultos
      ? "R$ •••"
      : `R$ ${ganhoHojeReal.toFixed(2)}`;
  }

  if (botao) {
    botao.classList.toggle("oculto", ganhosOcultos);
    botao.setAttribute("aria-pressed", ganhosOcultos);
  }
}

document.getElementById("btnOcultarGanhos").onclick = () => {
  ganhosOcultos = !ganhosOcultos;
  localStorage.setItem("ganhosOcultos", ganhosOcultos ? "1" : "0");
  aplicarVisibilidadeGanhos();
};

async function carregarFinanceiro() {
  try {
    const response = await fetch(`${API}/api/financeiro/entregador/resumo`, {
      headers,
    });
    const data = await response.json();

    const hoje = Number(data.hoje || 0);
    const semana = Number(data.semana || 0);
    const mes = Number(data.mes || 0);
    const saldo = Number(data.saldo || 0);

    ganhoHojeReal = hoje;
    aplicarVisibilidadeGanhos();

    // tela Ganhos
    document.getElementById("ganhosHoje").innerHTML = `R$ ${hoje.toFixed(2)}`;
    document.getElementById("ganhosSemana").innerHTML =
      `R$ ${semana.toFixed(2)}`;
    document.getElementById("ganhosMes").innerHTML = `R$ ${mes.toFixed(2)}`;
    document.getElementById("saldoCarteira").innerHTML =
      `R$ ${saldo.toFixed(2)}`;

    // Campos extras: usam o valor da API se existir, senão calculam
    // a partir do cache local de entregas (melhor esforço — o ideal
    // é o backend expor esses três campos prontos no /resumo).
    const entregasFinalizadasHoje = ultimaLista.filter(
      (e) =>
        ["entregue", "finalizada"].includes(e.status) &&
        passaNoFiltroDataHoje(e),
    );

    const entregasConcluidas =
      data.entregasConcluidas ?? entregasFinalizadasHoje.length;

    const ticketMedio =
      data.ticketMedio ??
      (entregasConcluidas > 0 ? hoje / entregasConcluidas : 0);

    document.getElementById("entregasConcluidas").innerHTML =
      entregasConcluidas;
    document.getElementById("ticketMedio").innerHTML =
      `R$ ${Number(ticketMedio).toFixed(2)}`;

    document.getElementById("taxaAceitacao").innerHTML =
      data.taxaAceitacao !== undefined ? `${data.taxaAceitacao}%` : "—";

    // quantidade de entregas hoje (card resumo do dia)
    document.getElementById("resumoDiaQtd").innerHTML =
      entregasFinalizadasHoje.length;
  } catch (error) {
    console.log(error);
  }
}

function passaNoFiltroDataHoje(entrega) {
  const dataStr = obterDataEntrega(entrega);
  if (!dataStr) return false;
  const data = new Date(dataStr);
  const agora = new Date();
  return (
    data.getFullYear() === agora.getFullYear() &&
    data.getMonth() === agora.getMonth() &&
    data.getDate() === agora.getDate()
  );
}

// =========================================================
// SUPABASE REALTIME — substitui o Socket.IO
// A tabela `entregas` tem RLS: esse entregador só recebe as
// linhas onde entregador_id é o dele mesmo (ver token-realtime).
// =========================================================

let realtimeChannel = null;
let realtimeIniciado = false;

async function obterTokenRealtime() {
  const response = await fetch(`${API}/api/entregador/token-realtime`, {
    headers,
  });
  const data = await response.json();
  return data.token || null;
}

async function iniciarRealtimeEntregador() {
  if (!entregadorId || realtimeIniciado) return;
  realtimeIniciado = true;

  try {
    const tokenRealtime = await obterTokenRealtime();

    if (!tokenRealtime) {
      console.warn("Sem token de realtime — ficando só no polling de 5s.");
      return;
    }

    supabaseClient.realtime.setAuth(tokenRealtime);

    realtimeChannel = supabaseClient
      .channel(`entregador-${entregadorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "entregas",
          filter: `entregador_id=eq.${entregadorId}`,
        },
        (payload) => {
          const entrega = payload.new;
          if (!entrega) return;

          console.log("REALTIME RECEBEU:", entrega.id, entrega.status);

          if (entrega.status === "pendente") {
            // nova corrida atribuída a esse entregador (ou redistribuída)
            if (entrega.id) {
              const existe = ultimaLista.some(
                (e) => String(e.id) === String(entrega.id),
              );
              if (!existe) ultimaLista.push({ ...entrega });
              ultimoPedidoNotificado = String(entrega.id);
            }

            mostrarTela("telaInicio");
            abrirModalEntrega(entrega);
            return;
          }

          if (entrega.status === "aceita" || entrega.status === "retirada") {
            carregarListaEntregas();
            carregarEntregaAtualInicio();
            return;
          }

          if (entrega.status === "finalizada") {
            carregarListaEntregas();
            carregarEntregaAtualInicio();
            carregarFinanceiro();
            return;
          }

          if (entrega.status === "cancelada") {
            toast("Uma entrega foi cancelada pela empresa", "erro");
            fecharModalEntrega();
            carregarListaEntregas();
            carregarEntregaAtualInicio();
          }
        },
      )
      .subscribe((status) => {
        console.log("Realtime entregador:", status);
      });
  } catch (error) {
    console.log("Erro ao iniciar realtime:", error);
  }
}

async function verificarNovasEntregasGlobal() {
  try {
    const entregas = await buscarTodasEntregas();

    detectarNovaEntregaEDisparar(entregas);
  } catch (error) {
    console.log(error);
  }
}
// =========================================================
// INICIAR SISTEMA
// =========================================================
iniciarMapa();
mostrarTela("telaInicio");

carregarPerfil();
carregarListaEntregas();
verificarNovasEntregasGlobal();

setInterval(() => {
  verificarNovasEntregasGlobal();
}, 5000);

carregarEntregaAtualInicio();
carregarFinanceiro();

iniciarGPS();
// iniciarRealtimeEntregador() já é chamado dentro de carregarPerfil()
// assim que o entregadorId é conhecido — não precisa chamar de novo aqui.
