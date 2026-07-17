const supabase = require("../config/supabase");

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

    const { data: entregasPendentes } = await supabase
      .from("entregas")
      .select("id")
      .eq("status", "pendente")
      .is("entregador_id", null);

    const distribuirEntrega = require("../services/distribuicaoService");
    const { getIO } = require("../socket/socket");

    for (const entrega of entregasPendentes || []) {
      const escolhido = await distribuirEntrega(entrega.id);

      if (escolhido) {
        const { data: entregaAtualizada } = await supabase
          .from("entregas")
          .select("*")
          .eq("id", entrega.id)
          .single();

        getIO()
          .to(`entregador:${escolhido.id}`)
          .emit("nova_entrega", entregaAtualizada);
      }
    }

    if (error) {
      return res.status(400).json({
        message: "Erro ao ficar online.",
      });
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
            latitude,
            longitude
        )
    `,
      )

      .eq("entregador_id", entregador.id)

      .in("status", ["aceita", "retirada", "finalizada"])

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
