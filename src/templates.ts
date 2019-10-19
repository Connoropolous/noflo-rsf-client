import * as express from 'express'
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'
const exists = promisify(fs.exists)
import {
  guidGenerator,
  standUpRegisterPageAndGetResults,
  standUpFacilitatorEndpoint
} from './participant_register'
import {
  ContactableConfig,
  Template,
  RegisterConfig,
  Stage,
  ExpectedInput
} from './types'
import {
  URLS,
  VIEWS
} from './constants'
import {
  start,
  convertDataFromSheetToRSF,
  overrideJsonGraph
} from './run_graph'
import {
  newProcess,
  setProcessProp,
  getProcess
} from './process_model'
import {
  createFbpClient
} from './fbp'

const addTemplateEndpoints = (app) => {
  app.get(URLS.TEMPLATE, async function (req, res) {
    const { templateId } = req.params
    const templatePath = path.join(__dirname, '..', 'templates', `${templateId}.template.json`)
    const graphPath = path.join(__dirname, '..', 'graphs', `${templateId}.json`)
    const templateExists = await exists(templatePath)
    const graphExists = await exists(graphPath)
    if (!templateExists || !graphExists) {
      res.sendStatus(404)
      return
    }
    // load up template json
    const template: Template = require(templatePath)
    // load up graph json too
    const graph = require(graphPath)
    // load up expected_input types, help text, and component names
    const stages = await componentMetaForStages(template.stages, graph)
    res.render(VIEWS.TEMPLATE, {
      template: {
        ...template,
        stages
      },
      formHandler: URLS.HANDLE_TEMPLATE,
      layout: false
    })
  })

  // form handler
  app.post(URLS.HANDLE_TEMPLATE, express.urlencoded({ extended: true }), async (req, res) => {
    const startTime = Date.now()
    let registerConfigs = getRegisterConfigs(req.body)
    // boot up participant config stages
    const ideationPath = `${URLS.REGISTER}/${guidGenerator()}`
    const reactionPath = `${URLS.REGISTER}/${guidGenerator()}`
    const summaryPath = `${URLS.REGISTER}/${guidGenerator()}`
    const paths = [ideationPath, reactionPath, summaryPath]

    const processId = await newProcess({
      configuring: true,
      startTime,
      registerConfigs,
      paths,
      inputs: req.body,
      ideationParticipants: [],
      reactionParticipants: [],
      summaryParticipants: []
    })

    // capture the results for each as they come in
    // do this in a non-blocking way
    const updatePList = async (key: string, newP: ContactableConfig, allP?: ContactableConfig[]) => {
      const old = (await getProcess(processId))[key]
      const updated = allP ? allP : [...old].concat(newP) // clone and add
      setProcessProp(processId, key, updated)
    }
    const ideationP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, ideationPath, registerConfigs[0], (newP: ContactableConfig) => {
      updatePList('ideationParticipants', newP)
    })
    const reactionP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, reactionPath, registerConfigs[1], (newP: ContactableConfig) => {
      updatePList('reactionParticipants', newP)
    })
    const summaryP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, summaryPath, registerConfigs[2], (newP: ContactableConfig) => {
      updatePList('summaryParticipants', newP)
    })
    // capture the sum results for each
    ideationP.then((ideationParticipants: ContactableConfig[]) => {
      updatePList('ideationParticipants', null, ideationParticipants)
    })
    reactionP.then((reactionParticipants: ContactableConfig[]) => {
      updatePList('reactionParticipants', null, reactionParticipants)
    })
    summaryP.then((summaryParticipants: ContactableConfig[]) => {
      updatePList('summaryParticipants', null, summaryParticipants)
    })
    // once they're all ready, now commence the process
    Promise.all([ideationP, reactionP, summaryP]).then((participantArrays: ContactableConfig[][]) => {
      // mark as running now
      setProcessProp(processId, 'configuring', false)
      setProcessProp(processId, 'running', true)
      const convertedInputs = convertDataFromSheetToRSF(req.body, participantArrays)
      const jsonGraph = overrideJsonGraph(convertedInputs, 'ideation-reaction.json')
      const dataWatcher = (signal) => {
        if (signal.id === 'rsf/FormatReactionsList_cukq9() FORMATTED -> IN core/MakeFunction_lsxgf()') {
          // save the results to the process
          setProcessProp(processId, 'results', signal.data)
        }
      }
      start(jsonGraph, dataWatcher)
        .then(() => {
          setProcessProp(processId, 'running', false)
          setProcessProp(processId, 'complete', true)
        }) // logs and save to memory
        .catch((e) => {
          setProcessProp(processId, 'running', false)
          setProcessProp(processId, 'error', e)
        }) // logs and save to memory
    })

    res.redirect(URLS.PROCESS.replace(':processId', processId))
  })
}

const componentMetaForStages = async (stages: Stage[], graph): Promise<Stage[]> => {
  const client = await createFbpClient()
  const components = await client.protocol.component.list()
  /// TODO: disconnect?
  return stages.map((stage: Stage):Stage => {
    return {
      ...stage,
      expected_inputs: stage.expected_inputs.map((e: ExpectedInput):ExpectedInput => {
        const componentName = graph.processes[e.process].component
        const component = components.find((c) => c.name === componentName)
        const port = component.inPorts.find((i) => i.id === e.port)
        return {
          ...e,
          label: e.label || port.description,
          type: port.type,
          component: componentName
        }
      })
    }
  })
}

const getRegisterConfigs = (formInput): RegisterConfig[] => {
  return ['rsf/CollectResponses_lctpp', 'rsf/ResponseForEach_cd3dx', 'rsf/SendMessageToAll_xil86'].map((s, index) => {
    let processContext: string
    if (index === 0) processContext = 'Ideation'
    else if (index === 1) processContext = 'Reaction'
    else if (index === 2) processContext = 'Summary'

    return {
      stage: s,
      isFacilitator: formInput[`${s}-check-facil_register`] === 'facil_register',
      processContext: formInput[`${s}-ParticipantRegister-process_context`] || processContext,
      maxTime: (formInput[`${s}-ParticipantRegister-max_time`] || 5) * 60, // five minute default, converted to seconds
      maxParticipants: formInput[`${s}-ParticipantRegister-max_participants`] || '*' // unlimited default
    }
  })
}


const proceedWithRegisterConfig = (app, path: string, registerConfig: RegisterConfig, callback: (newP: ContactableConfig) => void): Promise<ContactableConfig[]> => {
  return registerConfig.isFacilitator ? standUpFacilitatorEndpoint(app, path) : standUpRegisterPageAndGetResults(
    app,
    path,
    registerConfig.maxTime,
    registerConfig.maxParticipants,
    registerConfig.processContext,
    callback
  )
}

export {
  addTemplateEndpoints,
  getRegisterConfigs,
  proceedWithRegisterConfig,
}