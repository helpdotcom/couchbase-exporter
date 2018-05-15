'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')
const gauges = new Map()

module.exports = collectXDCRMetrics

{
  const gauge = createGauge({
    name: 'couchbase_xdcr_running'
  , help: '1 if xdcr is running, 0 if not.'
  , labelNames: ['source', 'target', 'cluster_name', 'cluster_hostname']
  })
  gauges.set('xdcr_running', gauge)
}

async function collectXDCRMetrics() {
  const start = process.hrtime()

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
    gauges.get('xdcr_running').set({
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
