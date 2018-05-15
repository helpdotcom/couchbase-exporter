'use strict'

const collectBucketMetrics = require('./bucket')
const collectClusterMetrics = require('./cluster')
const collectXDCRMetrics = require('./xdcr')

module.exports = {
  collectBucketMetrics
, collectClusterMetrics
, collectXDCRMetrics
}
