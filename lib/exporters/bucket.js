'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')
const log = require('../log').child('exporter:bucket')
const config = require('../config')
const ignore_buckets_re = new RegExp(config.get('ignore-buckets'))

const ignore_types = [
  'XDCR'
, 'Query'
]

const INDEX_BLOCK_RE = /^Index Stats: (.*)$/
const ignore_stats = [
  'index/num_rows_returned'
, 'index/disk_size'
, 'index/data_size'
, 'index/num_docs_pending+queued'
, 'index/num_docs_indexed'
]

function shouldIgnoreStat(stat) {
  for (const name of ignore_stats) {
    if (stat.name === name) return true
  }

  return false
}

module.exports = class BucketCollector {
  constructor({registry, buckets}) {
    this.registry = registry
    this.buckets = buckets
    this.gauges = new Map()
    this.name_map = new Map()
  }

  cleanup() {
    this.gauges.clear()
    this.name_map.clear()
  }

  async collect() {
    const start = process.hrtime()
    {
      const gauge = this.createGauge({
        name: 'couchbase_index_items_count_total'
      , help: 'Current total indexed document count'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_items_count', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_index_num_rows_returned'
      , help: 'Number of index items scanned by the indexer per second'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_num_rows_returned', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_index_disk_size'
      , help: 'Total disk file size consumed by the index'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_disk_size', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_index_data_size'
      , help: 'Actual data size consumed by the index'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_data_size', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_index_num_docs_pending_queued'
      , help: 'Number of documents pending to be indexed'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_num_docs_pending_queued', gauge)
    }

    {
      const gauge = this.createGauge({
        name: 'couchbase_index_num_docs_indexed'
      , help: 'Number of documents pending to be indexed'
      , labelNames: ['bucket', 'index', 'node']
      })
      this.gauges.set('index_num_docs_indexed', gauge)
    }

    const metas = []
    for (const bucket of this.buckets) {
      if (ignore_buckets_re.test(bucket.name)) continue
      metas.push(this.fetchMeta(bucket.name))
    }

    await Promise.all(metas)

    const duration = process.hrtime(start)
    const ms = duration[0] * 1000 + duration[1] / 1e6
    return ms.toFixed(2)
  }

  async fetchMeta(bucket) {
    const {blocks} = await cb.getBucketStatMeta(bucket)
    const ps = []
    for (const block of blocks) {
      const index_name = matchIndexBlock(block)
      if (index_name) {
        ps.push(this.handleIndexBlock({bucket, block, index_name}))
        continue
      }

      if (shouldIgnoreBlock(block)) continue
      for (const stat of block.stats) {
        if (shouldIgnoreStat(stat)) continue
        this.ensureGauge(stat)
      }
    }

    ps.unshift(cb.getBucketBasicStats(bucket))
    const [out] = await Promise.all(ps)

    const stats = out.op.samples
    for (const [key, sample] of Object.entries(stats)) {
      const gauge = this.gauges.get(key)
      if (!gauge) continue
      if (!sample.length) continue
      gauge.set({bucket}, sample[sample.length - 1])
    }
  }

  createGauge(info) {
    const gauge = createGauge(info)
    this.registry.registerMetric(gauge)
    return gauge
  }

  ensureGauge(stat, {
    labelNames = ['bucket']
  } = {}) {
    if (this.gauges.has(stat.name)) return
    let name = `couchbase_${stat.name}`
    if (stat.isBytes) {
      name += '_bytes'
    }

    name = name.replace(/\+/g, '_').replace(/\//g, '_')
    if (this.name_map.has(name)) return
    const help = `(${stat.title}) ${stat.desc}`
    try {
      const gauge = this.createGauge({
        name
      , help
      , labelNames
      })
      this.gauges.set(stat.name, gauge)
      this.name_map.set(name, {stat, gauge})
    } catch (err) {
      log.error(err, {err, name, help, stat})
    }
  }

  async handleIndexBlock({bucket, block, index_name}) {
    const rep = `index/${index_name}/`
    const to_parse = []
    for (const orig_stat of block.stats) {
      const stat = Object.assign({}, orig_stat, {
        name: orig_stat.name
          .replace(rep, 'index_')
          .replace(/\+/g, '_')
          .replace(/\//g, '_')
      })

      if (!this.gauges.has(stat.name)) {
        continue
      }

      to_parse.push(this.fetchAndParseIndexStat({bucket, index_name, stat}))
    }

    await Promise.all(to_parse)
  }

  async fetchAndParseIndexStat({bucket, index_name, stat}) {
    const result = await cb.getSingleStat(stat.specificStatsURL)
    for (const [node, stats] of Object.entries(result.nodeStats)) {
      if (stats.length && stats[stats.length - 1] === 'undefined') {
        continue
      }

      const gauge = this.gauges.get(stat.name)
      const index = index_name
      gauge.set({bucket, index, node}, stats[stats.length - 1])
    }
  }
}

function shouldIgnoreBlock(block) {
  for (const type of ignore_types) {
    if (block.blockName.includes(type)) return true
  }

  return false
}

function matchIndexBlock(block) {
  const match = block.blockName.match(INDEX_BLOCK_RE)
  if (!match) return null
  return match[1]
}
