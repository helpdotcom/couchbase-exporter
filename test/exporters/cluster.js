'use strict'

const tap = require('tap')
const nock = require('nock')
const config = require('../../lib/config')
config.set('couchbase-url', 'http://biscuits')

const prom = require('../../lib/prom')
const ClusterCollector = require('../../lib/exporters/cluster')

tap.test('ClusterCollector()', async (t) => {
  const registry = prom.createRegistry()
  const buckets = [
    { name: 'migrations' }
  ]
  const collector = new ClusterCollector({registry, buckets})
  t.equal(collector.registry, registry)
  t.equal(collector.buckets, buckets)

  const getMetric = (name) => {
    const metric = registry.getSingleMetricAsString(`couchbase_${name}`)
    const lines = metric.split('\n').filter((item) => {
      return item && item[0] !== '#'
    })
    return lines
  }

  await t.test('includes query metrics if buckets are present', async (t) => {
    const buckets = [
      { name: 'migrations' }
    ]
    const collector = new ClusterCollector({registry, buckets})
    const query_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/buckets/migrations/stats/query_requests')
      .reply(200, {
        samplesCount: 60
      , isPersistent: true
      , lastTStamp: 1526572804312
      , interval: 1000
      , timestamp: []
      , nodeStats: {
          'node-1:8091': [
            1
          ]
        , 'node-2:8091': [
            2
          ]
        , 'node-3:8091': [
            'undefined'
          ]
        }
      })

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default')
      .reply(200, {
        balanced: true
      , clusterName: 'biscuits'
      , nodes: [
          {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-1:8091'
          , version: '5.0.1-5003-enterprise'
          }
        , {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-2:8091'
          , version: '5.0.1-5003-enterprise'
          }
        ]
      })

    const result = await collector.collect()
    t.equal(query_mock.isDone(), true, 'made req to get query stats')
    t.equal(cluster_mock.isDone(), true, 'called cb.getCluster()')
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    const expected_gauges = [
      'memory_total_bytes'
    , 'memory_free_bytes'
    , 'healthy_node_count'
    , 'node_version'
    , 'n1ql_queries_per_second'
    , 'cluster_balanced'
    ]

    for (const name of expected_gauges) {
      t.ok(collector.gauges.has(name), `has ${name} gauge`)
    }

    {
      const metric = getMetric('memory_total_bytes')
      t.deepEqual(metric, [
        formatMetric('couchbase_memory_total_bytes', {
          node: 'node-1:8091'
        }, 12630355968)
      , formatMetric('couchbase_memory_total_bytes', {
          node: 'node-2:8091'
        }, 12630355968)
      ])
    }

    {
      const metric = getMetric('memory_free_bytes')
      t.deepEqual(metric, [
        formatMetric('couchbase_memory_free_bytes', {
          node: 'node-1:8091'
        }, 3743277056)
      , formatMetric('couchbase_memory_free_bytes', {
          node: 'node-2:8091'
        }, 3743277056)
      ])
    }

    {
      const metric = getMetric('healthy_node_count')
      t.deepEqual(metric, [
        formatMetric('couchbase_healthy_node_count', {
          cluster: 'biscuits'
        }, 2)
      ])
    }
    collector.cleanup()
    registry.clear()
  })

  await t.test('includes query metrics if buckets are present', async (t) => {
    const buckets = [
      { name: 'migrations' }
    ]
    const collector = new ClusterCollector({registry, buckets})
    const query_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/buckets/migrations/stats/query_requests')
      .reply(200, {
        samplesCount: 60
      , isPersistent: true
      , lastTStamp: 1526572804312
      , interval: 1000
      , timestamp: []
      , nodeStats: {
          'node-1:8091': [
            1
          ]
        , 'node-2:8091': [
            2
          ]
        , 'node-3:8091': [
            'undefined'
          ]
        }
      })

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default')
      .reply(200, {
        balanced: false
      , clusterName: 'biscuits'
      , nodes: [
          {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-1:8091'
          , version: '5.0.1-5003-enterprise'
          }
        , {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'unhealthy'
          , hostname: 'node-2:8091'
          , version: '5.0.1-5003-enterprise'
          }
        ]
      })

    const result = await collector.collect()
    t.equal(query_mock.isDone(), true, 'made req to get query stats')
    t.equal(cluster_mock.isDone(), true, 'called cb.getCluster()')
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    const expected_gauges = [
      'memory_total_bytes'
    , 'memory_free_bytes'
    , 'healthy_node_count'
    , 'node_version'
    , 'n1ql_queries_per_second'
    , 'cluster_balanced'
    ]

    for (const name of expected_gauges) {
      t.ok(collector.gauges.has(name), `has ${name} gauge`)
    }

    {
      const metric = getMetric('memory_total_bytes')
      t.deepEqual(metric, [
        formatMetric('couchbase_memory_total_bytes', {
          node: 'node-1:8091'
        }, 12630355968)
      , formatMetric('couchbase_memory_total_bytes', {
          node: 'node-2:8091'
        }, 12630355968)
      ])
    }

    {
      const metric = getMetric('memory_free_bytes')
      t.deepEqual(metric, [
        formatMetric('couchbase_memory_free_bytes', {
          node: 'node-1:8091'
        }, 3743277056)
      , formatMetric('couchbase_memory_free_bytes', {
          node: 'node-2:8091'
        }, 3743277056)
      ])
    }

    {
      const metric = getMetric('healthy_node_count')
      t.deepEqual(metric, [
        formatMetric('couchbase_healthy_node_count', {
          cluster: 'biscuits'
        }, 1)
      ])
    }

    {
      const metric = getMetric('cluster_balanced')
      t.deepEqual(metric, [
        formatMetric('couchbase_cluster_balanced', {
          cluster: 'biscuits'
        }, 0)
      ])
    }
    collector.cleanup()
    registry.clear()
  })

  await t.test('excludes query metrics if no buckets', async (t) => {
    const buckets = []
    const collector = new ClusterCollector({registry, buckets})
    const query_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/buckets/migrations/stats/query_requests')
      .reply(200, {
        samplesCount: 60
      , isPersistent: true
      , lastTStamp: 1526572804312
      , interval: 1000
      , timestamp: []
      , nodeStats: {
          'node-1:8091': [
            1
          ]
        , 'node-2:8091': [
            2
          ]
        , 'node-3:8091': [
            'undefined'
          ]
        }
      })

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default')
      .reply(200, {
        balanced: true
      , clusterName: 'biscuits'
      , nodes: [
          {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-1:8091'
          , version: '5.0.1-5003-enterprise'
          }
        , {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-2:8091'
          , version: '5.0.1-5003-enterprise'
          }
        ]
      })

    const result = await collector.collect()
    t.equal(query_mock.isDone(), false, 'made req to get query stats')
    t.equal(cluster_mock.isDone(), true, 'called cb.getCluster()')
    nock.cleanAll()
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    const expected_gauges = [
      'memory_total_bytes'
    , 'memory_free_bytes'
    , 'healthy_node_count'
    , 'node_version'
    , 'n1ql_queries_per_second'
    , 'cluster_balanced'
    ]

    for (const name of expected_gauges) {
      t.ok(collector.gauges.has(name), `has ${name} gauge`)
    }

    collector.cleanup()
    registry.clear()
  })

  await t.test('balanced is ignored if missing property', async (t) => {
    const buckets = []
    const collector = new ClusterCollector({registry, buckets})
    const query_mock = nock(config.get('couchbase-url'))
      .get('/pools/default/buckets/migrations/stats/query_requests')
      .reply(200, {
        samplesCount: 60
      , isPersistent: true
      , lastTStamp: 1526572804312
      , interval: 1000
      , timestamp: []
      , nodeStats: {
          'node-1:8091': [
            1
          ]
        , 'node-2:8091': [
            2
          ]
        , 'node-3:8091': [
            'undefined'
          ]
        }
      })

    const cluster_mock = nock(config.get('couchbase-url'))
      .get('/pools/default')
      .reply(200, {
        clusterName: ''
      , nodes: [
          {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-1:8091'
          , version: '5.0.1-5003-enterprise'
          }
        , {
            memoryTotal: 12630355968
          , memoryFree: 3743277056
          , clusterMembership: 'active'
          , status: 'healthy'
          , hostname: 'node-2:8091'
          , version: '5.0.1-5003-enterprise'
          }
        ]
      })

    const result = await collector.collect()
    t.equal(query_mock.isDone(), false, 'made req to get query stats')
    t.equal(cluster_mock.isDone(), true, 'called cb.getCluster()')
    nock.cleanAll()
    t.match(result, /([\d]+)\.\d\d/, 'returns the duration')
    const expected_gauges = [
      'memory_total_bytes'
    , 'memory_free_bytes'
    , 'healthy_node_count'
    , 'node_version'
    , 'n1ql_queries_per_second'
    , 'cluster_balanced'
    ]

    for (const name of expected_gauges) {
      if (name === 'cluster_balanced') {
        t.notOk(collector.gauges.has(name), `does not have ${name} gauge`)
      } else {
        t.ok(collector.gauges.has(name), `has ${name} gauge`)
      }
    }

    {
      const metric = getMetric('healthy_node_count')
      t.deepEqual(metric, [
        formatMetric('couchbase_healthy_node_count', {
          cluster: '<unknown>'
        }, 2)
      ])
    }

    collector.cleanup()
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
