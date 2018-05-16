'use strict'

const exporters = require('./exporters')
const log = require('./log').child('collector')

module.exports = {
  collect
}

async function collect(registry) {
  const start = process.hrtime()
  const [
    bucket_metrics_duration_ms
  , cluster_metrics_duration_ms
  , xdcr_metrics_duration_ms
  ] = await Promise.all([
    exporters.collectBucketMetrics(registry)
  , exporters.collectClusterMetrics(registry)
  , exporters.collectXDCRMetrics(registry)
  ])

  const duration = process.hrtime(start)
  const ms = duration[0] * 1000 + duration[1] / 1e6
  log.info('collected stats', {
    bucket_metrics_duration_ms
  , cluster_metrics_duration_ms
  , xdcr_metrics_duration_ms
  , total_metrics_duration_ms: ms.toFixed(2)
  })
}
