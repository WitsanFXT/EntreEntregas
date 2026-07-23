const supabase = require("../config/supabase");
const distribuirEntrega = require("../services/distribuicaoService");
const { gerarTokenRealtime } = require("../services/supabaseRealtimeToken");

// ======================================
// FICAR ONLINE
// POST /api/entregador/online
// ======================================

exports.online = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data, error } = await supabase
      .from("entregadores")
      .update({ online: true })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      console.log("Erro ao ficar online:", error);
      return res.status(400).json({ message: "Erro ao ficar online." });
    }

    // Tenta encaixar esse entregador em entregas pendentes sem dono.
    // A mudança de entregador_id na tabela já dispara o Realtime
    // pro navegador dele automaticamente, não precisa emitir evento.
    const { data: entregasPendentes, error: erroPendentes } = await supabase
      .from("entregas")
      .select("id")
      .eq("status", "pendente")
      .is("entregador_id", null);

    if (erroPendentes) {
      console.log("Erro ao buscar entregas pendentes:", erroPendentes);
    }

    for (const entrega of entregasPendentes || []) {
      await distribuirEntrega(entrega.id);
    }

    return res.json({
      message: "Entregador online.",
      entregador: data,
    });
  } catch (error) {
    console.log("Erro inesperado em online:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// FICAR OFFLINE
// POST /api/entregador/offline
// ======================================

exports.offline = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data, error } = await supabase
      .from("entregadores")
      .update({ online: false })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      console.log("Erro ao ficar offline:", error);
      return res.status(400).json({ message: "Erro ao ficar offline." });
    }

    return res.json({
      message: "Entregador offline.",
      entregador: data,
    });
  } catch (error) {
    console.log("Erro inesperado em offline:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// ATUALIZAR LOCALIZAÇÃO
// PUT /api/entregador/localizacao
// ======================================

exports.localizacao = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ message: "Latitude/longitude não informados." });
    }

    const { data, error } = await supabase
      .from("entregadores")
      .update({
        latitude,
        longitude,
        ultima_localizacao: new Date().toISOString(),
      })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      console.log("Erro ao atualizar localização:", error);
      return res
        .status(400)
        .json({ message: "Erro ao atualizar localização." });
    }

    return res.json({
      message: "Localização atualizada.",
      entregador: data,
    });
  } catch (error) {
    console.log("Erro inesperado em localizacao:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// PERFIL DO ENTREGADOR
// ======================================

exports.me = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data, error } = await supabase
      .from("entregadores")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !data) {
      console.log("Erro ao buscar entregador:", error);
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    return res.json(data);
  } catch (error) {
    console.log("Erro inesperado em me:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// ENTREGAS ATRIBUÍDAS AO ENTREGADOR
// ======================================

exports.minhasEntregas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: entregador, error: erroEntregador } = await supabase
      .from("entregadores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (erroEntregador || !entregador) {
      console.log("Erro ao buscar entregador:", erroEntregador);
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    const { data, error } = await supabase
      .from("entregas")
      .select(
        `
        *,
        empresas (
          id,
          nome_fantasia,
          endereco,
          bairro,
          cidade,
          latitude,
          longitude
        )
      `,
      )
      .eq("entregador_id", entregador.id)
      .in("status", ["aceita", "em_rota", "entregue"])
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao buscar minhas entregas:", error);
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (error) {
    console.log("Erro inesperado em minhasEntregas:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// ENTREGADOR ACEITA ENTREGA
// PUT /api/entregador/entrega/:id/aceitar
// ======================================

exports.aceitarEntrega = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { id } = req.params;

    const { data: entregador, error: erroEntregador } = await supabase
      .from("entregadores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (erroEntregador || !entregador) {
      console.log("Erro ao buscar entregador:", erroEntregador);
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", id)
      .eq("entregador_id", entregador.id)
      .single();

    if (error || !entrega) {
      console.log("Erro ao buscar entrega:", error);
      return res.status(404).json({ message: "Entrega não encontrada." });
    }

    if (entrega.status !== "pendente" && entrega.status !== "atribuida") {
      return res.status(400).json({ message: "Entrega já foi processada." });
    }

    const { data: atualizada, error: erroUpdate } = await supabase
      .from("entregas")
      .update({
        status: "aceita",
        aceita_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (erroUpdate) {
      console.log("Erro ao aceitar entrega:", erroUpdate);
      return res.status(400).json({ message: "Erro ao aceitar entrega." });
    }

    // 🔥 Sincroniza status do pedido
    const { error: erroPedidoAceita } = await supabase
      .from("pedidos")
      .update({ status: "retirada", updated_at: new Date().toISOString() })
      .eq("entrega_id", id);

    if (erroPedidoAceita) {
      console.log(
        "Erro ao atualizar status do pedido (aceitar):",
        erroPedidoAceita,
      );
    }

    return res.json({
      message: "Entrega aceita.",
      entrega: atualizada,
    });
  } catch (error) {
    console.log("Erro inesperado em aceitarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// CONFIRMAR RETIRADA (aceita -> em_rota)
// PUT /api/entregador/entrega/:id/confirmar-retirada
// ======================================

exports.confirmarRetirada = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo } = req.body || {};

    if (!codigo) {
      return res.status(400).json({ message: "Código não informado." });
    }

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !entrega) {
      console.log("Erro ao buscar entrega:", error);
      return res.status(404).json({ message: "Entrega não encontrada." });
    }

    if (entrega.status !== "aceita") {
      return res.status(400).json({
        message: "Entrega não está aguardando retirada.",
      });
    }

    if (!entrega.codigo_retirada) {
      console.log("codigo_retirada ausente no banco para entrega:", id);
      return res.status(400).json({
        message: "Entrega sem código de retirada configurado.",
      });
    }

    if (String(codigo).trim() !== String(entrega.codigo_retirada).trim()) {
      return res.status(400).json({ message: "Código de retirada inválido." });
    }

    const { data, error: updateError } = await supabase
      .from("entregas")
      .update({
        status: "em_rota",
        retirada_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.log("Erro ao confirmar retirada:", updateError);
      return res.status(400).json({ message: "Erro ao confirmar retirada." });
    }

    // 🔥 Sincroniza status do pedido
    const { error: erroPedidoRetirada } = await supabase
      .from("pedidos")
      .update({ status: "em_rota", updated_at: new Date().toISOString() })
      .eq("entrega_id", id);

    if (erroPedidoRetirada) {
      console.log(
        "Erro ao atualizar status do pedido (retirada):",
        erroPedidoRetirada,
      );
    }

    return res.json({
      message: "Retirada confirmada.",
      entrega: data,
    });
  } catch (error) {
    console.log("Erro inesperado em confirmarRetirada:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// CONFIRMAR ENTREGA (em_rota -> entregue)
// POST /api/entregador/entrega/:id/confirmar-entrega
// ======================================

exports.confirmarEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({ message: "Código não informado." });
    }

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !entrega) {
      console.log("Erro ao buscar entrega:", error);
      return res.status(404).json({ message: "Entrega não encontrada." });
    }

    if (entrega.status !== "em_rota") {
      return res.status(400).json({
        message: "Entrega ainda não está em rota.",
      });
    }

    if (!entrega.codigo_entrega) {
      console.log("codigo_entrega ausente no banco para entrega:", id);
      return res.status(400).json({
        message: "Entrega sem código de confirmação configurado.",
      });
    }

    if (String(codigo).trim() !== String(entrega.codigo_entrega).trim()) {
      return res.status(400).json({ message: "Código inválido." });
    }

    if (!entrega.entregador_id) {
      console.log("entregador_id ausente na entrega:", id);
      return res
        .status(400)
        .json({ message: "Entrega sem entregador vinculado." });
    }

    const valorEntrega = Number(entrega.valor || 0);

    console.log("========== ENTREGA ==========");
    console.log("Entrega ID:", entrega.id);
    console.log("Entregador ID:", entrega.entregador_id);
    console.log("Valor:", valorEntrega);
    console.log("=============================");

    const { error: updateError } = await supabase
      .from("entregas")
      .update({
        status: "entregue",
        finalizada_em: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.log("Erro ao finalizar entrega:", updateError);
      return res.status(400).json({ message: "Erro ao finalizar entrega." });
    }

    // 🔥 Sincroniza status do pedido
    const { error: erroPedidoEntrega } = await supabase
      .from("pedidos")
      .update({ status: "entregue", updated_at: new Date().toISOString() })
      .eq("entrega_id", id);

    if (erroPedidoEntrega) {
      console.log(
        "Erro ao atualizar status do pedido (entrega):",
        erroPedidoEntrega,
      );
    }

    const { error: erroExtrato } = await supabase
      .from("extrato_entregadores")
      .insert({
        entregador_id: entrega.entregador_id,
        entrega_id: entrega.id,
        valor: valorEntrega,
        tipo: "credito",
        bairro: entrega.bairro,
        cliente_nome: entrega.cliente_nome,
        descricao: `Entrega ${entrega.bairro}`,
      });

    console.log("ERRO EXTRATO:", erroExtrato);

    if (erroExtrato) {
      console.log(
        "Erro ao inserir extrato (entrega já finalizada):",
        erroExtrato,
      );
    }

    const { data: entregador, error: erroBuscaSaldo } = await supabase
      .from("entregadores")
      .select("saldo")
      .eq("id", entrega.entregador_id)
      .single();

    if (erroBuscaSaldo) {
      console.log("Erro ao buscar saldo do entregador:", erroBuscaSaldo);
    }

    const { error: erroSaldo } = await supabase
      .from("entregadores")
      .update({
        saldo: Number(entregador?.saldo || 0) + valorEntrega,
      })
      .eq("id", entrega.entregador_id);

    console.log("ERRO SALDO:", erroSaldo);

    if (erroSaldo) {
      console.log("Erro ao atualizar saldo:", erroSaldo);
    }

    return res.json({ message: "Entrega finalizada com sucesso." });
  } catch (error) {
    console.log("Erro inesperado em confirmarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// INICIAR ROTA (uso manual/administrativo)
// ======================================

exports.iniciarRota = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("entregas")
      .update({ status: "em_rota" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.log("Erro ao iniciar rota:", error);
      return res.status(400).json({ message: "Erro ao iniciar rota." });
    }

    return res.json({
      message: "Rota iniciada.",
      entrega: data,
    });
  } catch (error) {
    console.log("Erro inesperado em iniciarRota:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// ======================================
// TOKEN PRA REALTIME (Supabase)
// GET /api/entregador/token-realtime
// ======================================

exports.tokenRealtime = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: entregador, error } = await supabase
      .from("entregadores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !entregador) {
      console.log("Erro ao buscar entregador:", error);
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    const token = gerarTokenRealtime({
      sub: usuarioId,
      entregador_id: entregador.id,
    });

    return res.json({ token });
  } catch (error) {
    console.log("Erro inesperado em tokenRealtime:", error);
    return res.status(500).json({ message: "Erro ao gerar token." });
  }
};
