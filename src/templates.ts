import * as express from 'express'
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'
const exists = promisify(fs.exists)
import {
  Template,
} from './types'
import {
  URLS,
  VIEWS
} from './constants'
import {
  newProcess,
  runProcess
} from './process_model'
import { componentMetaForStages } from './run_graph'

const checkForTemplateMiddleware = async (req, res, next) => {
  const { templateId } = req.params
  const templatePath = path.join(__dirname, '..', 'templates', `${templateId}.template.json`)
  const graphPath = path.join(__dirname, '..', 'graphs', `${templateId}.json`)
  const templateExists = await exists(templatePath)
  const graphExists = await exists(graphPath)
  if (!templateExists || !graphExists) {
    res.sendStatus(404)
    return
  }
  req.templatePath = templatePath
  req.graphPath = graphPath
  next()
}

const addTemplateEndpoints = (app) => {
  app.get(URLS.TEMPLATE, checkForTemplateMiddleware, async function (req, res) {
    const { templateId } = req.params
    const { templatePath, graphPath } = req
    // load up template json
    const template: Template = require(templatePath)
    // load up graph json too
    const graph = require(graphPath)
    // load up expectedInput types, help text, and component names
    const stages = await componentMetaForStages(template.stages, graph)
    res.render(VIEWS.TEMPLATE, {
      template: {
        ...template,
        stages
      },
      formHandler: URLS.HANDLE_TEMPLATE.replace(':templateId', templateId),
      layout: false
    })
  })

  // form handler
  app.post(URLS.HANDLE_TEMPLATE, express.urlencoded({ extended: true }), checkForTemplateMiddleware, async (req, res) => {
    const { templateId } = req.params
    const { templatePath, graphPath } = req
    const processId = await newProcess(req.body, templateId, templatePath, graphPath)
    // kick it off, but don't wait on it, or depend on it for anything
    runProcess(processId, app)
    res.redirect(URLS.PROCESS.replace(':processId', processId))
  })
}

export {
  addTemplateEndpoints
}