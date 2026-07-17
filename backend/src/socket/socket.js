const { Server } = require("socket.io");

let io = null;

function iniciarSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket conectado:", socket.id);

    socket.on("entrar_entregador", (entregadorId) => {
      socket.join(`entregador:${entregadorId}`);

      console.log(`Entregador ${entregadorId} entrou na sala`);
    });

    socket.on("disconnect", () => {
      console.log("Socket desconectado:", socket.id);
    });
  });

  const iniciarVerificacaoTimeouts = require("../services/VerificarTimeouts");
  iniciarVerificacaoTimeouts(io);

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO não iniciado");
  }

  return io;
}

module.exports = {
  iniciarSocket,
  getIO,
};
