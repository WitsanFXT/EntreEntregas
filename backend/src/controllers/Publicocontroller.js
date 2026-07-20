const supabase = require("../config/supabase");

// ======================================
// CARDÁPIO PÚBLICO (sem login)
// GET /api/publico/empresas/:empresaId/cardapio
// ======================================
// Usado pelo app do cliente final pra montar a tela da loja.
// Só devolve dados seguros de expor (nada de telefone comercial,
// endereço completo de cadastro, ids internos sensíveis etc,
// a não ser o que já é público em qualquer delivery).

exports.buscarCardapio = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select(
        "id, nome_fantasia, categoria, logo_url, banner_url, bairro, cidade",
      )
      .eq("id", empresaId)
      .single();

    if (erroEmpresa || !empresa) {
      return res.status(404).json({
        message: "Loja não encontrada.",
      });
    }

    const { data: categorias, error: erroCategorias } = await supabase
      .from("categorias")
      .select("id, nome, ordem")
      .eq("empresa_id", empresaId)
      .order("ordem", { ascending: true });

    if (erroCategorias) throw erroCategorias;

    const { data: produtos, error: erroProdutos } = await supabase
      .from("produtos")
      .select("id, nome, descricao, preco, imagem_url, categoria_id, ativo")
      .eq("empresa_id", empresaId)
      .eq("ativo", true);

    if (erroProdutos) throw erroProdutos;

    return res.json({
      empresa,
      categorias: categorias || [],
      produtos: produtos || [],
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro ao carregar o cardápio.",
    });
  }
};

// ======================================
// TABELA DE BAIRROS/TAXA DE ENTREGA (sem login)
// GET /api/publico/empresas/:empresaId/tabela-precos
// ======================================
// Mesmo dado que "GET /api/tabela-precos" mostra pro dono da loja
// (dashboard), só que filtrado por empresa via URL em vez de token,
// porque quem chama aqui é o cliente final, sem login.

exports.listarTabelaPrecos = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const { data, error } = await supabase
      .from("tabela_precos")
      .select("id, bairro, valor")
      .eq("empresa_id", empresaId)
      .order("bairro", { ascending: true });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro ao carregar bairros.",
    });
  }
};

// ======================================
// CRIAR PEDIDO (sem login — vem do cardápio público)
// POST /api/publico/empresas/:empresaId/pedidos
// ======================================
// ⚠️ RASCUNHO — os campos abaixo seguem exatamente o que o formulário
// de "novo pedido manual" do dashboard já envia pra
// POST /api/empresa/pedidos (cliente_nome, cliente_telefone, itens,
// valor_total, valor_entrega, origem, endereco, bairro, cidade,
// latitude, longitude). Ainda não tenho o pedidoController.js pra
// confirmar se criar um pedido também precisa criar a "entrega" e
// chamar o distribuicaoService (pra cair pro entregador). Se esse
// arquivo existir, é melhor eu reaproveitar a MESMA função em vez de
// duplicar essa lógica aqui — me manda o pedidoController.js e eu ajusto.

exports.criarPedido = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const {
      cliente_nome,
      cliente_telefone,
      itens,
      valor_total,
      valor_entrega,
      forma_pagamento,
      troco_para,
      tipo_entrega,
      endereco,
      bairro,
      cidade,
      latitude,
      longitude,
    } = req.body;

    if (!cliente_nome || !cliente_telefone || !itens) {
      return res.status(400).json({
        message: "Nome, celular e itens do pedido são obrigatórios.",
      });
    }

    const { data: empresa, error: erroEmpresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("id", empresaId)
      .single();

    if (erroEmpresa || !empresa) {
      return res.status(404).json({
        message: "Loja não encontrada.",
      });
    }

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        empresa_id: empresaId,
        cliente_nome,
        cliente_telefone,
        itens,
        valor_total: valor_total || 0,
        valor_entrega: valor_entrega || 0,
        forma_pagamento: forma_pagamento || null,
        troco_para: troco_para || null,
        tipo_entrega: tipo_entrega || "Entrega",
        origem: "site",
        status: "pendente",
        endereco: endereco || null,
        bairro: bairro || null,
        cidade: cidade || null,
        latitude: latitude || null,
        longitude: longitude || null,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: "Pedido enviado com sucesso!",
      pedido,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro ao enviar pedido.",
    });
  }
};
