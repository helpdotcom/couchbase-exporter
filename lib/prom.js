'use strict'

const client = require('prom-client')
const CONTENT_TYPE = client.contentType

module.exports = {
  createGauge
, CONTENT_TYPE
, metrics
}

function createGauge({
  name
, help
, labelNames
, aggregator = 'sum'
}) {
  return new client.Gauge({name, help, labelNames, aggregator})
}

function metrics() {
  return client.register.metrics()
}
