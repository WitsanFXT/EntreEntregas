const supabase = require("../config/supabase");

// ======================================
// LISTAR PRODUTOS
// ======================================

exports.listar = async (req, res) => {
  try {
    const empresaId = req.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Empresa não identificada",
      });
    }

    console.log("📦 Buscando produtos para empresa:", empresaId);

    const { data, error } = await supabase
      .from("produtos")
      .select(
        `
        *,
        categorias (
          id,
          nome
        )
      `,
      )
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar produtos:", error);
      return res.status(500).json({
        message: "Erro ao buscar produtos",
        error: error.message,
      });
    }

    console.log(`✅ ${data?.length || 0} produtos encontrados`);
    res.json(data || []);
  } catch (error) {
    console.error("❌ Erro no controller de produtos:", error);
    res.status(500).json({
      message: "Erro interno ao listar produtos",
      error: error.message,
    });
  }
};

// ======================================
// CRIAR PRODUTO
// ======================================

exports.criar = async (req, res) => {
  try {
    const empresaId = req.empresaId;
    const { nome, descricao, preco, categoria_id, imagem_url } = req.body;

    if (!empresaId) {
      return res.status(400).json({ message: "Empresa não identificada" });
    }

    if (!nome || !preco || !categoria_id) {
      return res.status(400).json({
        message: "Nome, preço e categoria são obrigatórios",
      });
    }

    const { data, error } = await supabase
      .from("produtos")
      .insert({
        nome,
        descricao: descricao || "",
        preco: Number(preco),
        categoria_id,
        imagem_url: imagem_url || "",
        empresa_id: empresaId,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar produto:", error);
      return res.status(500).json({
        message: "Erro ao criar produto",
        error: error.message,
      });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    res.status(500).json({
      message: "Erro interno ao criar produto",
      error: error.message,
    });
  }
};

// ======================================
// ATUALIZAR PRODUTO
// ======================================

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, preco, categoria_id, imagem_url, ativo } =
      req.body;

    const updates = {};
    if (nome !== undefined) updates.nome = nome;
    if (descricao !== undefined) updates.descricao = descricao;
    if (preco !== undefined) updates.preco = Number(preco);
    if (categoria_id !== undefined) updates.categoria_id = categoria_id;
    if (imagem_url !== undefined) updates.imagem_url = imagem_url;
    if (ativo !== undefined) updates.ativo = ativo;

    const { data, error } = await supabase
      .from("produtos")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar produto:", error);
      return res.status(500).json({
        message: "Erro ao atualizar produto",
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Erro ao atualizar produto:", error);
    res.status(500).json({
      message: "Erro interno ao atualizar produto",
      error: error.message,
    });
  }
};

// ======================================
// EXCLUIR PRODUTO
// ======================================

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      console.error("❌ Erro ao excluir produto:", error);
      return res.status(500).json({
        message: "Erro ao excluir produto",
        error: error.message,
      });
    }

    res.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao excluir produto:", error);
    res.status(500).json({
      message: "Erro interno ao excluir produto",
      error: error.message,
    });
  }
};
