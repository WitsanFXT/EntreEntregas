const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const {
    cpf,
    cnpj
} = require("cpf-cnpj-validator");

exports.register = async (req, res) => {

    console.log("Cadastro recebido");

    return res.status(201).json({
        message: "Cadastro funcionando"
    });

};

exports.login = async (req, res) => {

    console.log("Login recebido");

    return res.status(200).json({
        message: "Login funcionando"
    });

};