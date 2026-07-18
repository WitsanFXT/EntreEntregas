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

// Job de expiração/redistribuição de entregas. Não depende mais de
// socket nenhum — só lê/grava no banco, e quem escuta (empresa e
// entregador) recebe as mudanças via Supabase Realtime.
iniciarVerificacaoTimeouts();

console.log("SUPABASE KEY PREFIX:");
console.log(process.env.SUPABASE_KEY?.substring(0, 20));

app.listen(process.env.PORT || 5500, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT || 5500}`);
});

module.exports = app;
