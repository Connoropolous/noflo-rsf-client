import { config } from 'dotenv'
config()
import express from 'express'
import exphbs from 'express-handlebars'
import http from 'http'
import path from 'path'
import socketIo from 'socket.io'

import {
  addRegisteredPage,
  addTestDevPage,
  addSocketListeners
} from './participant_register'

type CloseFn = () => void
export default function start(): Promise<CloseFn> {
  const app = express()
  const server = http.createServer(app)
  const io = socketIo(server)
  app.engine('handlebars', exphbs())
  app.set('view engine', 'handlebars')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.use(express.static('public'))
  // participant registration
  if (process.env.NODE_ENV === 'development') {
    addTestDevPage(app)
  }
  addRegisteredPage(app)
  addSocketListeners(io, app)
  return new Promise((resolve, reject) => {
    server
      .listen(process.env.PORT, () => {
        const close: CloseFn = () => {
          server.close()
        }
        resolve(close)
      })
      .on('error', (err: Error) => {
        reject(err)
      })
  })
}
