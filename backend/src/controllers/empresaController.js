const supabase = require("../config/supabase");
const distribuirEntrega = require("../services/distribuicaoService");
const { gerarTokenRealtime } = require("../services/supabaseRealtimeToken");

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

// ======================================
// TENTAR NOVAMENTE (fluxo sem entregador)
// POST /api/empresa/entrega/:id/tentar-novamente
// ======================================

exports.tentarNovamente = async (req, res) => {
  try {
    const entregaId = req.params.id;

    const { error: erroDelete } = await supabase
      .from("recusas_entrega")
      .delete()
      .eq("entrega_id", entregaId);

    if (erroDelete) console.log("Erro ao limpar recusas:", erroDelete);

    const { error: erroUpdate } = await supabase
      .from("entregas")
      .update({
        status: "pendente",
        entregador_id: null,
        rodadas_tentadas: 0,
        reinicio_em: null,
      })
      .eq("id", entregaId);

    if (erroUpdate) {
      console.log(erroUpdate);
      return res
        .status(400)
        .json({ message: "Não foi possível reiniciar a entrega." });
    }

    // Não emite mais evento — assim que distribuirEntrega gravar o
    // entregador_id, o Realtime já entrega isso pro navegador dele.
    const escolhido = await distribuirEntrega(entregaId);

    if (!escolhido) {
      return res.json({
        message:
          "Nenhum entregador disponível agora. Vamos tentar novamente em instantes.",
      });
    }

    return res.json({ message: "Entrega reenviada." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao reenviar entrega." });
  }
};

// ======================================
// CANCELAR ENTREGA
// POST /api/empresa/entrega/:id/cancelar
// ======================================

exports.cancelarEntrega = async (req, res) => {
  const { data, error } = await supabase
    .from("entregas")
    .update({ status: "cancelada" })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error || !data) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "Não foi possível cancelar a entrega." });
  }

  res.json({ message: "Entrega cancelada." });
};

// ======================================
// MARCAR EXTERNO
// POST /api/empresa/entrega/:id/externo
// ======================================

exports.marcarExterno = async (req, res) => {
  const { data, error } = await supabase
    .from("entregas")
    .update({ status: "finalizada", entregue_externamente: true })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error || !data) {
    console.log(error);
    return res
      .status(400)
      .json({ message: "Não foi possível marcar como externa." });
  }

  res.json({ message: "Marcada como externa" });
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

// ======================================
// TOKEN PRA REALTIME (Supabase)
// GET /api/empresa/token-realtime
// ======================================

exports.tokenRealtime = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa, error } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !empresa) {
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const token = gerarTokenRealtime({
      sub: usuarioId,
      empresa_id: empresa.id,
    });

    return res.json({ token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro ao gerar token." });
  }
};
