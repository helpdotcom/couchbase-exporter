'use strict'

const tap = require('tap')
const nock = require('nock')
const config = require('../../lib/config')
config.set('couchbase-url', 'http://biscuits')

const prom = require('../../lib/prom')
const XDCRCollector = require('../../lib/exporters/xdcr')

tap.test('XDCRCollector()', async (t) => {
  const registry = prom.createRegistry()
  const collector = new XDCRCollector({registry})
  t.equal(collector.registry, registry)

  // Need to mock couchbase.getTasks()
  // and couchbase.getRemoteClusters()
  await t.test('works without xdcr', async (t) => {
    const collector = new XDCRCollector({registry})

    const tasks_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/tasks')
      .reply(200, [])

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/remoteClusters')
      .reply(200, [])

    const result = await collector.collect()
    t.equal(tasks_mock.isDone(), true, 'couchbase.getTasks() called')
    t.equal(cluster_mock.isDone(), true, 'couchbase.getRemoteClusters() called')
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    t.equal(collector.gauges.size, 1, 'only 1 gauge created')
    t.ok(collector.gauges.get('xdcr_running'), 'has xdcr_running gauge')
    collector.cleanup()
    const metric = registry.getSingleMetricAsString('couchbase_xdcr_running')
    const lines = metric.split('\n').filter((item) => {
      return item && item[0] !== '#'
    })
    t.equal(lines.length, 0)
    registry.clear()
  })

  await t.test('works with xdcr running', async (t) => {
    const collector = new XDCRCollector({registry})

    const source = 'source'
    const tasks_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/tasks')
      .reply(200, [
        {
          type: 'rebalance'
        , status: 'notRunning'
        , statusIsStale: false
        }
      , {
          status: 'running'
        , type: 'xdcr'
        , source
        , target: '/remoteClusters/585e252deb2935538d3652f0da3c5acc/buckets'
            + '/target'
        , id: '585e252deb2935538d3652f0da3c5acc/source/target'
        }
      ])

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/remoteClusters')
      .reply(200, [
        {
          deleted: false
        , hostname: '10.0.0.1:9091'
        , name: 'ES 5'
        , uri: '/pools/default/remoteClusters/ES 5.6.3'
        , username: 'couchbase'
        , uuid: '585e252deb2935538d3652f0da3c5acc'
        , validateURI: '/pools/default/remoteClusters/ES 5.6.3?just_validate=1'
        }
      ])

    const result = await collector.collect()
    t.equal(tasks_mock.isDone(), true, 'couchbase.getTasks() called')
    t.equal(cluster_mock.isDone(), true, 'couchbase.getRemoteClusters() called')
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    t.equal(collector.gauges.size, 1, 'only 1 gauge created')
    t.ok(collector.gauges.get('xdcr_running'), 'has xdcr_running gauge')
    collector.cleanup()
    const metric = registry.getSingleMetricAsString('couchbase_xdcr_running')
    const lines = metric.split('\n').filter((item) => {
      return item && item[0] !== '#'
    })
    t.equal(lines[0], formatMetric('couchbase_xdcr_running', {
      source
    , target: 'target'
    , cluster_name: 'ES 5'
    , cluster_hostname: '10.0.0.1:9091'
    }, 1))
    registry.clear()
  })

  await t.test('works with xdcr not running', async (t) => {
    const collector = new XDCRCollector({registry})

    const source = 'source'
    const tasks_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/tasks')
      .reply(200, [
        {
          type: 'rebalance'
        , status: 'notRunning'
        , statusIsStale: false
        }
      , {
          status: 'paused'
        , type: 'xdcr'
        , source
        , target: '/remoteClusters/585e252deb2935538d3652f0da3c5acc/buckets'
            + '/target'
        , id: '585e252deb2935538d3652f0da3c5acc/source/target'
        }
      ])

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/remoteClusters')
      .reply(200, [
        {
          deleted: false
        , hostname: '10.0.0.1:9091'
        , name: 'ES 5'
        , uri: '/pools/default/remoteClusters/ES 5.6.3'
        , username: 'couchbase'
        , uuid: '585e252deb2935538d3652f0da3c5acc'
        , validateURI: '/pools/default/remoteClusters/ES 5.6.3?just_validate=1'
        }
      ])

    const result = await collector.collect()
    t.equal(tasks_mock.isDone(), true, 'couchbase.getTasks() called')
    t.equal(cluster_mock.isDone(), true, 'couchbase.getRemoteClusters() called')
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    t.equal(collector.gauges.size, 1, 'only 1 gauge created')
    t.ok(collector.gauges.get('xdcr_running'), 'has xdcr_running gauge')
    collector.cleanup()
    t.equal(collector.gauges.size, 0)
    const metric = registry.getSingleMetricAsString('couchbase_xdcr_running')
    const lines = metric.split('\n').filter((item) => {
      return item && item[0] !== '#'
    })
    t.equal(lines[0], formatMetric('couchbase_xdcr_running', {
      source
    , target: 'target'
    , cluster_name: 'ES 5'
    , cluster_hostname: '10.0.0.1:9091'
    }, 0))
    registry.clear()
  })

}).catch(tap.threw)

function formatMetric(name, labels, value) {
  const labels_str = Object.entries(labels).map(([key, value]) => {
    return `${key}=${JSON.stringify(value)}`
  }).join(',')

  if (labels_str) {
    return `${name}{${labels_str}} ${value}`
  }
  return `${name} ${value}`
}
