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
      .update({
        online: true,
      })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Erro ao ficar online.",
      });
    }

    // Tenta encaixar esse entregador em entregas pendentes sem dono.
    // Não emite mais evento nenhum — a mudança de entregador_id na
    // tabela já dispara o Realtime pro navegador dele automaticamente.
    const { data: entregasPendentes } = await supabase
      .from("entregas")
      .select("id")
      .eq("status", "pendente")
      .is("entregador_id", null);

    for (const entrega of entregasPendentes || []) {
      await distribuirEntrega(entrega.id);
    }

    res.json({
      message: "Entregador online.",

      entregador: data,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Erro interno.",
    });
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
      .update({
        online: false,
      })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Erro ao ficar offline.",
      });
    }

    res.json({
      message: "Entregador offline.",

      entregador: data,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Erro interno.",
    });
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

    const { data, error } = await supabase
      .from("entregadores")
      .update({
        latitude,

        longitude,

        ultima_localizacao: new Date(),
      })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Erro ao atualizar localização.",
      });
    }

    res.json({
      message: "Localização atualizada.",

      entregador: data,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Erro interno.",
    });
  }
};

// ======================================
// ATUALIZAR PERFIL
// ======================================

exports.me = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data, error } = await supabase
      .from("entregadores")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Entregador não encontrado.",
      });
    }

    res.json(data);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Erro interno",
    });
  }
};

exports.minhasEntregas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: entregador } = await supabase

      .from("entregadores")

      .select("id")

      .eq("usuario_id", usuarioId)

      .single();

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

      .in("status", ["aceita", "retirada", "em_rota", "entregue"])

      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno",
    });
  }
};

exports.aceitarEntrega = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: entregador } = await supabase
      .from("entregadores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (!entregador) {
      return res.status(404).json({
        message: "Entregador não encontrado.",
      });
    }

    const entregadorId = entregador.id;

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", req.params.id)
      .eq("entregador_id", entregadorId)
      .single();

    console.log("ENTREGA:", req.params.id);
    console.log("ENTREGADOR:", entregadorId);
    console.log("ERRO:", error);
    console.log("DATA:", entrega);

    if (error || !entrega) {
      return res.status(400).json({
        message: "Entrega não encontrada.",
      });
    }

    const { error: erroUpdate } = await supabase
      .from("entregas")
      .update({
        status: "aceita",
        aceita_em: new Date().toISOString(),
      })
      .eq("id", req.params.id);

    if (erroUpdate) {
      console.log(erroUpdate);

      return res.status(400).json({
        message: "Erro ao aceitar entrega.",
      });
    }

    return res.json({
      message: "Entrega aceita.",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno.",
    });
  }
};
//===========================
//CONFIRMAR RETIRADA
//============================

exports.confirmarRetirada = async (req, res) => {
  const { id } = req.params;
  const { codigo } = req.body;

  const { data: entrega } = await supabase
    .from("entregas")
    .select("*")
    .eq("id", id)
    .single();

  if (!entrega) {
    return res.status(404).json({
      message: "Entrega não encontrada",
    });
  }

  if (entrega.status !== "aceita") {
    return res.status(400).json({
      message: "Entrega não está aguardando retirada",
    });
  }

  if (codigo !== entrega.codigo_retirada) {
    return res.status(400).json({
      message: "Código inválido",
    });
  }

  const { data } = await supabase
    .from("entregas")
    .update({
      status: "retirada",
    })
    .eq("id", id)
    .select()
    .single();

  return res.json({
    message: "Retirada confirmada",
    entrega: data,
  });
};

//=====================
//CONFIRMAR ENTREGA
//======================

exports.confirmarEntrega = async (req, res) => {
  const { id } = req.params;
  const { codigo } = req.body;

  const { data: entrega } = await supabase
    .from("entregas")
    .select("*")
    .eq("id", id)
    .single();

  if (!entrega) {
    return res.status(404).json({
      message: "Entrega não encontrada",
    });
  }

  if (entrega.status !== "em_rota") {
    return res.status(400).json({
      message: "Entrega ainda não saiu para rota",
    });
  }

  if (codigo !== entrega.codigo_entrega) {
    return res.status(400).json({
      message: "Código inválido",
    });
  }

  await supabase
    .from("entregas")
    .update({
      status: "entregue",
    })
    .eq("id", id);

  return res.json({
    message: "Entrega confirmada",
  });
};

exports.iniciarRota = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("entregas")
    .update({
      status: "em_rota",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      message: "Erro ao iniciar rota",
    });
  }

  return res.json({
    message: "Rota iniciada",
    entrega: data,
  });
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
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    const token = gerarTokenRealtime({
      sub: usuarioId,
      entregador_id: entregador.id,
    });

    return res.json({ token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao gerar token." });
  }
};
