'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var RestSchema = new Schema({
    method: { type: String, lowercase: true },
    headers: { type: String, lowercase: true },
    qs: { type: String, lowercase: true },
    body: { type: String, lowercase: true },
    tipo: { type: String, enum: ['findInvoice', 'payInvoice', 'compensateInvoice'] }
});
var SoapSchema = new Schema({
    nombre: { type: String, lowercase: true },
    args: { type: String, lowercase: true },
    result: { type: String, lowercase: true },
    tipo: { type: String, enum: ['findInvoice', 'payInvoice', 'compensateInvoice'] }
});

const ContratoSchema = Schema({
    convenioId: { type: String },
    tipo: { type: String, enum: ['REST', 'SOAP'] },
    url: { type: String, lowercase: true },
    rest: [RestSchema],
    soap: [SoapSchema]
});

module.exports = mongoose.model('Contrato', ContratoSchema);
