const express = require("express");

const router = express.Router();

const supabase = require("../config/supabase");

// listar bairros e valores
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tabela_precos")
      .select("*")
      .order("bairro");

    if (error) {
      return res.status(500).json({
        error: error.message,
      });
    }

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erro ao buscar tabela de preços",
    });
  }
});

module.exports = router;
