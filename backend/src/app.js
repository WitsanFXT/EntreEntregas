require("dotenv").config();

const express = require("express");
const cors = require("cors");

const iniciarVerificacaoTimeouts = require("./services/verificarTimeouts");

const authRoutes = require("./routes/authRoutes");
const perfilRoutes = require("./routes/perfilRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const entregadorRoutes = require("./routes/entregadorRoutes");
const entregasRoutes = require("./routes/entregasRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");
const pedidosRoutes = require("./routes/pedidosRoutes");
const tabelaPrecosRoutes = require("./routes/tabelaPrecosRoutes");
const cardapioRoutes = require("./routes/cardapioRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/empresa", empresaRoutes);
app.use("/api/entregador", entregadorRoutes);
app.use("/api/entregas", entregasRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/empresa/pedidos", pedidosRoutes);
app.use("/api/tabela-precos", tabelaPrecosRoutes);
app.use("/api/cardapio", cardapioRoutes);

// Job de expiração/redistribuição de entregas. Não depende mais de
// socket nenhum — só lê/grava no banco, e quem escuta (empresa e
// entregador) recebe as mudanças via Supabase Realtime.
iniciarVerificacaoTimeouts();

app.listen(process.env.PORT || 5500, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT || 5500}`);
});

// Job de expiração
iniciarVerificacaoTimeouts();

module.exports = app;
