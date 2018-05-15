'use strict'

const http = require('http')
const config = require('./lib/config')
const {metrics, CONTENT_TYPE} = require('./lib/prom')
const {NAME, VERSION} = require('./lib/constants')
const log = require('./lib/log').child('server')

const server = http.createServer((req, res) => {
  if (req.url === '/health_check') {
    return handleHealthCheck(req, res)
  }

  if (req.url === '/metrics') {
    return handleMetrics(req, res)
  }

  res.writeHead(404, {
    'content-type': 'application/json'
  })

  res.end(JSON.stringify({
    message: 'Not found'
  }))
})

function handleHealthCheck(req, res) {
  res.writeHead(200, {
    'content-type': 'application/json'
  })
  res.end(JSON.stringify({
    name: NAME
  , version: VERSION
  }))
}

function handleMetrics(req, res) {
  res.writeHead(200, {
    'content-type': CONTENT_TYPE
  })

  res.end(metrics())
}

const collector = require('./lib/collector')
collector.start()

server.listen(config.get('port'), () => {
  log.info('listen', config.get('port'))
})

server.on('clientError', (err, socket) => {
  log.error(err, {
    err
  , message: 'clientError'
  })

  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
})

server.on('error', (err) => {
  log.error(err, {err})
})

process.on('SIGTERM', () => {
  log.warn('signal', 'SIGTERM')
  server.close()
  collector.stop()
})
