'use strict'
console.log('banco_abc_broker');
const kafka = require('kafka-node');
const soap = require('soap');
const http = require('http');
const parseString = require('xml2js').parseString;

// Se crea cliente kafka
const client = new kafka.Client();
// Se crea producer kafka
const HighLevelProducer = kafka.HighLevelProducer,
    producer = new HighLevelProducer(client);
// Se crea consumer al topico router
const Consumer = kafka.Consumer,
    consumer = new Consumer(client,
        [{ topic: 'broker', offset: 0 }],
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
    let contrato = JSON.parse(invoice.contrato);
    if (contrato) {
        let url = contrato.url;
        if (contrato.tipo == 'SOAP') {
            let contratoSoap = contrato.soap[0];
            let response = JSON.parse(contratoSoap.result.replace(/'/g, '\"'));
            let args = parse(contratoSoap.args, invoice);
            soap.createClient(url, function (err, client) {
                if (client) {
                    client[contratoSoap.nombre](args, (err, result) => {
                        if (err) {
                            console.error(err);
                        }
                        console.log(result);
                        Object.keys(response).forEach(function (key) {
                            let params = response[key] ? response[key].split('.') : [];
                            let value = null;
                            for (let i = 0; i < params.length; i++) {
                                if (value) {
                                    if (Array.isArray(value[params[i]])) {
                                        value = value[params[i]][0];
                                    } else {
                                        value = value[params[i]];
                                    }
                                } else {
                                    value = result[params[i]];
                                }
                            }
                            if (value) {
                                next = true;
                                response[key] = value;
                            }
                        });
                        if (!next) {
                            invoice.status = 400;
                            invoice.error = `No existe un convenio para la factura: ${invoice.invoiceId}`;
                            payloads.push({
                                topic: 'response',
                                messages: JSON.stringify(invoice)
                            });
                        } else {
                            invoice.status = 200;
                            invoice.response = response;
                            payloads.push({
                                topic: 'response',
                                messages: JSON.stringify(invoice)
                            });
                        }
                        producer.send(payloads, (err, data) => {
                            console.log(data);
                        });
                    });
                } else {
                    invoice.status = 400;
                    invoice.error = `No existe un convenio para la factura: ${invoice.invoiceId}`;
                    payloads.push({
                        topic: 'response',
                        messages: JSON.stringify(invoice)
                    });
                    producer.send(payloads, (err, data) => {
                        console.log(data);
                    });
                }
            });
        } else if (contrato.tipo == 'REST') {
            let rest = contrato.rest[0];
            let path = rest.baseUrl;
            path = urlQuery(parse(rest.query, invoice), path);
            path = urlPath(parse(rest.path, invoice), path);
            let body = parse(rest.body, invoice);
            const options = {
                hostname: url,
                port: rest.port,
                path: path,
                method: rest.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            const req = http.request(options, (res) => {
                let response = {};
                let isxml = res.headers['content-type'] && res.headers['content-type'].includes('xml');
                res.on('data', (result) => {
                    let data = {};
                    if (isxml) {
                        response = rest.resultXml ? JSON.parse(rest.resultXml.replace(/'/g, '\"')) : {};
                        parseString(result, function (err, xml) {
                            data = xml;
                        });
                        Object.keys(response).forEach(function (key) {
                            let params = response[key] ? response[key].split('.') : [];
                            let value = null;
                            for (let i = 0; i < params.length; i++) {
                                if (value) {
                                    if (Array.isArray(value[params[i]])) {
                                        value = value[params[i]][0];
                                    } else {
                                        value = value[params[i]];
                                    }
                                } else {
                                    value = data[params[i]];
                                }
                            }
                            if (value) {
                                next = true;
                                response[key] = value;
                            }
                        });
                    } else {
                        let isjson = res.headers['content-type'] && res.headers['content-type'].includes('json');
                        if (isjson) {
                            response = JSON.parse(rest.result.replace(/'/g, '\"'))
                            data = JSON.parse(result);
                            Object.keys(response).forEach(function (key) {
                                let params = response[key] ? response[key].split('.') : [];
                                let value = null;
                                for (let i = 0; i < params.length; i++) {
                                    if (value) {
                                        if (Array.isArray(value[params[i]])) {
                                            value = value[params[i]][0];
                                        } else {
                                            value = value[params[i]];
                                        }
                                    } else {
                                        value = data[params[i]];
                                    }
                                }
                                if (value) {
                                    next = true;
                                    response[key] = value;
                                }
                            });
                        }
                    }
                    if (!next) {
                        invoice.status = 400;
                        invoice.error = `No existe un convenio para la factura: ${invoice.invoiceId}`;
                        payloads.push({
                            topic: 'response',
                            messages: JSON.stringify(invoice)
                        });
                    } else {
                        invoice.status = 200;
                        invoice.response = response;
                        payloads.push({
                            topic: 'response',
                            messages: JSON.stringify(invoice)
                        });
                    }
                    producer.send(payloads, (err, data) => {
                        console.log(data);
                    });
                });
                res.on('end', () => {
                    console.log('No more data in response.');
                });
            });
            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
            });
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        }
    }
});

consumer.on('error', function (err) {
    console.log('Error:', err);
});

consumer.on('offsetOutOfRange', function (err) {
    console.log('offsetOutOfRange:', err);
});

function parse(args, data) {
    let isBody = false;
    let params = JSON.parse(args.replace(/'/g, '\"'));
    for (let p in params) {
        if (typeof params[p] == 'object') {
            isBody = getData(params[p], data);
        } else if (data[params[p]]) {
            isBody = true;
            params[p] = data[params[p]];
        }
    }
    return isBody ? params : null;
};

function getData(params, data, isBody) {
    for (let p in params) {
        isBody = true;
        if (typeof params[p] == 'object') {
            getData(params[p], data);
        } else if (data[params[p]]) {
            isBody = true;
            params[p] = data[params[p]];
            return isBody;
        }
    }
};

function urlQuery(query, url) {
    Object.keys(query).forEach(function (key) {
        url = url + '/' + query[key];
    });
    return url;
};

function urlPath(path, url) {
    let index = 0;
    if (path) {
        Object.keys(path).forEach(function (key) {
            if (index == 0) {
                url = url + '?';
            } else {
                url = url + '&';
            }
            url = url + key + '=' + path[key];
            index++;
        });
    }
    return url;
};
