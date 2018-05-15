'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')
const gauges = new Map()

module.exports = collectClusterMetrics

{
  const gauge = createGauge({
    name: 'couchbase_cluster_balanced'
  , help: 'Is the cluster balanced? Will be set to 0 if not, otherwise, 1.'
  , labelNames: ['cluster']
  })
  gauges.set('cluster_balanced', gauge)
}

{
  const gauge = createGauge({
    name: 'couchbase_memory_total_bytes'
  , help: 'The total memory in the cluster in bytes'
  , labelNames: ['node']
  })
  gauges.set('memory_total_bytes', gauge)
}

{
  const gauge = createGauge({
    name: 'couchbase_memory_free_bytes'
  , help: 'The free memory in the cluster in bytes'
  , labelNames: ['node']
  })
  gauges.set('memory_free_bytes', gauge)
}

{
  const gauge = createGauge({
    name: 'couchbase_healthy_node_count'
  , help: 'The total number of healthy nodes in the cluster'
  , labelNames: ['cluster']
  })
  gauges.set('healthy_node_count', gauge)
}

{
  const gauge = createGauge({
    name: 'couchbase_node_version'
  , help: 'The version of a node'
  , labelNames: ['node', 'version', 'major', 'minor', 'patch', 'build']
  })
  gauges.set('node_version', gauge)
}

async function collectClusterMetrics() {
  const start = process.hrtime()

  const stats = await cb.getCluster()

  const cluster = stats.clusterName || '<unknown>'
  const balanced_value = stats.balanced ? 1 : 0
  gauges.get('cluster_balanced').set({cluster}, balanced_value)

  let healthy_count = 0
  for (const server of stats.nodes) {
    if (server.status === 'healthy') {
      healthy_count += 1
    }

    const memory_total = server.memoryTotal
    const memory_free = server.memoryFree
    const node = server.hostname
    gauges.get('memory_total_bytes').set({node}, memory_total)
    gauges.get('memory_free_bytes').set({node}, memory_free)

    const version = server.version.split('.')
    const major = version.shift()
    const minor = version.shift()
    const last = version.shift().split('-')
    const patch = last.shift()
    const build = last.join('-')

    gauges.get('node_version').set({
      version: server.version
    , major
    , minor
    , patch
    , build
    , node
    }, 1)
  }

  gauges.get('healthy_node_count').set({cluster}, healthy_count)
  const duration = process.hrtime(start)
  const ms = duration[0] * 1000 + duration[1] / 1e6
  return ms.toFixed(2)
}
