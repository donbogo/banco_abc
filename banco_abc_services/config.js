'use strict'

module.exports = {
    URL: process.env.URL || 'http://127.0.0.1',
    PORT: process.env.PORT || 3002,
    KAFKA_HOST: process.env.KAFKA_HOST || 'localhost:2181'
}