import { config } from 'dotenv'
config()
import express from 'express'
import exphbs from 'express-handlebars'
import http from 'http'
import path from 'path'
import socketIo from 'socket.io'
const app = express()
const server = http.createServer(app)
const io = socketIo(server)
import {
  addTestDevPage,
  addSocketListeners
} from './participant_register'

app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, '..', 'views'))

// participant registration
if (process.env.NODE_ENV === 'development') {
  addTestDevPage(app)
}
addSocketListeners(io, app)

server.listen(process.env.PORT, () => {
  console.log('listening on port ' + process.env.PORT)
})
