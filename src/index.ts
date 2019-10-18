import * as dotenv from 'dotenv'
dotenv.config()
import * as express from 'express'
import * as mustacheExpress from 'mustache-express'
import * as http from 'http'
import * as socketIo from 'socket.io'
const app = express()
const server = http.createServer(app)
const io = socketIo(server)
import {
  addTestDevPage,
  addSocketListeners
} from './participantRegister'
import {
  addGraphEndpoints
} from './run_graph'

app.engine('mustache', mustacheExpress())
app.set('view engine', 'mustache')
app.set('views', __dirname + '/views')

// participant registration
if (process.env.NODE_ENV === 'development') {
  addTestDevPage(app)
}
addSocketListeners(io, app)

// graph running
addGraphEndpoints(app)

server.listen(process.env.PORT, () => {
  console.log('listening on port ' + process.env.PORT)
})