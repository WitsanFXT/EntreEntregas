// =================================
// CONFIG / AUTENTICAÇÃO
// =================================

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

// Guarda a última lista de entregas em cache (usada pelo relatório e
// pra reabrir o modal "sem entregador" a partir da lista).
const entregasCache = new Map();
let entregaProblema = null;

// Rótulos amigáveis para cada status vindo da API
const STATUS_LABELS = {
  pendente: "Pendente",
  aceita: "Aceita",
  aceito: "Aceita",
  em_rota: "Em rota",
  a_caminho: "A caminho",
  entregue: "Entregue",
  finalizada: "Entregue",
  concluida: "Entregue",
  concluido: "Entregue",
  cancelada: "Cancelada",
  cancelado: "Cancelada",
  sem_entregador: "Sem entregador",
};

// =================================
// TOAST DE FEEDBACK
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
// NAVEGAÇÃO ENTRE TELAS (Entregas / Dashboard)
// =================================

const navEntregas = document.getElementById("navEntregas");
// HTML uses id="navEmpresa" for the dashboard/company button
const navDashboard = document.getElementById("navEmpresa");
const telaEntregas = document.getElementById("telaEntregas");
const telaDashboard = document.getElementById("telaDashboard");

function irParaTela(tela) {
  const ehEntregas = tela === "entregas";

  telaEntregas.classList.toggle("ativa", ehEntregas);
  telaDashboard.classList.toggle("ativa", !ehEntregas);
  navEntregas.classList.toggle("ativo", ehEntregas);
  navDashboard.classList.toggle("ativo", !ehEntregas);

  if (!ehEntregas) {
    atualizarRelatorio();
  }
}

navEntregas.onclick = () => irParaTela("entregas");
navDashboard.onclick = () => irParaTela("dashboard");

// Abas internas do Dashboard: Relatório / Configurações
const tabRelatorio = document.getElementById("tabRelatorio");
const tabConfiguracoes = document.getElementById("tabConfiguracoes");
const painelRelatorio = document.getElementById("painelRelatorio");
const painelConfiguracoes = document.getElementById("painelConfiguracoes");

function irParaPainelDashboard(painel) {
  const ehRelatorio = painel === "relatorio";

  painelRelatorio.classList.toggle("ativa", ehRelatorio);
  painelConfiguracoes.classList.toggle("ativa", !ehRelatorio);
  tabRelatorio.classList.toggle("ativa", ehRelatorio);
  tabConfiguracoes.classList.toggle("ativa", !ehRelatorio);

  if (!ehRelatorio) {
    carregarConfiguracoes();
  }
}

tabRelatorio.onclick = () => irParaPainelDashboard("relatorio");
tabConfiguracoes.onclick = () => irParaPainelDashboard("configuracoes");

// =================================
// PEGAR LOCALIZAÇÃO (reutilizado no form de entrega e no de configurações)
// =================================

function ligarBotaoLocalizacao(idBotao, idLat, idLon, idStatus) {
  document.getElementById(idBotao).onclick = () => {
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
// CRIAR ENTREGA
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
// LISTAR ENTREGAS
// =================================

function criarCardEntrega(entrega) {
  const item = document.createElement("div");
  item.className = "entrega-card";
  if (entrega.status === "sem_entregador") {
    item.classList.add("sem-entregador");
  }

  const header = document.createElement("div");
  header.className = "entrega-header";

  const cliente = document.createElement("span");
  cliente.className = "entrega-cliente";
  cliente.textContent = entrega.cliente_nome || "Cliente";

  const badge = document.createElement("span");
  badge.className = `status-badge status-${entrega.status}`;
  badge.textContent = STATUS_LABELS[entrega.status] || entrega.status || "—";

  header.appendChild(cliente);
  header.appendChild(badge);
  item.appendChild(header);

  const endereco = document.createElement("p");
  endereco.className = "entrega-info";
  endereco.textContent = `📍 ${entrega.endereco || "-"}`;
  item.appendChild(endereco);

  const bairro = document.createElement("p");
  bairro.className = "entrega-info";
  bairro.textContent = `🏙️ ${entrega.bairro || "-"}${entrega.cidade ? " · " + entrega.cidade : ""}`;
  item.appendChild(bairro);

  if (entrega.latitude != null && entrega.longitude != null) {
    const coords = document.createElement("div");
    coords.className = "entrega-coords";

    const lat = document.createElement("span");
    lat.textContent = `Lat: ${entrega.latitude}`;
    const lon = document.createElement("span");
    lon.textContent = `Lon: ${entrega.longitude}`;

    coords.appendChild(lat);
    coords.appendChild(lon);
    item.appendChild(coords);
  }

  // Quando a entrega está sem entregador, mostra o botão pra reabrir
  // o modal de decisão (tentar novamente / externo / cancelar).
  if (entrega.status === "sem_entregador") {
    const footer = document.createElement("div");
    footer.className = "entrega-footer";

    const btnSolucionar = document.createElement("button");
    btnSolucionar.type = "button";
    btnSolucionar.className = "acao btn-solucionar";
    btnSolucionar.textContent = "⚠️ Solucionar";
    btnSolucionar.onclick = () => abrirModalSemEntregador(entrega);

    footer.appendChild(btnSolucionar);
    item.appendChild(footer);
  }

  return item;
}

function atualizarBadgesSemEntregador() {
  const semEntregador = [...entregasCache.values()].filter(
    (e) => e.status === "sem_entregador",
  ).length;

  const badgeTopo = document.getElementById("badgeAlertaTopo");
  const qtdTopo = document.getElementById("qtdSemEntregador");
  // contadorDashboard may not exist in this template; only update if present
  const contadorNav = document.getElementById("contadorDashboard");

  qtdTopo.textContent = semEntregador;
  if (contadorNav) contadorNav.textContent = semEntregador;

  badgeTopo.classList.toggle("mostrar", semEntregador > 0);
  if (contadorNav) contadorNav.classList.toggle("mostrar", semEntregador > 0);
}

document.getElementById("badgeAlertaTopo").onclick = () =>
  irParaTela("entregas");

async function carregarEntregas() {
  const div = document.getElementById("listaEntregas");

  try {
    const response = await fetch(`${API}/api/entregas/empresa`, {
      headers,
    });

    const entregas = await response.json();

    div.innerHTML = "";
    entregasCache.clear();

    if (!Array.isArray(entregas) || !entregas.length) {
      const vazio = document.createElement("p");
      vazio.className = "empty-state";
      vazio.textContent = "Nenhuma entrega criada.";
      div.appendChild(vazio);
      atualizarBadgesSemEntregador();
      return;
    }

    entregas.forEach((entrega) => {
      entregasCache.set(entrega.id ?? entrega._id, entrega);
      div.appendChild(criarCardEntrega(entrega));
    });

    atualizarBadgesSemEntregador();
  } catch (error) {
    console.error(error);
    div.innerHTML = "";
    const erro = document.createElement("p");
    erro.className = "empty-state";
    erro.textContent = "Não foi possível carregar as entregas.";
    div.appendChild(erro);
  }
}

// =================================
// realtime supabase
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
      .channel(`empresa-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entregas",
          filter: `empresa_id=eq.${empresaAtual.id}`,
        },
        (payload) => {
          const entrega = payload.new;

          console.log("Atualização realtime:", entrega);

          carregarEntregas();

          if (entrega && entrega.status === "sem_entregador") {
            abrirModalSemEntregador(entrega);
          }
        },
      )
      .subscribe((status) => {
        console.log("Realtime empresa:", status);

        document.getElementById("statusConexao").textContent =
          status === "SUBSCRIBED" ? "Conectado" : "Reconectando...";
      });
  } catch (error) {
    console.log(error);
  }
}

// =================================
// RELATÓRIO (calculado a partir das entregas já carregadas)
// =================================

function atualizarRelatorio() {
  const entregas = [...entregasCache.values()];

  const contagem = {
    total: entregas.length,
    pendentes: 0,
    emRota: 0,
    entregues: 0,
    semEntregador: 0,
    canceladas: 0,
  };

  entregas.forEach((e) => {
    switch (e.status) {
      case "pendente":
        contagem.pendentes++;
        break;
      case "aceita":
      case "aceito":
      case "em_rota":
      case "a_caminho":
        contagem.emRota++;
        break;
      case "entregue":
      case "finalizada":
      case "concluida":
      case "concluido":
        contagem.entregues++;
        break;
      case "sem_entregador":
        contagem.semEntregador++;
        break;
      case "cancelada":
      case "cancelado":
        contagem.canceladas++;
        break;
    }
  });

  document.getElementById("statTotal").textContent = contagem.total;
  document.getElementById("statPendentes").textContent = contagem.pendentes;
  document.getElementById("statEmRota").textContent = contagem.emRota;
  document.getElementById("statEntregues").textContent = contagem.entregues;
  document.getElementById("statSemEntregador").textContent =
    contagem.semEntregador;
  document.getElementById("statCanceladas").textContent = contagem.canceladas;
}

// =================================
// CONFIGURAÇÕES DA EMPRESA (GET/PUT /api/empresa/me)
// =================================

let empresaAtual = null;
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
// CONECTAR EMPRESA AO REALTIME SUPABASE (GET /api/empresa/me)
// =================================

async function conectarEmpresa() {
  try {
    const response = await fetch(`${API}/api/empresa/me`, {
      headers,
    });

    const empresa = await response.json();

    if (!empresa?.id) {
      console.log("Empresa não encontrada");
      return;
    }

    empresaAtual = empresa;

    document.getElementById("nomeEmpresaTopo").textContent =
      empresa.nome_fantasia || "Painel da empresa";

    console.log("Empresa conectada:", empresa.id);
  } catch (error) {
    console.log(error);

    document.getElementById("statusConexao").textContent = "Erro ao conectar";
  }
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
    console.error("entregaProblema sem id:", entregaProblema);
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
    } catch (_) {
      // resposta sem corpo JSON
    }

    if (!response.ok) {
      const detalhe = data?.message || data?.error || response.statusText;
      console.error(
        `Falha em POST /api/empresa/entrega/${entregaId}/${url} → ${response.status} ${detalhe}`,
      );
      mostrarToast(`Erro ${response.status}: ${detalhe}`, "erro");
      return;
    }

    mostrarToast(data?.message || mensagemSucesso, "sucesso");

    if (fechar) {
      fecharModalSemEntregador();
    }

    if (atualizarLista) {
      carregarEntregas();
    }
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

// ================================
// LOGOUT
// ================================

const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    const confirmar = confirm("Deseja realmente sair da conta?");

    if (!confirmar) return;

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href = "../login/login.html";
  });
}

// =================================
// INICIALIZAÇÃO
// =================================
(async () => {
  await conectarEmpresa();
  await carregarEntregas();
  await iniciarRealtime();
})();
