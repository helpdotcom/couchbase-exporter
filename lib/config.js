'use strict'

const parseUrl = require('./parse-url')

const config = new Map()

const string = getType('STRING')
const number = getType('NUMBER')

const env = [
  number('port', 7040)
, string('couchbase-url', 'http://localhost:8091')
, string('couchbase-user', 'username')
, string('couchbase-pass', 'password')
, number('fetch-delay', 10000)
, string('loglevel', 'info')
, string('ignore-buckets', '^$')
]

for (const item of env) {
  switch (item.type) {
    case 'STRING':
      validateString(item)
      break
    case 'NUMBER':
      validateNumber(item)
      break
    default:
      throw new Error(`Invalid env var type: "${item.type}"`)
  }
}

const couchbase_url = config.get('couchbase-url')
config.set('couchbase-url', parseUrl(couchbase_url))

module.exports = config

function checkEnvVar(item) {
  const env = item.env
  if (!has(process.env, env)) {
    if (!item.required) {
      if (has(item, 'default')) {
        process.env[item.env] = item.default
        return
      }
    }

    throw new Error(`Missing env var: "${env}".`)
  }
}

function validateString(item) {
  checkEnvVar(item)

  config.set(item.name, process.env[item.env])
}

function validateNumber(item) {
  checkEnvVar(item)

  const value = +process.env[item.env]
  if (isNaN(value) || typeof value !== 'number') {
    const type = typeof process.env[item.env]
    const er = new Error(`Expected ${item.env} to be a number. Got "${type}".`)
    throw er
  }

  config.set(item.name, value)
}

function getType(type) {
  return function(name, def, required = false) {
    const env = name.replace(/\-/g, '_').toUpperCase()
    return {
      name
    , type
    , required
    , default: def
    , env
    }
  }
}

function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}
