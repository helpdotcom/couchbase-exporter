'use strict'

const BucketCollector = require('./bucket')
const ClusterCollector = require('./cluster')
const XDCRCollector = require('./xdcr')

const collectors = new Map([
  ['bucket', BucketCollector]
, ['cluster', ClusterCollector]
, ['xdcr', XDCRCollector]
])

function getCollector(name) {
  return collectors.get(name)
}

function collect(name) {
  const Klazz = getCollector(name)
  return async function({registry, buckets}) {
    const collector = new Klazz({registry, buckets})
    const result = await collector.collect()
    collector.cleanup()
    return result
  }
}

module.exports = {
  collectBucketMetrics: collect('bucket')
, collectClusterMetrics: collect('cluster')
, collectXDCRMetrics: collect('xdcr')
}
