require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Middlewares
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

// ======================================
// ARQUIVOS ESTÁTICOS
// ======================================

const frontendPath = path.resolve(__dirname, "../../frontend");
console.log("📁 Frontend path:", frontendPath);
app.use(express.static(frontendPath));

const lojaPath = path.resolve(__dirname, "../../frontend/public/loja");
console.log("📁 Loja path:", lojaPath);
app.use("/loja", express.static(lojaPath));

// ======================================
// ROTA PARA O APP PÚBLICO (raiz)
// ======================================

const appPath = path.resolve(frontendPath, "public/index.html");
console.log("📄 App path:", appPath);
console.log("📄 App existe?", fs.existsSync(appPath));

app.get("/", (req, res) => {
  console.log("🏠 Acessando página inicial do app");
  if (fs.existsSync(appPath)) {
    res.sendFile(appPath);
  } else {
    res.status(404).send(`<h1>❌ Página do app não encontrada</h1>`);
  }
});

// ======================================
// 🔥 ROTA DA LOJA - DEVE VIR ANTES DO FALLBACK
// ======================================

const lojaHtmlPath = path.resolve(lojaPath, "index.html");
console.log("📄 Loja HTML:", lojaHtmlPath);
console.log("📄 Loja existe?", fs.existsSync(lojaHtmlPath));

app.get("/loja/:empresaId", (req, res) => {
  console.log("🛒 Acessando loja para empresa:", req.params.empresaId);

  // Verifica se o arquivo existe
  if (fs.existsSync(lojaHtmlPath)) {
    res.sendFile(lojaHtmlPath);
  } else {
    res.status(404).send(`
      <h1>❌ Página da loja não encontrada</h1>
      <p>Caminho: ${lojaHtmlPath}</p>
    `);
  }
});

// ======================================
// ROTA DO DASHBOARD
// ======================================

const dashboardPath = path.resolve(frontendPath, "empresa/dashboard.html");
console.log("📄 Dashboard path:", dashboardPath);
console.log("📄 Dashboard existe?", fs.existsSync(dashboardPath));

app.get("/dashboard", (req, res) => {
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).send(`<h1>❌ Dashboard não encontrado</h1>`);
  }
});

// ======================================
// ROTAS DA API
// ======================================

const authRoutes = require("./routes/authRoutes");
const perfilRoutes = require("./routes/perfilRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const entregadorRoutes = require("./routes/entregadorRoutes");
const entregasRoutes = require("./routes/entregasRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");
const financeiroEmpresaRoutes = require("./routes/financeiroEmpresaRoutes");
const pedidosRoutes = require("./routes/pedidosRoutes");
const tabelaPrecosRoutes = require("./routes/tabelaPrecosRoutes");
const cardapioRoutes = require("./routes/cardapioRoutes");
const publicRoutes = require("./routes/Publicoroutes");

// ======================================
// REGISTRAR ROTAS - SEM DUPLICATAS
// ======================================

app.use("/api/auth", authRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/empresa", empresaRoutes);
app.use("/api/entregador", entregadorRoutes);
app.use("/api/entregas", entregasRoutes);
app.use("/api/financeiro", financeiroEmpresaRoutes);
app.use("/api/financeiro/entregador", financeiroRoutes);
app.use("/api/empresa/pedidos", pedidosRoutes);
app.use("/api/tabela-precos", tabelaPrecosRoutes);
app.use("/api/cardapio", cardapioRoutes);
app.use("/api/publico", publicRoutes);

// ======================================
// ROTA DE FALLBACK
// ======================================

app.use((req, res) => {
  console.log("❌ Rota não encontrada:", req.url);
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.url,
  });
});

// ======================================
// INICIAR SERVIDOR
// ======================================

const iniciarVerificacaoTimeouts = require("./services/verificarTimeouts");
iniciarVerificacaoTimeouts();

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Frontend: ${frontendPath}`);
  console.log(`📁 Loja: ${lojaPath}`);
  console.log(`📍 App: http://localhost:${PORT}/`);
  console.log(`📍 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🛒 Loja: http://localhost:${PORT}/loja/SEU_ID`);
  console.log(
    `📡 API: http://localhost:${PORT}/api/publico/empresas/ID/cardapio\n`,
  );
});

module.exports = app;
