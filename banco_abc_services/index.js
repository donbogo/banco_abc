'use strict'
console.log('banco_abc_services');
const kafka = require('kafka-node');
const js2xmlparser = require("js2xmlparser");
const app = require('./app');
const config = require('./config');
//
let peticiones = {};
// Se crea cliente kafka
const client = new kafka.Client();
// Se crea producer kafka
const HighLevelProducer = kafka.HighLevelProducer,
    producer = new HighLevelProducer(client);

producer.on('ready', function () {
    console.log('Producer is ready');
    producer.createTopics(['router', 'broker', 'response'], false, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            consumerServices();
        }
    });
});

producer.on('error', function (err) {
    console.log('Producer is in error state');
    console.log(err);
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'BANCO ABC' });
});

app.get('/findInvoice', (req, res) => {
    let sentMessage = {
        'accept': req.headers.accept,
        'invoiceId': req.query.invoiceId,
        'response': '',
        'servicio': 'findInvoice'
    };
    let payloads = [
        {
            topic: 'router',
            messages: JSON.stringify(sentMessage)
        }
    ];
    producer.send(payloads, (err, data) => {
        console.log(data);
        peticiones[data.router['0']] = res;
    });
});

app.post('/pay/invoice', (req, res) => {
    let sentMessage = {
        'accept': req.headers.accept,
        'invoiceId': req.body.invoiceId,
        'valor': req.body.valor,
        'response': '',
        'servicio': 'payInvoice'
    };
    let payloads = [
        {
            topic: 'router',
            messages: JSON.stringify(sentMessage)
        }
    ];
    producer.send(payloads, (err, data) => {
        console.log(data);
        peticiones[data.router['0']] = res;
    });
});

app.post('/compensate/invoice', (req, res) => {
    let sentMessage = {
        'accept': req.headers.accept,
        'invoiceId': req.body.invoiceId,
        'valor': req.body.invoiceId,
        'response': '',
        'servicio': 'compensateInvoice'
    };
    let payloads = [
        {
            topic: 'router',
            messages: JSON.stringify(sentMessage)
        }
    ];
    producer.send(payloads, (err, data) => {
        console.log(data);
        peticiones[data.router['0']] = res;
    });
});

app.listen(config.PORT, () => {
    console.log(`API REST corriendo en ${config.URL}:${config.PORT}`)
});

function consumerServices() {
    // Se crea consumer al topico response
    const Consumer = kafka.Consumer,
        consumer = new Consumer(client,
            [{ topic: 'response', offset: 0 }],
            {
                autoCommit: false
            }
        );

    consumer.on('message', function (message) {
        console.log(message);
        let invoice = JSON.parse(message.value);
        let res = peticiones[invoice.id];
        if (res) {
            if (invoice.error) {
                res.status(invoice.status).json({ 'message': invoice.error });
            } else {
                let accept = invoice.accept;
                if (accept.includes('json')) {
                    res.status(invoice.status).json(invoice.response);
                } else {
                    res.set('Content-Type', 'text/xml');
                    res.status(invoice.status).send(js2xmlparser.parse('Invoice', invoice.response));
                }
            }
            peticiones[invoice.id] = null;
        }
    });

    consumer.on('error', function (err) {
        console.log('Error:', err);
    });

    consumer.on('offsetOutOfRange', function (err) {
        console.log('offsetOutOfRange:', err);
    });
};