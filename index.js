'use strict'

const http = require('http')
const config = require('./lib/config')
const {metrics, CONTENT_TYPE} = require('./lib/prom')
const {NAME, VERSION} = require('./lib/constants')
const collector = require('./lib/collector')
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

async function handleMetrics(req, res) {
  try {
    await collector.collect()
    res.writeHead(200, {
      'content-type': CONTENT_TYPE
    })

    res.end(metrics())
  } catch (err) {
    log.error(err, {
      err
    , message: 'failed to collect metrics'
    })
    res.writeHead(500)
    res.end('Unable to fetch metrics')
  }
}

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

process.once('SIGTERM', () => {
  log.warn('signal', 'SIGTERM')
  server.close()
})

process.once('SIGINT', () => {
  log.warn('signal', 'SIGINT')
  server.close()
})
