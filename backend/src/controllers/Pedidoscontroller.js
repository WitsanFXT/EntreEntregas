const supabase = require("../config/supabase");
const distribuirEntrega = require("../services/distribuicaoService");

// ======================================
// Helper: cria a entrega vinculada (quando o pedido tem endereço)
// Reaproveita a mesma lógica de tabela_precos/distribuição do
// entregasController, só que chamada internamente.
// ======================================

async function criarEntregaParaPedido(empresa, pedido, dadosEntrega) {
  const { endereco, bairro, cidade, latitude, longitude } = dadosEntrega;

  if (!endereco || !bairro) return null;

  const { data: tabelaPreco, error: erroPreco } = await supabase
    .from("tabela_precos")
    .select("valor")
    .eq("bairro", bairro)
    .single();

  if (erroPreco || !tabelaPreco) {
    console.log(`Sem valor de entrega cadastrado pro bairro "${bairro}"`);
    return null;
  }

  const { data: entrega, error } = await supabase
    .from("entregas")
    .insert({
      empresa_id: empresa.id,
      cliente_nome: pedido.cliente_nome,
      cliente_telefone: pedido.cliente_telefone,
      endereco,
      bairro,
      cidade,
      descricao: pedido.itens,
      latitude,
      longitude,
      status: "pendente",
      valor: tabelaPreco.valor,
    })
    .select()
    .single();

  if (error) {
    console.log("Erro ao criar entrega do pedido:", error);
    return null;
  }

  await supabase
    .from("pedidos")
    .update({ entrega_id: entrega.id })
    .eq("id", pedido.id);

  await distribuirEntrega(entrega.id);

  return entrega;
}

// ======================================
// CRIAR PEDIDO
// POST /api/empresa/pedidos
// ======================================

exports.criarPedido = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (erroEmpresa || !empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const {
      cliente_nome,
      cliente_telefone,
      itens,
      valor_total,
      origem,
      endereco,
      bairro,
      cidade,
      latitude,
      longitude,
    } = req.body;

    if (!cliente_nome || !cliente_nome.trim()) {
      return res.status(400).json({ message: "Informe o nome do cliente." });
    }

    if (!itens || !itens.trim()) {
      return res.status(400).json({ message: "Informe os itens do pedido." });
    }

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        empresa_id: empresa.id,
        cliente_nome: cliente_nome.trim(),
        cliente_telefone: cliente_telefone?.trim() || null,
        itens: itens.trim(),
        valor_total: Number(valor_total) || 0,
        origem: origem || "manual",
        status: "aguardando",
      })
      .select()
      .single();

    if (error) {
      console.log(error);
      return res.status(400).json({ message: "Erro ao criar pedido." });
    }

    // Se veio endereço, já gera a entrega vinculada (mesmo fluxo de sempre)
    let entrega = null;
    if (endereco && bairro) {
      entrega = await criarEntregaParaPedido(empresa, pedido, {
        endereco,
        bairro,
        cidade,
        latitude,
        longitude,
      });
    }

    return res.status(201).json({
      message: entrega
        ? "Pedido criado e entrega enviada pro motoboy."
        : "Pedido criado.",
      pedido,
      entrega,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// LISTAR PEDIDOS
// GET /api/empresa/pedidos
// ======================================

exports.listarPedidos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return res.status(400).json({ message: "Erro ao listar pedidos." });
    }

    return res.json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// ATUALIZAR STATUS DO PEDIDO
// PATCH /api/empresa/pedidos/:id/status
// ======================================

const STATUS_VALIDOS = [
  "aguardando",
  "confirmado",
  "em_preparo",
  "saiu_para_entrega",
  "entregue",
  "cancelado",
];

exports.atualizarStatusPedido = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { status } = req.body;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    const { data, error } = await supabase
      .from("pedidos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("empresa_id", empresa.id)
      .select()
      .single();

    if (error || !data) {
      console.log(error);
      return res
        .status(400)
        .json({ message: "Erro ao atualizar status do pedido." });
    }

    return res.json({ message: "Status atualizado.", pedido: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// KPIs DO DASHBOARD (dia atual)
// GET /api/empresa/pedidos/dashboard-kpis?data=YYYY-MM-DD
// ======================================

exports.dashboardKpis = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    // data local do Brasil — não usar new Date().toISOString() puro, porque
    // entre 21h e meia-noite (horário de Brasília) o UTC já virou o dia
    // seguinte e a "hoje" calculada ficava errada, excluindo pedidos recentes.
    const agoraUtc = new Date();
    const agoraBrasil = new Date(agoraUtc.getTime() - 3 * 60 * 60 * 1000);
    const dataRef = req.query.data || agoraBrasil.toISOString().slice(0, 10);
    const inicio = `${dataRef}T00:00:00-03:00`;
    const fim = `${dataRef}T23:59:59-03:00`;

    const { data: pedidosHoje, error } = await supabase
      .from("pedidos")
      .select("valor_total, origem, status")
      .eq("empresa_id", empresa.id)
      .gte("created_at", inicio)
      .lte("created_at", fim);

    if (error) {
      console.log(error);
      return res.status(400).json({ message: "Erro ao calcular indicadores." });
    }

    const pedidosValidos = (pedidosHoje || []).filter(
      (p) => p.status !== "cancelado",
    );

    const faturamentoHoje = pedidosValidos.reduce(
      (soma, p) => soma + Number(p.valor_total || 0),
      0,
    );

    const canais = { ifood: 0, manual: 0, site: 0 };
    pedidosValidos.forEach((p) => {
      canais[p.origem] = (canais[p.origem] || 0) + 1;
    });

    const pedidosPendentes = pedidosValidos.filter(
      (p) => p.status === "aguardando" || p.status === "confirmado",
    ).length;

    const { count: emEntrega } = await supabase
      .from("entregas")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresa.id)
      .in("status", ["aceita", "retirada"]);

    return res.json({
      faturamentoHoje,
      pedidosHoje: pedidosValidos.length,
      ticketMedio: pedidosValidos.length
        ? faturamentoHoje / pedidosValidos.length
        : 0,
      emEntrega: emEntrega || 0,
      pedidosPendentes,
      canais,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno." });
  }
};
