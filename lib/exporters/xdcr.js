'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')
const gauges = new Map()

module.exports = collectXDCRMetrics

class XDCRCollector {
  constructor(registry) {
    this.registry = registry
    this.gauges = new Map()
  }

  async collect() {
    const start = process.hrtime()

    {
      const gauge = this.createGauge({
        name: 'couchbase_xdcr_running'
      , help: '1 if xdcr is running, 0 if not.'
      , labelNames: ['source', 'target', 'cluster_name', 'cluster_hostname']
      })
      this.gauges.set('xdcr_running', gauge)
    }

    const [tasks, remote_clusters] = await Promise.all([
      cb.getTasks()
    , cb.getRemoteClusters()
    ])

    const rcs = new Map()
    for (const cluster of remote_clusters) {
      rcs.set(cluster.uuid, {
        name: cluster.name
      , host: cluster.hostname
      })
    }

    for (const task of tasks) {
      if (task.type !== 'xdcr') continue
      const source = task.source
      const target = task.target.split('/').pop()
      const value = task.status === 'running'
        ? 1
        : 0

      const key = task.id.split('/').shift()
      const {
        name: cluster_name
      , host: cluster_hostname
      } = rcs.get(key)
      this.gauges.get('xdcr_running').set({
        source
      , target
      , cluster_name
      , cluster_hostname
      }, value)
    }

    const duration = process.hrtime(start)
    const ms = duration[0] * 1000 + duration[1] / 1e6
    return ms.toFixed(2)
  }

  createGauge(info) {
    const gauge = createGauge(info)
    this.registry.registerMetric(gauge)
    return gauge
  }
}

async function collectXDCRMetrics(registry) {
  const collector = new XDCRCollector(registry)
  return await collector.collect()
}
