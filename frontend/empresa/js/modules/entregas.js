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

  if (entrega.codigo_retirada || entrega.codigo_entrega) {
    const codigos = document.createElement("div");

    codigos.className = "entrega-codigos";

    codigos.innerHTML = `
    ${
      entrega.codigo_retirada
        ? `<p><strong>Retirada:</strong> ${entrega.codigo_retirada}</p>`
        : ""
    }

    ${
      entrega.codigo_entrega
        ? `<p><strong>Entrega:</strong> ${entrega.codigo_entrega}</p>`
        : ""
    }
  `;

    item.appendChild(codigos);
  }

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

  // ============================
  // CÓDIGOS DE RETIRADA/ENTREGA
  // ============================

  if (entrega.codigo_retirada) {
    const codigoRetirada = document.createElement("div");

    codigoRetirada.className = "codigo-box";

    codigoRetirada.innerHTML = `
    <span>Código Retirada</span>
    <strong>${entrega.codigo_retirada}</strong>
  `;

    item.appendChild(codigoRetirada);
  }

  if (entrega.codigo_entrega) {
    const codigoEntrega = document.createElement("div");

    codigoEntrega.className = "codigo-box";

    codigoEntrega.innerHTML = `
    <span>Código Entrega</span>
    <strong>${entrega.codigo_entrega}</strong>
  `;

    item.appendChild(codigoEntrega);
  }

  return item;
}

function atualizarAlertBanner() {
  const semEntregador = [...entregasCache.values()].filter(
    (e) => e.status === "sem_entregador",
  ).length;

  const qtdElement = document.getElementById("qtdSemEntregador");
  const alertElement = document.getElementById("alertBanner");
  const badgeEntregas = document.getElementById("badgeEntregasSidebar");

  if (qtdElement) qtdElement.textContent = semEntregador;
  if (alertElement)
    alertElement.classList.toggle("oculto", semEntregador === 0);

  if (badgeEntregas) {
    badgeEntregas.textContent = semEntregador;
    badgeEntregas.style.display = semEntregador > 0 ? "flex" : "none";
  }
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
// EXPORTAR FUNÇÕES GLOBAIS
// =================================

window.criarCardEntrega = criarCardEntrega;

window.carregarEntregas = carregarEntregas;

window.renderizarEntregasAoVivo = renderizarEntregasAoVivo;

window.atualizarAlertBanner = atualizarAlertBanner;

window.atualizarPendingPill = atualizarPendingPill;

window.atualizarMetricEmEntrega = atualizarMetricEmEntrega;
