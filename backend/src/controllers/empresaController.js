const supabase = require("../config/supabase");
const distribuirEntrega = require("../services/distribuicaoService");
const { getIO } = require("../socket/socket");

// ======================================
// BUSCAR EMPRESA LOGADA
// GET /api/empresa/me
// ======================================

exports.me = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Empresa não encontrada.",
      });
    }

    return res.json(empresa);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno.",
    });
  }
};

// ======================================
// ATUALIZAR EMPRESA
// PUT /api/empresa/me
// ======================================

exports.atualizar = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const {
      nome_fantasia,
      telefone_comercial,
      endereco,
      bairro,
      cidade,
      latitude,
      longitude,
      categoria,
    } = req.body;

    const { data: empresa, error } = await supabase
      .from("empresas")
      .update({
        nome_fantasia,
        telefone_comercial,
        endereco,
        bairro,
        cidade,
        latitude,
        longitude,
        categoria,
      })
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      console.log(error);

      return res.status(400).json({
        message: "Erro ao atualizar empresa.",
      });
    }

    return res.json({
      message: "Empresa atualizada com sucesso.",

      empresa,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno.",
    });
  }
};

exports.tentarNovamente = async (req, res) => {
  try {
    const entregaId = req.params.id;

    await supabase.from("recusas_entrega").delete().eq("entrega_id", entregaId);

    await supabase
      .from("entregas")
      .update({
        status: "pendente",
        entregador_id: null,
        rodadas_tentadas: 0,
        reinicio_em: null,
      })
      .eq("id", entregaId);

    const escolhido = await distribuirEntrega(entregaId);

    if (escolhido) {
      const { data: entregaAtualizada } = await supabase
        .from("entregas")
        .select("*")
        .eq("id", entregaId)
        .single();

      getIO()
        .to(`entregador:${escolhido.id}`)
        .emit("nova_entrega", entregaAtualizada);
    }

    return res.json({
      message: "Entrega reenviada.",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro ao reenviar entrega.",
    });
  }
};

exports.cancelarEntrega = async (req, res) => {
  await supabase
    .from("entregas")
    .update({
      status: "cancelada",
    })
    .eq("id", req.params.id);

  res.json({
    message: "Entrega cancelada.",
  });
};

exports.marcarExterno = async (req, res) => {
  await supabase
    .from("entregas")
    .update({
      status: "finalizada",
      entregue_externamente: true,
    })
    .eq("id", req.params.id);

  res.json({
    message: "Marcada como externa",
  });
};

exports.listarDisponiveis = async (req, res) => {
  const { data } = await supabase
    .from("entregas")
    .select("*")
    .eq("status", "sem_entregador");

  res.json(data);
};

exports.assumirDisponivel = async (req, res) => {
  const entregadorId = req.entregador.id;

  await supabase
    .from("entregas")
    .update({
      status: "aceita",
      entregador_id: entregadorId,
    })
    .eq("id", req.params.id)
    .eq("status", "sem_entregador");

  res.json({
    message: "Entrega assumida",
  });
};
