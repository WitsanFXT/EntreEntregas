// =================================
// FINANCEIRO
// =================================

let paginaAtualTransacoes = 1;
let limiteTransacoes = 20;
let filtroStatusTransacoes = "todos";
let graficoInstance = null;

// =================================
// CARREGAR RESUMO FINANCEIRO
// =================================

async function carregarResumoFinanceiro(periodo = "mes") {
  try {
    // 🔥 URL CORRETA - sem /empresa
    const response = await fetch(
      `${API}/api/financeiro/resumo?periodo=${periodo}`,
      { headers },
    );
    const dados = await response.json();

    if (!response.ok) {
      console.error("Erro ao carregar resumo:", dados);
      return;
    }

    document.getElementById("metricFaturamentoTotal").textContent =
      formatarMoeda(dados.faturamento_total || 0);
    document.getElementById("metricTotalPedidos").textContent =
      dados.total_pedidos || 0;
    document.getElementById("metricTicketMedio").textContent = formatarMoeda(
      dados.ticket_medio || 0,
    );
    document.getElementById("metricTotalEntregas").textContent = formatarMoeda(
      dados.total_entregas || 0,
    );

    // Variações (simuladas, pois não temos histórico)
    // Em produção, compare com período anterior
    document.getElementById("metricFaturamentoVariacao").textContent =
      dados.total_pedidos > 0 ? "📈 +5%" : "📊 0%";
    document.getElementById("metricPedidosVariacao").textContent =
      dados.total_pedidos > 0 ? "📈 +3%" : "📊 0%";
    document.getElementById("metricTicketVariacao").textContent =
      dados.ticket_medio > 0 ? "📈 +2%" : "📊 0%";
    document.getElementById("metricEntregasVariacao").textContent =
      dados.total_entregas > 0 ? "📈 +4%" : "📊 0%";

    // Canais
    const canais = dados.canais || {};
    const totalCanais =
      Object.values(canais).reduce((sum, v) => sum + v, 0) || 1;

    document.getElementById("canalIfoodFinanceiro").textContent = formatarMoeda(
      canais.ifood || 0,
    );
    document.getElementById("canalManualFinanceiro").textContent =
      formatarMoeda(canais.manual || 0);
    document.getElementById("canalSiteFinanceiro").textContent = formatarMoeda(
      canais.site || 0,
    );

    document.getElementById("canalIfoodBar").style.width =
      `${((canais.ifood || 0) / totalCanais) * 100}%`;
    document.getElementById("canalManualBar").style.width =
      `${((canais.manual || 0) / totalCanais) * 100}%`;
    document.getElementById("canalSiteBar").style.width =
      `${((canais.site || 0) / totalCanais) * 100}%`;
  } catch (error) {
    console.error("Erro ao carregar resumo financeiro:", error);
    mostrarToast("Erro ao carregar dados financeiros", "erro");
  }
}

// =================================
// CARREGAR GRÁFICO DE FATURAMENTO
// =================================

async function carregarGraficoFaturamento(dias = 30) {
  try {
    // 🔥 URL CORRETA - sem /empresa
    const response = await fetch(
      `${API}/api/financeiro/faturamento-periodo?dias=${dias}`,
      { headers },
    );
    const dados = await response.json();

    if (!response.ok) {
      console.error("Erro ao carregar gráfico:", dados);
      return;
    }

    const ctx = document.getElementById("graficoFaturamento").getContext("2d");

    // Destroi gráfico anterior se existir
    if (graficoInstance) {
      graficoInstance.destroy();
    }

    const cores = {
      border: "#ff6b00",
      background: "rgba(255, 107, 0, 0.1)",
      point: "#ff6b00",
    };

    graficoInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: dados.labels || ["Sem dados"],
        datasets: [
          {
            label: "Faturamento (R$)",
            data: dados.values || [0],
            borderColor: cores.border,
            backgroundColor: cores.background,
            borderWidth: 3,
            pointBackgroundColor: cores.point,
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return "R$ " + context.parsed.y.toFixed(2);
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "R$ " + value.toFixed(2);
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Erro ao carregar gráfico:", error);
  }
}

// =================================
// CARREGAR TRANSAÇÕES
// =================================

// =================================
// CARREGAR TRANSAÇÕES
// =================================

async function carregarTransacoes(pagina = 1, status = "todos") {
  try {
    const response = await fetch(
      `${API}/api/financeiro/transacoes?limite=${limiteTransacoes}&pagina=${pagina}&status=${status}`,
      { headers },
    );
    const dados = await response.json();

    if (!response.ok) {
      console.error("Erro ao carregar transações:", dados);
      return;
    }

    const container = document.getElementById("listaTransacoes");
    const paginacao = document.getElementById("paginacaoTransacoes");

    if (!dados.transacoes || dados.transacoes.length === 0) {
      container.innerHTML = `<p class="empty-state">Nenhuma transação encontrada.</p>`;
      paginacao.style.display = "none";
      return;
    }

    // 🔥 RENDERIZAÇÃO SEM VALOR_ENTREGA
    container.innerHTML = dados.transacoes
      .map(
        (t) => `
      <div class="transacao-row">
        <div class="transacao-cliente">
          <strong>${t.cliente_nome || "Cliente"}</strong>
          <small>${t.itens || "—"}</small>
        </div>
        <span class="status-badge status-${t.status}">${STATUS_LABELS[t.status] || t.status}</span>
        <span class="origem-badge origem-${t.origem || "manual"}">${ORIGEM_LABELS[t.origem] || "Manual"}</span>
        <span class="transacao-valor ${t.status === "cancelado" ? "negativo" : "positivo"}">
          ${formatarMoeda(Number(t.valor_total || 0))}
        </span>
      </div>
    `,
      )
      .join("");

    // Paginação
    paginacao.style.display = "flex";
    document.getElementById("infoPagina").textContent =
      `Página ${dados.pagina} de ${dados.total_paginas || 1}`;
    document.getElementById("btnPaginaAnterior").disabled = dados.pagina <= 1;
    document.getElementById("btnProximaPagina").disabled =
      dados.pagina >= (dados.total_paginas || 1);

    paginaAtualTransacoes = dados.pagina || 1;
  } catch (error) {
    console.error("Erro ao carregar transações:", error);
    document.getElementById("listaTransacoes").innerHTML =
      `<p class="empty-state">Erro ao carregar transações.</p>`;
  }
}

// =================================
// EXPORTAR RELATÓRIO
// =================================

async function exportarRelatorio(periodo = "mes") {
  try {
    // 🔥 URL CORRETA - sem /empresa
    const response = await fetch(
      `${API}/api/financeiro/exportar?periodo=${periodo}`,
      { headers },
    );

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    mostrarToast("Relatório exportado com sucesso!", "sucesso");
  } catch (error) {
    console.error("Erro ao exportar relatório:", error);
    mostrarToast("Erro ao exportar relatório", "erro");
  }
}

// =================================
// ATUALIZAR FINANCEIRO
// =================================

function atualizarFinanceiro() {
  const periodo = document.getElementById("filtroPeriodo").value;
  const dias =
    periodo === "hoje"
      ? 1
      : periodo === "semana"
        ? 7
        : periodo === "mes"
          ? 30
          : 365;

  carregarResumoFinanceiro(periodo);
  carregarGraficoFaturamento(dias);
  carregarTransacoes(1, filtroStatusTransacoes);
}

// =================================
// EVENTOS DO FINANCEIRO
// =================================

// Botão atualizar
document
  .getElementById("btnAtualizarFinanceiro")
  ?.addEventListener("click", () => {
    atualizarFinanceiro();
    mostrarToast("Dados atualizados!", "sucesso");
  });

// Botão exportar
document
  .getElementById("btnExportarRelatorio")
  ?.addEventListener("click", () => {
    const periodo = document.getElementById("filtroPeriodo").value;
    exportarRelatorio(periodo);
  });

// Filtro de período
document.getElementById("filtroPeriodo")?.addEventListener("change", (e) => {
  const campoPersonalizado = document.getElementById("campoDataPersonalizado");
  if (e.target.value === "personalizado") {
    campoPersonalizado.style.display = "block";
  } else {
    campoPersonalizado.style.display = "none";
    atualizarFinanceiro();
  }
});

// Filtro de status nas transações
document
  .getElementById("filtroStatusTransacoes")
  ?.addEventListener("change", (e) => {
    filtroStatusTransacoes = e.target.value;
    carregarTransacoes(1, filtroStatusTransacoes);
  });

// Paginação
document.getElementById("btnPaginaAnterior")?.addEventListener("click", () => {
  if (paginaAtualTransacoes > 1) {
    carregarTransacoes(paginaAtualTransacoes - 1, filtroStatusTransacoes);
  }
});

document.getElementById("btnProximaPagina")?.addEventListener("click", () => {
  carregarTransacoes(paginaAtualTransacoes + 1, filtroStatusTransacoes);
});

// Datas personalizadas
document
  .getElementById("dataInicioPersonalizado")
  ?.addEventListener("change", () => {
    // Em produção, implementar filtro por datas personalizadas
  });

// =================================
// FUNÇÃO AUXILIAR - FORMATAR MOEDA
// =================================

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
// exportar para empresa.js
window.atualizarFinanceiro = atualizarFinanceiro;
