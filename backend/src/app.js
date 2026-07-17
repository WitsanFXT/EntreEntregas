require("dotenv").config();

const express = require("express");

const cors = require("cors");
const http = require("http");

const { iniciarSocket } = require("./socket/socket");

const authRoutes = require("./routes/authRoutes");
const perfilRoutes = require("./routes/perfilRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const entregadorRoutes = require("./routes/entregadorRoutes");
const entregasRoutes = require("./routes/entregasRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");

const app = express();

const server = http.createServer(app);

iniciarSocket(server);

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

server.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});

module.exports = app;
