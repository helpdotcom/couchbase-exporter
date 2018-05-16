'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')

module.exports = collectClusterMetrics

function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

class ClusterCollector {
  constructor(registry, buckets) {
    this.registry = registry
    this.gauges = new Map()
    this.buckets = buckets
  }

  async getQueryMetrics() {
    if (!this.buckets.length) return null
    const n = this.buckets[0].name
    const base = '/pools/default/buckets'
    return await cb.getSingleStat(`${base}/${n}/stats/query_requests`)
  }

  async collect() {
    const start = process.hrtime()

    {
      const gauge = this.createGauge({
        name: 'couchbase_memory_total_bytes'
      , help: 'The total memory in the cluster in bytes'
      , labelNames: ['node']
      })
      this.gauges.set('memory_total_bytes', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_memory_free_bytes'
      , help: 'The free memory in the cluster in bytes'
      , labelNames: ['node']
      })
      this.gauges.set('memory_free_bytes', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_healthy_node_count'
      , help: 'The total number of healthy nodes in the cluster'
      , labelNames: ['cluster']
      })
      this.gauges.set('healthy_node_count', gauge)
    }

    {
      const labelNames = [
        'cluster'
      , 'node'
      , 'version'
      , 'major'
      , 'minor'
      , 'patch'
      , 'build'
      ]
      const gauge = this.createGauge({
        name: 'couchbase_node_version'
      , help: 'The version of a node'
      , labelNames
      })
      this.gauges.set('node_version', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_n1ql_queries_per_second'
      , help: 'Number of N1QL requests processed per second'
      , labelNames: ['cluster', 'node']
      })
      this.gauges.set('n1ql_queries_per_second', gauge)
    }

    const [stats, query_result] = await Promise.all([
      cb.getCluster()
    , this.getQueryMetrics()
    ])

    const cluster = stats.clusterName || '<unknown>'
    if (query_result) {
      for (const [node, stats] of Object.entries(query_result.nodeStats)) {
        if (stats.length && stats[stats.length - 1] === 'undefined') {
          continue
        }

        const gauge = this.gauges.get('n1ql_queries_per_second')
        gauge.set({cluster, node}, stats[stats.length - 1])
      }
    }
    if (has(stats, 'balanced')) {
      const gauge = this.createGauge({
        name: 'couchbase_cluster_balanced'
      , help: 'Is the cluster balanced? Will be set to 0 if not, otherwise, 1.'
      , labelNames: ['cluster']
      })
      this.gauges.set('cluster_balanced', gauge)
      const balanced_value = stats.balanced ? 1 : 0
      gauge.set({cluster}, balanced_value)
    }

    let healthy_count = 0
    for (const server of stats.nodes) {
      if (server.status === 'healthy') {
        healthy_count += 1
      }

      const memory_total = server.memoryTotal
      const memory_free = server.memoryFree
      const node = server.hostname
      this.gauges.get('memory_total_bytes').set({node}, memory_total)
      this.gauges.get('memory_free_bytes').set({node}, memory_free)

      const version = server.version.split('.')
      const major = version.shift()
      const minor = version.shift()
      const last = version.shift().split('-')
      const patch = last.shift()
      const build = last.join('-')

      this.gauges.get('node_version').set({
        version: server.version
      , major
      , minor
      , patch
      , build
      , node
      , cluster
      }, 1)
    }

    this.gauges.get('healthy_node_count').set({cluster}, healthy_count)
    const duration = process.hrtime(start)
    const ms = duration[0] * 1000 + duration[1] / 1e6
    this.gauges.clear()
    return ms.toFixed(2)
  }

  createGauge(info) {
    const gauge = createGauge(info)
    this.registry.registerMetric(gauge)
    return gauge
  }
}

async function collectClusterMetrics(registry, buckets) {
  const collector = new ClusterCollector(registry, buckets)
  return await collector.collect()
}
