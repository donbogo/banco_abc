'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: 1024102420, type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));

module.exports = app;