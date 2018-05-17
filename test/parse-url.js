'use strict'

const {test} = require('tap')
const parseUrl = require('../lib/parse-url')

test('parseUrl()', (t) => {
  const tests = [
    ['http://abcd', 'http://abcd:8091']
  , ['https://abcd', 'https://abcd:18091']
  , ['http://abcd:3456', 'http://abcd:3456']
  , ['https://abcd:3456', 'https://abcd:3456']
  ]

  for (const [input, exp] of tests) {
    t.equal(parseUrl(input), exp, `parseUrl('${input}') === '${exp}'`)
  }
  t.end()
})
