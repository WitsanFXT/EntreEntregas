const supabase = require("../config/supabase");

// ======================================
// CRIAR CATEGORIA
// ======================================

exports.criarCategoria = async (req, res) => {
  try {
    const { nome, ordem = 0 } = req.body;

    const empresa_id = req.usuario.empresa_id;

    console.log("EMPRESA ID:", empresa_id);
    console.log("BODY:", req.body);

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        empresa_id,
        nome,
        ordem,
      })
      .select()
      .single();

    if (error) {
      console.log("ERRO SUPABASE:", error);

      return res.status(500).json(error);
    }

    return res.status(201).json(data);
  } catch (err) {
    console.log(err);

    return res.status(500).json(err);
  }
};

// ======================================
// LISTAR CATEGORIAS
// ======================================

exports.listarCategorias = async (req, res) => {
  try {
    console.log("USUARIO JWT:", req.usuario);

    const empresa_id = req.usuario.empresa_id;

    console.log("EMPRESA ID:", empresa_id);

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("empresa_id", empresa_id);

    console.log("CATEGORIAS:", data);

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao listar categorias",
    });
  }
};

// ======================================
// EDITAR CATEGORIA
// ======================================

exports.editarCategoria = async (req, res) => {
  try {
    const empresa_id = req.usuario.empresa_id;

    const { id } = req.params;

    const { nome, ordem } = req.body;

    const { data, error } = await supabase
      .from("categorias")
      .update({
        nome,
        ordem,
      })
      .eq("id", id)
      .eq("empresa_id", empresa_id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        message: "Categoria não encontrada",
      });
    }

    return res.json({
      message: "Categoria atualizada",
      categoria: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao editar categoria",
    });
  }
};

// ======================================
// EXCLUIR CATEGORIA
// ======================================

exports.excluirCategoria = async (req, res) => {
  try {
    const empresa_id = req.usuario.empresa_id;

    const { id } = req.params;

    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresa_id);

    if (error) throw error;

    return res.json({
      message: "Categoria removida com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao excluir categoria",
    });
  }
};
