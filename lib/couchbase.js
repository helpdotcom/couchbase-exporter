'use strict'

const {promisify} = require('util')
const Request = require('request')
const {USER_AGENT} = require('./constants')
const config = require('./config')
const log = require('./log').child('couchbase')

const makeRequest = promisify(Request.defaults({
  json: true
, headers: {
    'user-agent': USER_AGENT
  }
}))

class Couchbase {
  constructor({base, auth}) {
    this.base = base
    this.auth = auth
  }

  async getRemoteClusters() {
    const path = '/pools/default/remoteClusters'
    const {body} = await this.request({path})
    return body
  }

  async getTasks() {
    const path = '/pools/default/tasks'
    const {body} = await this.request({path})
    return body
  }

  async getCluster() {
    const path = '/pools/default'
    const query = {
      waitChange: '0'
    }
    const {body} = await this.request({path, query})
    return body
  }

  async getSingleStat(path) {
    const {body} = await this.request({path})
    return body
  }

  async getBucketStatMeta(bucket) {
    const path = `/pools/default/buckets/${bucket}/statsDirectory`
    // This will include indexes, xdcr, and query related stats as well
    const query = {
      addi: '"all"'
    , addq: '1'
    }

    const {body} = await this.request({path, query})
    return body
  }

  async listBuckets() {
    const path = '/pools/default/buckets'
    const {body} = await this.request({path})
    return body
  }

  async getBucketBasicStats(bucket) {
    const path = `/pools/default/buckets/${bucket}/stats`
    const {body} = await this.request({path})
    return body
  }

  async request({
    path
  , query
  , method = 'GET'
  , status_code = 200
  , body
  }) {
    log.silly('request start', {path})
    const qs = query
    const uri = this.base + path
    const auth = this.auth
    const start = process.hrtime()
    const res = await makeRequest({
      uri
    , auth
    , qs
    , method
    , body
    })

    const {body: response_body} = res
    if (res.statusCode !== status_code) {
      const msg = `Expected status code: ${status_code}. Got ${res.statusCode}`
      const er = new Error(msg)
      er.meta = {
        response_body
      , path
      , method
      , actual_status_code: res.statusCode
      , expected_status_code: status_code
      }
      throw er
    }

    const duration = process.hrtime(start)
    const ms = duration[0] * 1000 + duration[1] / 1e6
    log.verbose('couchbase stats call', {
      path
    , duration_ms: ms
    })
    log.silly('request end', {path})
    return {res, body: response_body}
  }
}

module.exports = new Couchbase({
  base: config.get('couchbase-url')
, auth: {
    user: config.get('couchbase-user')
  , pass: config.get('couchbase-pass')
  }
})
