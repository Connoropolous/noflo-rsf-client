import * as dotenv from 'dotenv'
dotenv.config()
import * as express from 'express'
import * as exphbs from 'express-handlebars'
import * as http from 'http'
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'
import * as socketIo from 'socket.io'
const app = express()
const server = http.createServer(app)
const io = socketIo(server)
const readdir = promisify(fs.readdir)
import {
  addTestDevPage,
  addSocketListeners
} from './participant_register'
import {
  addGraphEndpoints,
  mapInputToFormType
} from './run_graph'
import {
  URLS, VIEWS
} from './constants'
import {
  addTemplateEndpoints
} from './templates'

app.engine('handlebars', exphbs({
  helpers: {
    mapInputToFormType
  }
}))
app.set('view engine', 'handlebars')
app.set('views', path.join(__dirname, '..', 'views'))

// participant registration
if (process.env.NODE_ENV === 'development') {
  addTestDevPage(app)
}
addSocketListeners(io, app)

app.get(URLS.INDEX, async (req, res) => {
  // collect up templates
  const files = await readdir(path.join(__dirname, '..', 'templates'))
  const templates = files.map(f => {
    const template = require(`../templates/${f}`)
    const shortName = f.replace('.template.json', '')
    template.path = URLS.TEMPLATE.replace(':templateId', shortName)
    return template
  })
  res.render(VIEWS.INDEX, {
    templates,
    layout: false
  })
})

addTemplateEndpoints(app)
// graph running
addGraphEndpoints(app)

server.listen(process.env.PORT, () => {
  console.log('listening on port ' + process.env.PORT)
})
