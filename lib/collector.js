'use strict'

const config = require('./config')
const exporters = require('./exporters')
const log = require('./log').child('collector')

class Collector {
  constructor() {
    this._closing = false
    this.interval = null
  }

  start() {
    this
      .collect()
      .catch((err) => {
        log.error(err, {err})
      })
  }

  stop() {
    this._closing = true
    if (this.interval) {
      clearTimeout(this.interval)
      this.interval = null
    }
  }

  async collect() {
    if (this._closing) return

    const start = process.hrtime()
    const [
      bucket_metrics_duration_ms
    , cluster_metrics_duration_ms
    , xdcr_metrics_duration_ms
    ] = await Promise.all([
      exporters.collectBucketMetrics()
    , exporters.collectClusterMetrics()
    , exporters.collectXDCRMetrics()
    ])

    const duration = process.hrtime(start)
    const ms = duration[0] * 1000 + duration[1] / 1e6
    log.info('collected stats', {
      bucket_metrics_duration_ms
    , cluster_metrics_duration_ms
    , xdcr_metrics_duration_ms
    , total_metrics_duration_ms: ms.toFixed(2)
    })

    this.interval = setTimeout(() => {
      this.collect()
    }, config.get('fetch-delay'))
  }
}

module.exports = new Collector()
