'use strict'

const Contrato = require('../models/contrato');

function buscarContrato(convenioId) {
    return Contrato.findOne({ convenioId: convenioId });
};

module.exports = {
    buscarContrato
};