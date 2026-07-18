const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const supabase = require("../config/supabase");

const { cpf, cnpj } = require("cpf-cnpj-validator");

// ======================================
// CADASTRO
// ======================================

exports.register = async (req, res) => {
  try {
    const { nome, email, telefone, senha, tipo, cliente, empresa, entregador } =
      req.body;

    // ===============================
    // VALIDAR CAMPOS BÁSICOS
    // ===============================

    if (!nome || !email || !senha || !tipo) {
      return res.status(400).json({
        message: "Preencha todos os campos obrigatórios.",
      });
    }

    // ===============================
    // VERIFICAR EMAIL DUPLICADO
    // ===============================

    const { data: usuarioExiste } = await supabase

      .from("usuarios")

      .select("id")

      .eq("email", email)

      .maybeSingle();

    if (usuarioExiste) {
      return res.status(400).json({
        message: "Email já cadastrado.",
      });
    }

    // ===============================
    // HASH SENHA
    // ===============================

    const senhaHash = await bcrypt.hash(senha, 10);

    // ===============================
    // CRIAR USUARIO
    // ===============================

    const {
      data: usuario,

      error,
    } = await supabase

      .from("usuarios")

      .insert({
        nome,

        email,

        telefone,

        senha_hash: senhaHash,

        tipo,
      })

      .select()

      .single();

    if (error) {
      console.log(error);

      return res.status(400).json({
        message: "Erro ao criar usuário.",
      });
    }

    // ===============================
    // PERFIL CLIENTE
    // ===============================

    if (tipo === "cliente") {
      if (cliente?.cpf && !cpf.isValid(cliente.cpf)) {
        return res.status(400).json({
          message: "CPF inválido.",
        });
      }

      const { error: clienteError } = await supabase

        .from("clientes")

        .insert({
          usuario_id: usuario.id,

          cpf: cliente?.cpf || "",

          data_nascimento: cliente?.nascimento || null,
        });

      if (clienteError) {
        console.log(clienteError);

        return res.status(400).json({
          message: "Erro ao criar cliente.",
        });
      }
    }

    // ===============================
    // PERFIL EMPRESA
    // ===============================

    if (tipo === "empresa") {
      if (empresa?.cnpj && !cnpj.isValid(empresa.cnpj)) {
        return res.status(400).json({
          message: "CNPJ inválido.",
        });
      }

      const { error: empresaError } = await supabase

        .from("empresas")

        .insert({
          usuario_id: usuario.id,

          cnpj: empresa?.cnpj || "",

          nome_fantasia: empresa?.nomeFantasia || "",

          categoria: empresa?.categoria || "",
        });

      if (empresaError) {
        console.log(empresaError);

        return res.status(400).json({
          message: "Erro ao criar empresa.",
        });
      }
    }

    // ===============================
    // PERFIL ENTREGADOR
    // ===============================

    if (tipo === "entregador") {
      if (entregador?.cpf && !cpf.isValid(entregador.cpf)) {
        return res.status(400).json({
          message: "CPF inválido.",
        });
      }

      const { error: entregadorError } = await supabase

        .from("entregadores")

        .insert({
          usuario_id: usuario.id,

          cpf: entregador?.cpf || "",

          cnh: entregador?.cnh || "",

          tipo_veiculo: entregador?.tipoVeiculo || "",

          placa: entregador?.placa || "",
        });

      if (entregadorError) {
        console.log(entregadorError);

        return res.status(400).json({
          message: "Erro ao criar entregador.",
        });
      }
    }

    // ===============================
    // RETORNO
    // ===============================

    return res.status(201).json({
      message: "Usuário criado com sucesso.",

      usuario: {
        id: usuario.id,

        nome: usuario.nome,

        email: usuario.email,

        tipo: usuario.tipo,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno no servidor.",
    });
  }
};

// ======================================
// LOGIN
// ======================================

exports.login = async (req, res) => {
  try {
    const {
      email,

      senha,
    } = req.body;

    const { data: usuario } = await supabase

      .from("usuarios")

      .select("*")

      .eq("email", email)

      .maybeSingle();

    if (!usuario) {
      return res.status(401).json({
        message: "Usuário não encontrado.",
      });
    }

    const senhaValida = await bcrypt.compare(
      senha,

      usuario.senha_hash,
    );

    if (!senhaValida) {
      return res.status(401).json({
        message: "Senha incorreta.",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,

        tipo: usuario.tipo,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d",
      },
    );

    return res.json({
      token,

      usuario: {
        id: usuario.id,

        nome: usuario.nome,

        email: usuario.email,

        tipo: usuario.tipo,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Erro interno.",
    });
  }
};
