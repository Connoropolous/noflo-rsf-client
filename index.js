require('dotenv').config()
const express = require('express')
const mustacheExpress = require('mustache-express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const {
    addTestDevPage,
    addSocketListeners
} = require('./participantRegister')
const {
    addFormEndpoint
} = require('./run_graph.js')

app.engine('mustache', mustacheExpress())
app.set('view engine', 'mustache')
app.set('views', __dirname + '/views')

// participant registration
if (process.env.NODE_ENV === 'development') {
    addTestDevPage(app)
}
addSocketListeners(io, app)

// graph running
addFormEndpoint(app)

server.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})