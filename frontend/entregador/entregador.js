// Detecta automaticamente onde o site está rodando
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5500" // Se for no seu PC, aponta para a porta do backend
    : ""; // Se for na Vercel, usa rota relativa (o vercel.json resolve)

const token = localStorage.getItem("token");

let ultimaLista = [];

let ultimoPedidoNotificado = null;

let rotaAtual = null;

let ultimaQuantidade = 0;

let entregaAtual = null;

let abaAtual = "disponiveis";

let contadorInterval = null;

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

if (!token) {
  window.location.href = "../login/login.html";
}

const usuario = JSON.parse(localStorage.getItem("usuario"));

const headers = {
  Authorization: `Bearer ${token}`,
};

// =======================
// TOASTS — feedback não bloqueante
// =======================

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

// =======================
// MAPA
// =======================

let mapa;

let marcador;

let linhaRota = null;

// ícone customizado: pontinho pulsante estilo "localização ao vivo"
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

  // zoom reposicionado, estilo app de entrega (canto inferior direito)
  L.control
    .zoom({
      position: "bottomright",
    })
    .addTo(mapa);
}

function atualizarMapa(latitude, longitude) {
  if (!mapa) {
    return;
  }

  const posicao = [Number(latitude), Number(longitude)];

  if (!marcador) {
    marcador = L.marker(posicao, {
      icon: gpsIcon,
    })

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

function desenharRota(origem, destino) {
  if (rotaAtual) {
    mapa.removeLayer(rotaAtual);
  }

  rotaAtual = L.polyline([origem, destino]).addTo(mapa);
}
if (rotaAtual) {
  mapa.removeLayer(rotaAtual);

  rotaAtual = null;
}

// =======================
// PERFIL
// =======================

async function carregarPerfil() {
  try {
    const response = await fetch(
      `${API}/api/entregador/me`,

      {
        headers,
      },
    );

    const data = await response.json();

    document.getElementById("nomeUsuario").innerHTML =
      data.nome || "Entregador";

    document.getElementById("veiculo").innerHTML = data.tipo_veiculo || "-";

    document.getElementById("placa").innerHTML = data.placa || "-";

    atualizarStatus(data.online);

    if (data.latitude && data.longitude) {
      atualizarMapa(
        data.latitude,

        data.longitude,
      );
    }
  } catch (error) {
    console.log(error);
  }
}

// =======================
// STATUS
// =======================

function atualizarStatus(online) {
  document.getElementById("status").innerHTML = online
    ? "🟢 Online"
    : "🔴 Offline";
}

// =======================
// PAINEL SUPERIOR — expandir detalhes (veículo/placa)
// =======================

document.getElementById("toggleDetalhesStatus").onclick = () => {
  const painel = document.getElementById("painelSuperior");
  const aberto = painel.classList.toggle("aberto");
  document
    .getElementById("toggleDetalhesStatus")
    .setAttribute("aria-expanded", aberto);
};

// =======================
// CARD DE GANHOS — expandir/recolher
// =======================

document.getElementById("cardResumo").onclick = () => {
  document.getElementById("cardResumo").classList.toggle("aberto");
};

// =======================
// PAINEL DE ENTREGAS — bottom sheet (clicável e arrastável)
// =======================

const painelEntregas = document.getElementById("painelEntregas");
const alcaEntregas = document.getElementById("alcaEntregas");
const cardResumo = document.getElementById("cardResumo");

function sincronizarCardResumo() {
  cardResumo.classList.toggle(
    "oculto",
    painelEntregas.classList.contains("aberto"),
  );
}

alcaEntregas.onclick = () => {
  painelEntregas.classList.toggle("aberto");
  sincronizarCardResumo();
};

(function habilitarArrasto() {
  let arrastando = false;
  let inicioY = 0;

  const iniciar = (y) => {
    arrastando = true;
    inicioY = y;
  };

  const mover = (y) => {
    if (!arrastando) return;
    const delta = inicioY - y;
    if (delta > 40) {
      painelEntregas.classList.add("aberto");
      sincronizarCardResumo();
      arrastando = false;
    } else if (delta < -40) {
      painelEntregas.classList.remove("aberto");
      sincronizarCardResumo();
      arrastando = false;
    }
  };

  const soltar = () => {
    arrastando = false;
  };

  alcaEntregas.addEventListener("pointerdown", (e) => iniciar(e.clientY));
  alcaEntregas.addEventListener("pointermove", (e) => mover(e.clientY));
  window.addEventListener("pointerup", soltar);

  alcaEntregas.addEventListener(
    "touchstart",
    (e) => iniciar(e.touches[0].clientY),
    { passive: true },
  );
  alcaEntregas.addEventListener(
    "touchmove",
    (e) => mover(e.touches[0].clientY),
    { passive: true },
  );
  alcaEntregas.addEventListener("touchend", soltar);
})();

// =======================
// MENU INFERIOR
// =======================

function marcarMenuAtivo(botao) {
  document
    .querySelectorAll(".menu-inferior button")
    .forEach((b) => b.classList.remove("ativo"));
  botao.classList.add("ativo");
}

document.getElementById("menuInicio").onclick = (e) => {
  marcarMenuAtivo(e.currentTarget);
  document.getElementById("painelSuperior").classList.remove("aberto");
  document.getElementById("cardResumo").classList.remove("aberto");
  painelEntregas.classList.remove("aberto");
  sincronizarCardResumo();
};

document.getElementById("menuEntregas").onclick = (e) => {
  marcarMenuAtivo(e.currentTarget);
  painelEntregas.classList.add("aberto");
  sincronizarCardResumo();
};

document.getElementById("menuGanhos").onclick = (e) => {
  marcarMenuAtivo(e.currentTarget);
  painelEntregas.classList.remove("aberto");
  sincronizarCardResumo();
  document.getElementById("cardResumo").classList.add("aberto");
};

document.getElementById("menuPerfil").onclick = (e) => {
  marcarMenuAtivo(e.currentTarget);
  document.getElementById("painelSuperior").classList.add("aberto");
};

document.getElementById("menuSair").onclick = (e) => {
  marcarMenuAtivo(e.currentTarget);
  fazerLogout();
};

// =======================
// ONLINE
// =======================

document.getElementById("btnOnline").onclick = async () => {
  try {
    const response = await fetch(
      `${API}/api/entregador/online`,

      {
        method: "POST",

        headers,
      },
    );

    const data = await response.json();

    if (response.ok) {
      atualizarStatus(true);

      toast(data.message || "Você está online", "sucesso");
    } else {
      toast(data.message || "Não foi possível ficar online", "erro");
    }
  } catch (error) {
    console.log(error);

    toast("Erro ao conectar com o servidor", "erro");
  }
};

// =======================
// OFFLINE
// =======================

document.getElementById("btnOffline").onclick = async () => {
  try {
    const response = await fetch(
      `${API}/api/entregador/offline`,

      {
        method: "POST",

        headers,
      },
    );

    const data = await response.json();

    if (response.ok) {
      atualizarStatus(false);

      toast(data.message || "Você está offline", "sucesso");
    } else {
      toast(data.message || "Não foi possível ficar offline", "erro");
    }
  } catch (error) {
    console.log(error);

    toast("Erro ao conectar com o servidor", "erro");
  }
};


// =======================
// Disponiveis
// =======================
document.getElementById("tabDisponiveis").onclick = () => {
    abaAtual = "disponiveis";
    atualizarTabs();
    carregarEntregas();
    carregarEntregaAtual();
};

document.getElementById("tabColetas").onclick = () => {
    abaAtual = "aceita";
    atualizarTabs();
    carregarEntregas();
    carregarEntregaAtual();
};

document.getElementById("tabRota").onclick = () => {
    abaAtual = "retirada";
    atualizarTabs();
    carregarEntregas();
    carregarEntregaAtual();
};

document.getElementById("tabHistorico").onclick = () => {
    abaAtual = "finalizada";
    atualizarTabs();
    carregarEntregas();
    carregarEntregaAtual();
};

function atualizarTabs() {

    document
    .querySelectorAll(".tab-entrega")
    .forEach(tab => tab.classList.remove("ativa"));

    if (abaAtual === "disponiveis") {
        document
        .getElementById("tabDisponiveis")
        .classList.add("ativa");
    }

    if (abaAtual === "aceita") {
        document
        .getElementById("tabColetas")
        .classList.add("ativa");
    }

    if (abaAtual === "retirada") {
        document
        .getElementById("tabRota")
        .classList.add("ativa");
    }

    if (abaAtual === "finalizada") {
        document
        .getElementById("tabHistorico")
        .classList.add("ativa");
    }

}

// =======================
// ENTREGAS DISPONÍVEIS
// =======================

async function carregarEntregas() {
  try {
    const disponiveisReq = await fetch(`${API}/api/entregas/disponiveis`, { headers });
    const minhasReq = await fetch(`${API}/api/entregas/minhas`, { headers });

    const disponiveis = await disponiveisReq.json();
    const minhas = await minhasReq.json();

    // combina listas (disponíveis + minhas) e remove duplicatas
    const mapa = new Map();
    (Array.isArray(disponiveis) ? disponiveis : disponiveis.entregas || []).forEach(e => mapa.set(e.id, e));
    (Array.isArray(minhas) ? minhas : minhas.entregas || []).forEach(e => mapa.set(e.id, e));
    const entregas = Array.from(mapa.values());

    // atualiza badges uma única vez com filtros eficientes
    const contadores = {
      pendente: 0,
      aceita: 0,
      retirada: 0,
      finalizada: 0
    };

    entregas.forEach(e => {
      if (contadores.hasOwnProperty(e.status)) {
        contadores[e.status]++;
      }
    });

    document.getElementById("badgeDisponiveis").innerHTML = contadores.pendente;
    document.getElementById("badgeColetas").innerHTML = contadores.aceita;
    document.getElementById("badgeRota").innerHTML = contadores.retirada;
    document.getElementById("badgeHistorico").innerHTML = contadores.finalizada;

    // mapa de status para filtragem
    const statusMap = {
      disponiveis: "pendente",
      aceita: "aceita",
      retirada: "retirada",
      finalizada: "finalizada"
    };

    console.log("ABA ATUAL:", abaAtual);
    console.log(
      "STATUS RECEBIDOS:",
      entregas.map(e => ({
        id: e.id,
        status: e.status,
      })),
    );

    const statusAtual = statusMap[abaAtual] || "pendente";
    const entregasFiltradas = entregas.filter(e => e.status === statusAtual);

    console.log("STATUS ATUAL:", statusAtual);
    console.log("ENTREGAS FILTRADAS:", entregasFiltradas);
    console.log("CONTAINER:", document.getElementById("entregas"));

    // detecta novas entregas comparando IDs e evita repetir notificações
    const idsAntigos = new Set(ultimaLista.map((e) => String(e.id)));
    const novasEntregas = entregas.filter(
      (e) => !idsAntigos.has(String(e.id)),
    );

    if (novasEntregas.length > 0 && ultimaLista.length > 0) {
      const novaPendentes = novasEntregas.find((e) => e.status === "pendente");
      const entregaParaNotificar = novaPendentes || novasEntregas[0];

      if (
        entregaParaNotificar &&
        String(entregaParaNotificar.id) !== String(ultimoPedidoNotificado)
      ) {
        abrirModalEntrega(entregaParaNotificar);
        ultimoPedidoNotificado = String(entregaParaNotificar.id);
      }
    }

    // atualiza cache
    ultimaLista = entregas.map(e => ({ ...e }));
    ultimaQuantidade = entregas.length;
    atualizarTituloPainelEntregas(entregas.length);

    // renderiza entregas filtradas
    const container = document.getElementById("entregas");
    container.innerHTML = "";

    if (!entregasFiltradas.length) {
      container.innerHTML = `<p>Nenhuma entrega encontrada.</p>`;
      return;
    }

    entregasFiltradas.forEach(entrega => {
      const div = document.createElement("div");
      div.className = "entrega-card";
      div.innerHTML = `
        <div class="entrega-card-header">
          <span class="entrega-card-badge">📦 Nova corrida</span>
          <span class="entrega-card-valor">R$ ${Number(entrega.valor).toFixed(2)}</span>
        </div>
        <h3 class="entrega-cliente-label">Cliente</h3>
        <p class="entrega-cliente">${entrega.cliente_nome}</p>
        <p class="entrega-endereco">📍 ${entrega.endereco}</p>
        <p class="entrega-bairro">🏘️ ${entrega.bairro}</p>
        ${entrega.descricao ? `<p class="entrega-descricao">${entrega.descricao}</p>` : ""}
        ${
          entrega.status === "pendente"
            ? `<button class="btn-aceitar-corrida" onclick="aceitarEntrega('${entrega.id}')">Aceitar entrega</button>`
            : `<span class="status-entrega">${entrega.status}</span>`
        }
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.log(error);
  }
}

// =======================
// ACEITAR ENTREGA
// =======================

async function aceitarEntrega(id) {
  try {
    const response = await fetch(
      `${API}/api/entregas/${id}/aceitar`,

      {
        method: "PUT",

        headers,
      },
    );

    const data = await response.json();

    toast(data.message || "Entrega aceita", "sucesso");

    carregarEntregas();
  } catch (error) {
    console.log(error);
  }
}

let quantidadeEntregasAtivas = 0;

function atualizarTituloPainelEntregas(quantidadeDisponiveis) {
  const titulo = document.getElementById("tituloPainelEntregas");

  if (quantidadeEntregasAtivas > 0) {
    titulo.innerHTML = `🚚 Minhas Entregas (${quantidadeEntregasAtivas})`;
  } else if (quantidadeDisponiveis > 0) {
    titulo.innerHTML = `📦 Chamados disponíveis (${quantidadeDisponiveis})`;
  } else {
    titulo.innerHTML = "📦 Chamados disponíveis";
  }
}

async function carregarEntregaAtual() {
  try {
    const response = await fetch(`${API}/api/entregas/minhas`, { headers });
    const resposta = await response.json();

    console.log(resposta);

    const entregas = Array.isArray(resposta) ? resposta : resposta.entregas || [];

    console.log("ABA ATUAL:", abaAtual);
    console.log(
      "STATUS RECEBIDOS:",
      entregas.map((e) => ({
        id: e.id,
        status: e.status,
      })),
    );

    console.table(
      entregas.map((e) => ({
        id: e.id,
        status: e.status,
      })),
    );

    const container = document.getElementById("entregaAtual");
    console.log("CONTAINER ENTREGA_ATUAL:", container);

    let lista = [];

    if (abaAtual === "disponiveis") {
      lista = entregas.filter((e) => e.status === "pendente");
    } else if (abaAtual === "aceita") {
      lista = entregas.filter((e) => e.status === "aceita");
    } else if (abaAtual === "retirada") {
      lista = entregas.filter((e) => e.status === "retirada");
    } else if (abaAtual === "finalizada") {
      lista = entregas.filter((e) => e.status === "finalizada");
    }

    console.log("ABA:", abaAtual);
    console.log("ENTREGAS:", lista);

    quantidadeEntregasAtivas = lista.length;
    atualizarTituloPainelEntregas(ultimaLista.length);

    if (!lista.length) {
      container.innerHTML = `
        <div class="sem-entrega">
            Nenhuma entrega em andamento.
        </div>
        `;
      return;
    }

    container.innerHTML = lista
      .map((entrega) => {
        const emRota = entrega.status === "retirada";
        const latEmpresa = entrega.empresas?.latitude || null;
        const lngEmpresa = entrega.empresas?.longitude || null;

        return `
        <div class="entrega-atual">
            <div class="entrega-atual-topo">
                <span class="entrega-atual-status">
                    ${emRota ? "🟢 Em rota" : "🟡 Aguardando coleta"}
                </span>
            </div>
            <h3>
                ${entrega.cliente_nome}
            </h3>
            <p>
                📍 ${entrega.endereco}
            </p>
            <p>
                🏘️ ${entrega.bairro}
            </p>
            <p>
                💰 R$ ${Number(entrega.valor).toFixed(2)}
            </p>
            <div class="entrega-atual-botoes">
${
  entrega.status === "aceita"
    ? `
<div class="acoes-principais">
<button
class="btn-retirar"
onclick="retirarEntrega('${entrega.id}')"
>
📦 Retirei pedido
</button>
</div>


<div class="acoes-navegacao">
${
latEmpresa && lngEmpresa
  ? `
<button
class="btn-mapa"
onclick="abrirSeletorMapa('${latEmpresa}','${lngEmpresa}','coleta')"
>
🧭 Navegar
</button>
`
  : ""
}

</div>
`
    : `
<div class="acoes-principais">
<button
class="btn-finalizar"
onclick="finalizarEntrega('${entrega.id}')"
>
✅ Finalizar
</button>
</div>

<div class="acoes-navegacao">
${
latEmpresa && lngEmpresa
  ? `
<button
class="btn-mapa"
onclick="abrirSeletorMapa('${latEmpresa}','${lngEmpresa}','coleta')"
>
🧭 Navegar
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
      })
      .join("");
  } catch (error) {
    console.log(error);
  }
}

function abrirModalEntrega(entrega) {
  entregaAtual = entrega;

  document.getElementById("modalCliente").innerHTML =
    entrega.cliente_nome || "Cliente";

  document.getElementById("modalEndereco").innerHTML = entrega.endereco || "-";

  document.getElementById("modalBairro").innerHTML = entrega.bairro
    ? `🏘️ ${entrega.bairro}`
    : "";

  document.getElementById("modalValor").innerHTML =
    `R$ ${Number(entrega.valor).toFixed(2)}`;

  const temDescricao = Boolean(entrega.descricao);

  document.getElementById("modalDescricao").innerHTML = entrega.descricao || "";

  document.getElementById("modalDescricao").style.display = temDescricao
    ? "block"
    : "none";

  // distância / tempo são opcionais — o bloco some sozinho se a API não mandar
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

  document.getElementById("modalEntrega").classList.add("ativo");

  document.getElementById("modalEntrega").classList.remove("minimizado");

  // mostra no mapa: onde estou, onde é a coleta e onde é a entrega final
  mostrarMarcadoresEntrega(entrega);

  let tempo = 30;

  document.getElementById("contadorEntrega").innerHTML = tempo;

  clearInterval(contadorInterval);

  contadorInterval = setInterval(() => {
    tempo--;

    document.getElementById("contadorEntrega").innerHTML = tempo;

    if (tempo <= 10) {
      document.getElementById("contadorWrap").classList.add("urgente");
    }

    if (tempo <= 0) {
      fecharModalEntrega();
    }
  }, 1000);
}

function fecharModalEntrega() {
  pararAlertaEntrega();

  clearInterval(contadorInterval);

  document.getElementById("modalEntrega").classList.remove("ativo");

  document.getElementById("modalEntrega").classList.remove("minimizado");

  document.getElementById("contadorWrap").classList.remove("urgente");

  removerMarcadoresEntrega();
}

document.getElementById("btnAceitarModal").onclick = async () => {
  if (!entregaAtual) {
    return;
  }

  await aceitarEntrega(entregaAtual.id);

  fecharModalEntrega();
};

document.getElementById("btnRecusarModal").onclick = () => {
  fecharModalEntrega();
};

// =======================
// MODAL — minimizar / expandir
// =======================

document.getElementById("minimizarModal").onclick = () => {
  document.getElementById("modalEntrega").classList.add("minimizado");
};

document.getElementById("expandirModal").onclick = () => {
  document.getElementById("modalEntrega").classList.remove("minimizado");
};

// mantém o contador da barra minimizada sincronizado com o contador do modal
function sincronizarContadorMinimizado() {
  const min = document.getElementById("contadorEntregaMin");

  if (min) {
    min.innerHTML = document.getElementById("contadorEntrega").innerHTML;
  }
}

setInterval(sincronizarContadorMinimizado, 1000);

// =======================
// MARCADORES DE COLETA / ENTREGA (quando modal está minimizado)
// =======================

let marcadoresEntregaAtiva = [];

// tenta achar as coordenadas de coleta em vários formatos possíveis da API
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

// tenta achar as coordenadas de entrega final em vários formatos possíveis da API
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

  if (coleta) {
    pontos.push({ ...coleta, tipo: "coleta", label: "🏪 Coleta" });
  }

  const destino = obterCoordenadasEntregaFinal(entrega);

  if (destino) {
    pontos.push({ ...destino, tipo: "entrega", label: "🏠 Entrega" });
  }

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

  // enquadra o mapa para mostrar entregador + coleta + entrega juntos
  const pontosMapa = pontos.map((p) => [p.lat, p.lng]);

  if (marcador) {
    pontosMapa.push(marcador.getLatLng());
  }

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

// =======================
// GPS
// =======================

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

      document.getElementById("localizacao").innerHTML = `

GPS ativo · precisão de ${Math.round(precisao)}m

`;

      // envia para backend

      if (precisao <= 100) {
        await fetch(
          `${API}/api/entregador/localizacao`,

          {
            method: "PUT",

            headers: {
              ...headers,

              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              latitude,

              longitude,
            }),
          },
        );
      }

      atualizarMapa(
        latitude,

        longitude,
      );
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
// =======================
// LOGOUT
// =======================

function fazerLogout() {
  localStorage.removeItem("token");

  localStorage.removeItem("usuario");

  window.location.href = "../login/login.html";
}

async function carregarFinanceiro() {
  const response = await fetch(
    `${API}/api/financeiro/resumo`,

    { headers },
  );

  const data = await response.json();

  document.getElementById("ganhosHoje").innerHTML =
    `R$ ${data.hoje.toFixed(2)}`;

  document.getElementById("ganhosHojeExpandido").innerHTML =
    `R$ ${data.hoje.toFixed(2)}`;

  document.getElementById("ganhosSemana").innerHTML =
    `R$ ${data.semana.toFixed(2)}`;

  document.getElementById("ganhosMes").innerHTML = `R$ ${data.mes.toFixed(2)}`;

  document.getElementById("saldoCarteira").innerHTML =
    `R$ ${data.saldo.toFixed(2)}`;
}

async function retirarEntrega(id) {
  const response = await fetch(
    `${API}/api/entregas/${id}/retirar`,

    {
      method: "PUT",
      headers,
    },
  );

  const data = await response.json();

  toast(data.message || "Pedido retirado", "sucesso");

  carregarEntregas();
  carregarEntregaAtual();
}

async function finalizarEntrega(id) {
  const response = await fetch(
    `${API}/api/entregas/${id}/finalizar`,

    {
      method: "PUT",
      headers,
    },
  );

  const data = await response.json();

  toast(data.message || "Entrega finalizada", "sucesso");

  carregarEntregas();
  carregarEntregaAtual();
  carregarFinanceiro();
}

function abrirSeletorMapa(lat, lng, tipo) {
  const modal = document.createElement("div");

  modal.className = "modal-seletor-mapa";

  modal.innerHTML = `
  
    <div class="modal-seletor-mapa-conteudo">

      <h3>
      Escolha o aplicativo de navegação
      </h3>

      <div class="opcoes-mapa">

        <button onclick="navegarCom('google', ${lat}, ${lng}, '${tipo}')">
          🗺 Google Maps
        </button>

        <button onclick="navegarCom('waze', ${lat}, ${lng}, '${tipo}')">
          📍 Waze
        </button>

        <button onclick="navegarCom('apple', ${lat}, ${lng}, '${tipo}')">
          🍎 Apple Maps
        </button>

      </div>

      <button
      class="btn-fechar-modal"
      onclick="this.closest('.modal-seletor-mapa').remove()"
      >
        Cancelar
      </button>

    </div>

  `;

  document.body.appendChild(modal);
}

function navegarCom(app, lat, lng) {
  if (app === "google") {
    abrirGoogleMaps(lat, lng);
  }

  if (app === "waze") {
    abrirWaze(lat, lng);
  }

  if (app === "apple") {
    abrirAppleMaps(lat, lng);
  }

  document.querySelector(".modal-seletor-mapa")?.remove();
}

function abrirGoogleMaps(lat, lng) {
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,

    "_blank",
  );
}

function abrirWaze(lat, lng) {
  window.open(
    `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,

    "_blank",
  );
}

function abrirAppleMaps(lat, lng) {
  window.open(
    `https://maps.apple.com/?daddr=${lat},${lng}`,

    "_blank",
  );
}

function navegarColeta(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  window.open(url, "_blank");
}

function navegarCliente(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  window.open(url, "_blank");
}

// =======================
// INICIAR SISTEMA
// =======================
iniciarMapa();

document.getElementById("menuInicio").classList.add("ativo");

carregarPerfil();

carregarEntregas();
carregarEntregaAtual();
carregarFinanceiro();

iniciarGPS();

setInterval(() => {
  carregarEntregas();

  carregarEntregaAtual();

  carregarFinanceiro();
}, 3000);
