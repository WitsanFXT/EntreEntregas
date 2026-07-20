const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const lojaPath = path.resolve(
  __dirname,
  "../../../frontend/public/loja/index.html",
);

router.get("/:empresaId", (req, res) => {
  console.log("🛒 Servindo loja para:", req.params.empresaId);

  if (fs.existsSync(lojaPath)) {
    res.sendFile(lojaPath);
  } else {
    res.status(404).json({
      error: "Página da loja não encontrada",
      path: lojaPath,
    });
  }
});

module.exports = router;
