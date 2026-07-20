const supabase = require("../config/supabase");

// ======================================
// LISTAR CATEGORIAS
// ======================================

exports.listar = async (req, res) => {
  try {
    const empresaId = req.empresaId;

    if (!empresaId) {
      return res.status(400).json({
        message: "Empresa não identificada",
      });
    }

    console.log("📂 Buscando categorias para empresa:", empresaId);

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("ordem", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar categorias:", error);
      return res.status(500).json({
        message: "Erro ao buscar categorias",
        error: error.message,
      });
    }

    console.log(`✅ ${data?.length || 0} categorias encontradas`);
    res.json(data || []);
  } catch (error) {
    console.error("❌ Erro no controller de categorias:", error);
    res.status(500).json({
      message: "Erro interno ao listar categorias",
      error: error.message,
    });
  }
};

// ======================================
// CRIAR CATEGORIA
// ======================================

exports.criar = async (req, res) => {
  try {
    const empresaId = req.empresaId;
    const { nome } = req.body;

    if (!empresaId) {
      return res.status(400).json({ message: "Empresa não identificada" });
    }

    if (!nome) {
      return res
        .status(400)
        .json({ message: "Nome da categoria é obrigatório" });
    }

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        nome,
        empresa_id: empresaId,
        ordem: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar categoria:", error);
      return res.status(500).json({
        message: "Erro ao criar categoria",
        error: error.message,
      });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("❌ Erro ao criar categoria:", error);
    res.status(500).json({
      message: "Erro interno ao criar categoria",
      error: error.message,
    });
  }
};

// ======================================
// ATUALIZAR CATEGORIA
// ======================================

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res
        .status(400)
        .json({ message: "Nome da categoria é obrigatório" });
    }

    const { data, error } = await supabase
      .from("categorias")
      .update({ nome })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar categoria:", error);
      return res.status(500).json({
        message: "Erro ao atualizar categoria",
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ Erro ao atualizar categoria:", error);
    res.status(500).json({
      message: "Erro interno ao atualizar categoria",
      error: error.message,
    });
  }
};

// ======================================
// EXCLUIR CATEGORIA
// ======================================

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("categorias").delete().eq("id", id);

    if (error) {
      console.error("❌ Erro ao excluir categoria:", error);
      return res.status(500).json({
        message: "Erro ao excluir categoria",
        error: error.message,
      });
    }

    res.json({ message: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao excluir categoria:", error);
    res.status(500).json({
      message: "Erro interno ao excluir categoria",
      error: error.message,
    });
  }
};
