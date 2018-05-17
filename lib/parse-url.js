'use strict'

const URL = require('url').URL

module.exports = function parseUrl(input) {
  const url = new URL(input)
  if (url.port === '') {
    if (url.protocol === 'http:') {
      url.port = '8091'
    } else if (url.protocol === 'https:') {
      url.port = '18091'
    }
  }

  const output = url.toString()
  if (output[output.length - 1] === '/') {
    return output.slice(0, -1)
  }

  return output
}
