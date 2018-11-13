'use strict'
console.log('banco_abc_router');
const kafka = require('kafka-node');
const mongoose = require('mongoose');
const config = require('./config');
const contratoCtrl = require('./controllers/contrato');
// Conexión a MongoDB
const promise = mongoose.connect(config.db, { useNewUrlParser: true });
// promise.then((db) => {
//     console.log(`MongoDB: ${config.db}`);
// }, (error) => {
//     console.log(`Error al conectar a la base de datos: ${error}`);
// });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Conection error'));
db.once('open', () => {
    console.log(`Connected mongodb: ${config.db}`);
});
// Se crea cliente kafka
const client = new kafka.Client();
// Se crea producer kafka
const HighLevelProducer = kafka.HighLevelProducer,
    producer = new HighLevelProducer(client);
// Se crea consumer al topico router
const Consumer = kafka.Consumer,
    consumer = new Consumer(client,
        [{ topic: 'router', offset: 0 }],
        {
            autoCommit: false
        }
    );

producer.on('ready', function () {
    console.log('Producer is ready');
});

producer.on('error', function (err) {
    console.log('Producer is in error state');
    console.log(err);
});

consumer.on('message', function (message) {
    console.log(message);
    let payloads = [];
    let next = false;
    let invoice = JSON.parse(message.value);
    let convenioId = invoice.invoiceId.toString().substring(0, 4);
    invoice.id = message.offset;
    contratoCtrl.buscarContrato(convenioId).then(contratodb => {
        console.log(contratodb);
        if (contratodb) {
            if (contratodb.tipo == 'SOAP') {
                let soap = contratodb.soap.filter(s => s.tipo == invoice.servicio);
                if (soap && soap.length > 0) {
                    next = true;
                    contratodb.soap = {};
                    contratodb.soap = soap[0];
                }
            } else {
                let rest = contratodb.rest.filter(r => r.tipo == invoice.servicio);
                if (rest && rest.length > 0) {
                    next = true;
                    contratodb.rest = {};
                    contratodb.rest = rest[0];
                }
            }
            invoice.contrato = JSON.stringify(contratodb);
        }
        if (!next) {
            invoice.status = 400;
            invoice.error = `No existe un convenio para la factura: ${invoice.invoiceId}`;
            payloads.push({
                topic: 'response',
                messages: JSON.stringify(invoice)
            });
        } else {
            payloads.push({
                topic: 'broker',
                messages: JSON.stringify(invoice)
            });
        }
        producer.send(payloads, (err, data) => {
            console.log(data);
        });
    }).catch(err => {
        console.error(err);
        invoice.status = 500;
        invoice.error = JSON.stringify(err);
        payloads.push({
            topic: 'response',
            messages: JSON.stringify(invoice)
        });
        producer.send(payloads, (err, data) => {
            console.log(data);
        });
    });
});

consumer.on('error', function (err) {
    console.log('Error:', err);
});

consumer.on('offsetOutOfRange', function (err) {
    console.log('offsetOutOfRange:', err);
});
