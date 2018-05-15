'use strict'

const kittie = require('kittie')
const config = require('./config')
const {NAME, VERSION} = require('./constants')
const level = config.get('loglevel')

const log = new kittie.Log({
  inheritLogLevel: true
, service: {
    name: NAME
  , version: VERSION
  }
})

log.level = level
module.exports = log
