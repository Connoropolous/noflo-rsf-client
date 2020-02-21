#!/usr/bin/env node

const start = require('./dist/index').default
start()
  .then(() => {
    console.log('rsf-http-register listening on port ' + process.env.PORT)
  })
  .catch(e => {
    console.log('There was an error: ' + e.toString())
  })
