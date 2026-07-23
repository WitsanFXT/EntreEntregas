const supabase = require("../config/supabase");
const redistribuirEntrega = require("../services/redistribuirEntrega");
const distribuirEntrega = require("../services/distribuicaoService");

// =====================================
// CRIAR ENTREGA
// =====================================

exports.criarEntrega = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const codigoEntrega = Math.floor(1000 + Math.random() * 9000).toString();
    const codigoRetirada = Math.floor(1000 + Math.random() * 9000).toString();

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (erroEmpresa || !empresa) {
      console.log("Erro ao buscar empresa:", erroEmpresa);
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const {
      cliente_nome,
      cliente_telefone,
      endereco,
      bairro,
      cidade,
      descricao,
      latitude,
      longitude,
    } = req.body;

    // BUSCAR VALOR DO BAIRRO
    const { data: tabelaPreco, error: erroPreco } = await supabase
      .from("tabela_precos")
      .select("valor")
      .eq("bairro", bairro)
      .single();

    if (erroPreco || !tabelaPreco) {
      console.log("Erro ao buscar valor do bairro:", erroPreco);
      return res.status(400).json({
        message: "Valor de entrega não encontrado para esse bairro.",
      });
    }

    const { data: entrega, error } = await supabase
      .from("entregas")
      .insert({
        empresa_id: empresa.id,
        cliente_nome,
        cliente_telefone,
        endereco,
        bairro,
        cidade,
        descricao,
        latitude,
        longitude,
        status: "pendente",
        valor: tabelaPreco.valor,
        codigo_entrega: codigoEntrega,
        codigo_retirada: codigoRetirada,
      })
      .select()
      .single();

    if (error) {
      console.log("Erro ao criar entrega:", error);
      return res.status(400).json(error);
    }

    // distribuirEntrega já grava o entregador_id no banco — o
    // entregador escolhido recebe isso via Realtime automaticamente,
    // não precisa mais emitir evento nenhum aqui.
    await distribuirEntrega(entrega.id);

    return res.status(201).json({
      message: "Entrega criada com sucesso.",
      entrega,
    });
  } catch (error) {
    console.log("Erro inesperado em criarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// LISTAR ENTREGAS EMPRESA
// =====================================

exports.listarEntregasEmpresa = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (erroEmpresa || !empresa) {
      console.log("Erro ao buscar empresa:", erroEmpresa);
      return res.status(404).json({ message: "Empresa não encontrada." });
    }

    const { data, error } = await supabase
      .from("entregas")
      .select(
        `
        *,
        entregadores (
          *,
          usuarios (
            nome
          )
        )
      `,
      )
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao listar entregas da empresa:", error);
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (error) {
    console.log("Erro inesperado em listarEntregasEmpresa:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// ENTREGADOR VER DISPONÍVEIS
// =====================================

exports.listarEntregasEntregador = async (req, res) => {
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
        empresas (*)
      `,
      )
      .eq("status", "pendente")
      .eq("entregador_id", entregador.id);

    if (error) {
      console.log("Erro ao listar entregas do entregador:", error);
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (error) {
    console.log("Erro inesperado em listarEntregasEntregador:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// ENTREGADOR ACEITA ENTREGA
// =====================================

exports.aceitarEntrega = async (req, res) => {
  try {
    const entregaId = req.params.id;
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

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", entregaId)
      .eq("status", "pendente")
      .eq("entregador_id", entregador.id)
      .single();

    if (error || !entrega) {
      console.log("Entrega indisponível:", error);
      return res.status(400).json({ message: "Entrega indisponível." });
    }

    const { data: atualizada, error: updateError } = await supabase
      .from("entregas")
      .update({
        status: "aceita",
        aceita_em: new Date().toISOString(),
      })
      .eq("id", entregaId)
      .select()
      .single();

    if (updateError) {
      console.log("Erro ao aceitar entrega:", updateError);
      return res.status(400).json({ message: "Erro ao aceitar entrega." });
    }

    return res.json({
      message: "Entrega aceita com sucesso.",
      entrega: atualizada,
    });
  } catch (error) {
    console.log("Erro inesperado em aceitarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// CONFIRMAR RETIRADA (aceita -> em_rota)
// =====================================

exports.retirarEntrega = async (req, res) => {
  try {
    const entregaId = req.params.id;

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", entregaId)
      .single();

    if (error || !entrega) {
      console.log("Erro ao buscar entrega:", error);
      return res.status(404).json({ message: "Entrega não encontrada." });
    }

    if (entrega.status !== "aceita") {
      return res
        .status(400)
        .json({ message: "Entrega não está aguardando retirada." });
    }

    // Se o frontend enviar o código de retirada, valida. Caso não envie
    // (fluxo antigo), segue sem validação de código.

    const { data, error: updateError } = await supabase
      .from("entregas")
      .update({
        status: "em_rota",
        retirada_em: new Date().toISOString(),
      })
      .eq("id", entregaId)
      .select()
      .single();

    if (updateError) {
      console.log("Erro ao confirmar retirada:", updateError);
      return res.status(400).json(updateError);
    }

    return res.json({
      message: "Pedido retirado.",
      entrega: data,
    });
  } catch (error) {
    console.log("Erro inesperado em retirarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// CONFIRMAR ENTREGA (em_rota -> entregue)
// =====================================

// =====================================
// FINALIZAR ENTREGA (uso administrativo,
// idempotente — não duplica extrato/saldo
// se a entrega já estiver "entregue")
// =====================================

exports.finalizarEntrega = async (req, res) => {
  try {
    const entregaId = req.params.id;

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", entregaId)
      .single();

    if (error || !entrega) {
      console.log("Erro ao buscar entrega:", error);
      return res.status(404).json({ message: "Entrega não encontrada." });
    }

    if (entrega.status === "entregue") {
      return res.status(400).json({ message: "Entrega já foi finalizada." });
    }

    const valorEntrega = Number(entrega.valor || 0);

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

    // 🔥 Atualiza o pedido vinculado a essa entrega
    const { error: erroPedido } = await supabase
      .from("pedidos")
      .update({
        status: "entregue",
        updated_at: new Date().toISOString(),
      })
      .eq("entrega_id", id);

    if (erroPedido) {
      console.log("Erro ao atualizar status do pedido:", erroPedido);
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

    if (erroExtrato) {
      console.log("Erro ao inserir extrato:", erroExtrato);
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

    if (erroSaldo) {
      console.log("Erro ao atualizar saldo:", erroSaldo);
    }

    return res.json({
      message: "Entrega finalizada.",
      valor: valorEntrega,
    });
  } catch (error) {
    console.log("Erro inesperado em finalizarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// LISTAR MINHAS ENTREGAS (entregador)
// =====================================

exports.listarMinhasEntregas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const { data: entregador, error: errorEntregador } = await supabase
      .from("entregadores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (errorEntregador || !entregador) {
      console.log("Erro ao buscar entregador:", errorEntregador);
      return res.status(404).json({ message: "Entregador não encontrado." });
    }

    const { data, error } = await supabase
      .from("entregas")
      .select(
        `
        *,
        empresas (*)
      `,
      )
      .eq("entregador_id", entregador.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Erro ao listar minhas entregas:", error);
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (error) {
    console.log("Erro inesperado em listarMinhasEntregas:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// DASHBOARD DO ENTREGADOR
// =====================================

exports.dashboardEntregador = async (req, res) => {
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

    const { data: disponiveis, error: erroDisponiveis } = await supabase
      .from("entregas")
      .select("*")
      .eq("status", "pendente")
      .eq("entregador_id", entregador.id);

    const { data: aceitas, error: erroAceitas } = await supabase
      .from("entregas")
      .select("*")
      .eq("entregador_id", entregador.id)
      .eq("status", "aceita");

    const { data: emRota, error: erroEmRota } = await supabase
      .from("entregas")
      .select("*")
      .eq("entregador_id", entregador.id)
      .eq("status", "em_rota");

    const { data: entregues, error: erroEntregues } = await supabase
      .from("entregas")
      .select("*")
      .eq("entregador_id", entregador.id)
      .eq("status", "entregue");

    if (erroDisponiveis || erroAceitas || erroEmRota || erroEntregues) {
      console.log("Erro ao montar dashboard:", {
        erroDisponiveis,
        erroAceitas,
        erroEmRota,
        erroEntregues,
      });
      return res.status(400).json({ message: "Erro ao carregar dashboard." });
    }

    return res.json({
      disponiveis,
      aceitas,
      em_rota: emRota,
      entregues,
      totais: {
        disponiveis: disponiveis.length,
        aceitas: aceitas.length,
        em_rota: emRota.length,
        entregues: entregues.length,
      },
    });
  } catch (error) {
    console.log("Erro inesperado em dashboardEntregador:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};

// =====================================
// RECUSAR ENTREGA
// =====================================

exports.recusarEntrega = async (req, res) => {
  try {
    const entregaId = req.params.id;
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

    const { data: entregaAtual, error: erroEntregaAtual } = await supabase
      .from("entregas")
      .select("id")
      .eq("id", entregaId)
      .eq("entregador_id", entregador.id)
      .single();

    if (erroEntregaAtual || !entregaAtual) {
      console.log("Entrega não atribuída a este entregador:", erroEntregaAtual);
      return res
        .status(400)
        .json({ message: "Essa entrega não está atribuída a você." });
    }

    const { error: erroRecusa } = await supabase
      .from("recusas_entrega")
      .insert({
        entrega_id: entregaId,
        entregador_id: entregador.id,
      });

    if (erroRecusa) {
      console.log("Erro ao registrar recusa:", erroRecusa);
      return res.status(400).json({ message: "Erro ao registrar recusa." });
    }

    // redistribuirEntrega já grava o novo entregador_id no banco —
    // ele recebe a corrida via Realtime, sem precisar de emit aqui.
    await redistribuirEntrega(entregaId);

    return res.json({ message: "Entrega recusada." });
  } catch (error) {
    console.log("Erro inesperado em recusarEntrega:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
};
