'use strict'

const NAME = 'couchbase-exporter'
const VERSION = require('../package').version

const USER_AGENT = `${NAME}/${VERSION}`

module.exports = {
  NAME
, USER_AGENT
, VERSION
}
