// ======================================
// CRIAR PRODUTO
// ======================================

const supabase = require("../config/supabase");
const crypto = require("crypto");

exports.criarProduto = async (req, res) => {
  try {
    console.log("USUARIO:", req.usuario);
    console.log("EMPRESA_ID:", req.usuario?.empresa_id);
    const empresa_id = req.usuario.empresa_id;
    const { categoria_id, nome, descricao, preco, imagem_url } = req.body;

    if (!categoria_id || !nome || preco == null) {
      return res.status(400).json({
        message: "Categoria, nome e preço são obrigatórios",
      });
    }

    const { data, error } = await supabase
      .from("produtos")
      .insert({
        id: crypto.randomUUID(),
        empresa_id,
        categoria_id,
        nome,
        descricao,
        preco,
        imagem_url,
        ativo: true,
      })
      .select()
      .single();

    if (error) {
      console.log("ERRO SUPABASE AO CRIAR PRODUTO:", error);
      return res.status(500).json({
        message: "Erro ao criar produto",
      });
    }

    return res.status(201).json({
      message: "Produto criado com sucesso",
      produto: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao criar produto",
    });
  }
};

// ======================================
// LISTAR PRODUTOS
// ======================================

exports.listarProdutos = async (req, res) => {
  try {
    const empresa_id = req.usuario.empresa_id;

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
      .eq("empresa_id", empresa_id)
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao listar produtos",
    });
  }
};

// ======================================
// EDITAR PRODUTO
// ======================================

exports.editarProduto = async (req, res) => {
  try {
    const empresa_id = req.usuario.empresa_id;

    const { id } = req.params;

    const { categoria_id, nome, descricao, preco, imagem_url, ativo } =
      req.body;

    const { data, error } = await supabase
      .from("produtos")
      .update({
        categoria_id,
        nome,
        descricao,
        preco,
        imagem_url,
        ativo,
      })
      .eq("id", id)
      .eq("empresa_id", empresa_id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      message: "Produto atualizado",
      produto: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao editar produto",
    });
  }
};

// ======================================
// EXCLUIR PRODUTO
// ======================================

exports.excluirProduto = async (req, res) => {
  try {
    const empresa_id = req.usuario.empresa_id;

    const { id } = req.params;

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresa_id);

    if (error) throw error;

    return res.json({
      message: "Produto removido com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro ao excluir produto",
    });
  }
};
