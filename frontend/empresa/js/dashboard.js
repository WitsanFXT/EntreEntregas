function atualizarMetricEmEntrega() {
  const emEntrega = [...entregasCache.values()].filter(
    (e) => e.status === "aceita" || e.status === "retirada",
  ).length;
  const el = document.getElementById("metricEntrega");
  if (el) el.textContent = emEntrega;
}

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

window.carregarDashboardKpis = carregarDashboardKpis;
