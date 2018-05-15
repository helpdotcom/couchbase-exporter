'use strict'

const cb = require('../couchbase')
const {createGauge} = require('../prom')
const log = require('../log').child('exporter:bucket')
const config = require('../config')
const ignore_buckets_re = new RegExp(config.get('ignore-buckets'))

const gauges = new Map()
const name_map = new Map()

module.exports = collectBucketMetrics

async function collectBucketMetrics() {
  const start = process.hrtime()

  const buckets = await cb.listBuckets()

  const metas = []
  for (const bucket of buckets) {
    if (ignore_buckets_re.test(bucket.name)) continue
    metas.push(fetchMeta(bucket.name))
  }

  await Promise.all(metas)

  const duration = process.hrtime(start)
  const ms = duration[0] * 1000 + duration[1] / 1e6
  return ms.toFixed(2)
}

const ignore_types = [
  'XDCR'
, 'Query'
]

function shouldIgnoreBlock(block) {
  for (const type of ignore_types) {
    if (block.blockName.includes(type)) return true
  }

  return false
}

const INDEX_BLOCK_RE = /^Index Stats: (.*)$/

function matchIndexBlock(block) {
  const match = block.blockName.match(INDEX_BLOCK_RE)
  if (!match) return null
  return match[1]
}

async function fetchMeta(bucket) {
  const {blocks} = await cb.getBucketStatMeta(bucket)
  for (const block of blocks) {
    const index_name = matchIndexBlock(block)
    if (index_name) {
      await handleIndexBlock({bucket, block, index_name})
      continue
    }

    if (shouldIgnoreBlock(block)) continue
    for (const stat of block.stats) {
      ensureGauge(stat)
    }
  }

  const out = await cb.getBucketBasicStats(bucket)
  const stats = out.op.samples
  for (const [key, sample] of Object.entries(stats)) {
    const gauge = gauges.get(key)
    if (!gauge) continue
    if (!sample.length) continue
    gauge.set({bucket}, sample[sample.length - 1])
  }
}

function ensureGauge(stat, {
  labelNames = ['bucket']
} = {}) {
  if (gauges.has(stat.name)) return
  let name = `couchbase_${stat.name}`
  if (stat.isBytes) {
    name += '_bytes'
  }

  name = name.replace(/\+/g, '_').replace(/\//g, '_')
  if (name_map.has(name)) return
  const help = `(${stat.title}) ${stat.desc}`
  if (!gauges.has(stat.name)) {
    try {
      const gauge = createGauge({
        name
      , help
      , labelNames
      })
      gauges.set(stat.name, gauge)
      name_map.set(name, {stat, gauge})
    } catch (err) {
      log.error(err, {err, name, help, stat})
    }
  }
}

async function handleIndexBlock({bucket, block, index_name}) {
  const rep = `index/${index_name}/`
  const to_parse = []
  for (const orig_stat of block.stats) {
    const stat = Object.assign({}, orig_stat, {
      name: orig_stat.name.replace(rep, 'index_')
    })

    if (!gauges.has(stat.name)) {
      continue
    }

    to_parse.push(fetchAndParseIndexStat({bucket, index_name, stat}))
  }

  await Promise.all(to_parse)
}

async function fetchAndParseIndexStat({bucket, index_name, stat}) {
  const result = await cb.getSingleStat(stat.specificStatsURL)
  for (const [node, stats] of Object.entries(result.nodeStats)) {
    if (stats.length && stats[stats.length - 1] === 'undefined') {
      continue
    }

    const gauge = gauges.get(stat.name)
    const index = index_name
    gauge.set({bucket, index, node}, stats[stats.length - 1])
  }
}
