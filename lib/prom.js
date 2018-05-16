'use strict'

const client = require('prom-client')
const CONTENT_TYPE = client.contentType

module.exports = {
  createGauge
, CONTENT_TYPE
, createRegistry
}

function createGauge({
  name
, help
, labelNames
, aggregator = 'sum'
}) {
  const registers = []
  return new client.Gauge({name, help, labelNames, aggregator, registers})
}

function createRegistry() {
  return new client.Registry()
}
