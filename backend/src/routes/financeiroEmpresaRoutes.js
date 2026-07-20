const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { autenticar } = require("../middleware/auth"); // 🔥 USA O MIDDLEWARE UNIFICADO

// ======================================
// OBTER EMPRESA DO USUÁRIO
// ======================================

const obterEmpresa = async (userId) => {
  const { data, error } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Empresa não encontrada");
  }
  return data.id;
};

// ======================================
// 1. RESUMO FINANCEIRO
// ======================================

router.get("/resumo", autenticar, async (req, res) => {
  try {
    const empresaId = await obterEmpresa(req.usuario.id);
    const { periodo = "mes" } = req.query;

    let dataInicio;
    const agora = new Date();

    switch (periodo) {
      case "hoje":
        dataInicio = new Date(agora);
        dataInicio.setHours(0, 0, 0, 0);
        break;
      case "semana":
        dataInicio = new Date(agora);
        dataInicio.setDate(dataInicio.getDate() - 7);
        break;
      case "mes":
        dataInicio = new Date(agora);
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      case "ano":
        dataInicio = new Date(agora);
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
      default:
        dataInicio = new Date(agora);
        dataInicio.setMonth(dataInicio.getMonth() - 1);
    }

    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("created_at", dataInicio.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    const pedidosConcluidos =
      pedidos?.filter((p) => p.status === "entregue") || [];

    const pedidosPendentes =
      pedidos?.filter(
        (p) => p.status === "aguardando" || p.status === "confirmado",
      ) || [];

    const pedidosCancelados =
      pedidos?.filter((p) => p.status === "cancelado") || [];

    const totalFaturamento = pedidosConcluidos.reduce(
      (sum, p) => sum + Number(p.valor_total || 0),
      0,
    );

    // Total de entregas (da tabela entregas)
    const { data: entregas, error: erroEntregas } = await supabase
      .from("entregas")
      .select("valor")
      .eq("empresa_id", empresaId)
      .gte("created_at", dataInicio.toISOString());

    const totalEntregas =
      entregas?.reduce((sum, e) => sum + Number(e.valor || 0), 0) || 0;

    // Canais de venda
    const canais = {};
    pedidosConcluidos.forEach((p) => {
      const origem = p.origem || "manual";
      canais[origem] = (canais[origem] || 0) + Number(p.valor_total || 0);
    });

    res.json({
      faturamento_total: totalFaturamento,
      total_pedidos: pedidosConcluidos.length,
      total_pedidos_pendentes: pedidosPendentes.length,
      total_pedidos_cancelados: pedidosCancelados.length,
      total_entregas: totalEntregas,
      ticket_medio:
        pedidosConcluidos.length > 0
          ? totalFaturamento / pedidosConcluidos.length
          : 0,
      canais,
      periodo,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar resumo financeiro:", error);
    res.status(500).json({
      message: "Erro ao buscar dados financeiros",
      error: error.message,
    });
  }
});

// ======================================
// 2. FATURAMENTO POR PERÍODO (gráfico)
// ======================================

router.get("/faturamento-periodo", autenticar, async (req, res) => {
  try {
    const empresaId = await obterEmpresa(req.usuario.id);
    const { dias = 30 } = req.query;

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - Number(dias));

    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("created_at, valor_total, status")
      .eq("empresa_id", empresaId)
      .gte("created_at", dataInicio.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    const agrupado = {};
    pedidos?.forEach((p) => {
      if (p.status === "entregue") {
        const data = new Date(p.created_at).toLocaleDateString("pt-BR");
        agrupado[data] = (agrupado[data] || 0) + Number(p.valor_total || 0);
      }
    });

    const labels = Object.keys(agrupado);
    const values = Object.values(agrupado);

    res.json({
      labels,
      values,
      total: values.reduce((sum, v) => sum + v, 0),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar faturamento por período:", error);
    res.status(500).json({
      message: "Erro ao buscar dados do gráfico",
      error: error.message,
    });
  }
});

// ======================================
// 3. LISTA DE TRANSAÇÕES
// ======================================

router.get("/transacoes", autenticar, async (req, res) => {
  try {
    const empresaId = await obterEmpresa(req.usuario.id);
    const { limite = 20, pagina = 1, status } = req.query;

    const offset = (pagina - 1) * limite;

    let query = supabase
      .from("pedidos")
      .select("*", { count: "exact" })
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limite - 1);

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil(count / limite);

    res.json({
      transacoes: data || [],
      total: count || 0,
      pagina: Number(pagina),
      total_paginas: totalPages || 1,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar transações:", error);
    res.status(500).json({
      message: "Erro ao buscar transações",
      error: error.message,
    });
  }
});

// ======================================
// 4. EXPORTAR RELATÓRIO (CSV)
// ======================================

router.get("/exportar", autenticar, async (req, res) => {
  try {
    const empresaId = await obterEmpresa(req.usuario.id);
    const { periodo = "mes" } = req.query;

    let dataInicio;
    const agora = new Date();

    switch (periodo) {
      case "mes":
        dataInicio = new Date(agora);
        dataInicio.setMonth(dataInicio.getMonth() - 1);
        break;
      case "ano":
        dataInicio = new Date(agora);
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
      case "hoje":
      default:
        dataInicio = new Date(agora);
        dataInicio.setHours(0, 0, 0, 0);
    }

    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("empresa_id", empresaId)
      .gte("created_at", dataInicio.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    let csv = "ID,Cliente,Itens,Valor,Status,Origem,Data\n";

    pedidos?.forEach((p) => {
      const data = new Date(p.created_at).toLocaleDateString("pt-BR");
      csv += `${p.id.slice(0, 8)},${p.cliente_nome || "—"},${(p.itens || "—").replace(/,/g, ";")},${Number(p.valor_total || 0).toFixed(2)},${p.status || "—"},${p.origem || "manual"},${data}\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Erro ao exportar relatório:", error);
    res.status(500).json({
      message: "Erro ao exportar relatório",
      error: error.message,
    });
  }
});

module.exports = router;
