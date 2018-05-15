# couchbase-exporter

A prometheus exporter for couchbase

## Usage

```bash
$ git clone git://github.com/helpdotcom/couchbase-exporter
$ cd couchbase-exporter
$ npm i
$ node index.js
```

To run in a docker container:

```bash
$ docker run -d --name couchbase-exporter \
  --env COUCHBASE_URL="<couchbase url>"   \
  --env COUCHBASE_USER="<couchbase user>" \
  --env COUCHBASE_PASS="<couchbase pass>" \
  evanlucas/couchbase-exporter:1-latest
```

This is currently only tested with couchbase 5.x.

You will need to set some environment variables in order for this to work properly.

The following env vars are available:

| Name | Type | Default | Required | Env Var |
| ---- | ---- | ------- | -------- | ------- |
| `port` | `number` | `7040` | no | `PORT` |
| `couchbase-url` | `string` | `http://localhost:8091` | no | `COUCHBASE_URL` |
| `couchbase-user` | `string` | `username` | no | `COUCHBASE_USER` |
| `couchbase-pass` | `string` | `password` | no | `COUCHBASE_PASS` |
| `fetch-delay` | `number` | `10000` | no | `FETCH_DELAY` |
| `loglevel` | `string` | `info` | no | `LOGLEVEL` |
| `ignore-buckets` | `string` | `^$` | no | `IGNORE_BUCKETS` |

The following log levels are valid and are ordered with decreasing verbosity:

* `silly`
* `verbose`
* `info`
* `http`
* `warn`
* `error`
* `silent`

The value set for the `IGNORE_BUCKETS` environment variable will be
used to create a regular expression.

***

## TODO

1. Make this npm installable
2. Add ability to filter out buckets by name
3. Add ability to filter out stats by name
4. Add bin script
5. Add tests
6. Add grafana dashboards

## Author

Evan Lucas

## License

MIT (See `LICENSE` for more info)
