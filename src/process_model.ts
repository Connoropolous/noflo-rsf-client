import {
  guidGenerator, standUpFacilitatorEndpoint, standUpRegisterPageAndGetResults
} from './participant_register'
import { URLS } from './constants'
import {
  ContactableConfig,
  RegisterConfig,
  RegisterConfigSet,
  FormInputs,
  Process,
  Template,
  ExpectedInput,
  Stage,
  Option,
  GraphInput
} from './types'
import { overrideJsonGraph, start, componentMetaForStages } from './run_graph'

const processes = {}

const CONTACTABLE_CONFIG_PORT_NAME = 'contactable_configs'

const getProcess = async (id: string): Promise<Process> => {
  return processes[id]
}

const setProcessProp = async (id: string, key: string, value: any): Promise<boolean> => {
  console.log(`updating process ${id} value ${key}: ${JSON.stringify(value)})`)
  processes[id][key] = value
  return true
}

const newProcess = async (formInputs: FormInputs, templateId: string, templatePath: string, graphPath: string): Promise<string> => {
  const id = guidGenerator()

  // load up template json
  const template: Template = require(templatePath)
  // load up graph json too
  const graph = require(graphPath)
  // load up expectedInput types, help text, and component names
  const stages = await componentMetaForStages(template.stages, graph)
  const registerConfigs = {}
  const participants = {}
  stages.forEach((stage: Stage) => {
    stage.expectedInputs.forEach((expectedInput: ExpectedInput) => {
      const { process, port } = expectedInput
      if (port === CONTACTABLE_CONFIG_PORT_NAME) {
        const path = `${URLS.REGISTER}/${guidGenerator()}`
        const registerConfig = getRegisterConfig(formInputs, process, path)
        registerConfigs[process] = registerConfig
        participants[process] = [] // empty for now
      }
    })
  })

  const newProcess: Process = {
    id,
    templateId,
    templatePath,
    graphPath,
    configuring: true,
    running: false,
    complete: false,
    results: null,
    error: null,
    startTime: Date.now(),
    formInputs,
    registerConfigs,
    participants
  }
  processes[id] = newProcess
  console.log('created a new process configuration', newProcess)
  return id
}

interface HandlerInput {
  input?: string
  app?: any // express
  registerConfig?: RegisterConfig
  callback?: (c: ContactableConfig) => void
}
type Handler = (handlerInput: HandlerInput) => Promise<any>

const handleText: Handler = async ({ input }): Promise<string> => {
  return input
}
const handleInt: Handler = async ({ input }): Promise<number> => {
  return parseInt(input)
}
const handleMaxTime: Handler = async ({ input }): Promise<number> => {
  return parseFloat(input) * 60 // minutes, converted to seconds
}
const handleOptionsData: Handler = async ({ input }): Promise<Option[]> => {
  // e.g. a+A=Agree, b+B=Block
  return input
    .split(',')
    .map((s: string) => {
      // trim cleans white space
      const [triggersString, text] = s.trim().split('=')
      return {
        triggers: triggersString.split('+'),
        text
      }
    })
}
const handleRegisterConfig: Handler = ({ app, registerConfig, callback }): Promise<ContactableConfig[]> => {
  const { isFacilitator, maxTime, maxParticipants, processContext, path } = registerConfig
  return isFacilitator ? standUpFacilitatorEndpoint(app, path) : standUpRegisterPageAndGetResults(
    app,
    path,
    maxTime,
    maxParticipants,
    processContext,
    callback
  )
}

// noflo input types
// all, string, number, int, object, array, boolean, color, date, bang, function, buffer, stream
// map these to form inputs
// allow for overrides
const nofloTypeMap = {
  string: {
    input: 'text',
    handler: handleText
  },
  number: {
    input: 'text',
    handler: handleText
  },
  int: {
    input: 'text',
    handler: handleInt
  },
  boolean: {
    input: 'checkbox',
    handler: () => { } // TODO
  },
  array: {
    input: 'text',
    handler: () => { } // TODO
  },
  object: {
    input: 'text',
    handler: () => { } // TODO
  },
  all: {
    input: 'text',
    handler: handleText
  }
  // TODO: the rest
}
const specialPorts = {
  contactable_configs: {
    input: 'register_config',
    handler: handleRegisterConfig
  },
  options: {
    handler: handleOptionsData
  },
  max_time: {
    handler: handleMaxTime
  }
}

// TODO: create a default?
const mapInputToFormType = (expectedInput: ExpectedInput): string => {
  const { type, port, inputTypeOverride } = expectedInput
  // specialPorts > inputTypeOverride > basic type
  const form_partial = (specialPorts[port] || {}).input
    || inputTypeOverride
    || (nofloTypeMap[type] || {}).input
  return `form_${form_partial}`
}

// TODO: create a default?
const mapInputToHandler = (expectedInput: ExpectedInput): Handler => {
  const { type, port } = expectedInput
  // specialPorts > basic type
  return (specialPorts[port] || nofloTypeMap[type] || {}).handler
}

const convertToGraphInput = (process: string, port: string, data: any): GraphInput => {
  return {
    tgt: {
      process,
      port
    },
    data
  }
}

const updateParticipants = async (processId: string, name: string, newParticipants: ContactableConfig[], overwrite: boolean) => {
  const p = await getProcess(processId)
  const participants = {
    ...p.participants,
    [name]: overwrite ? newParticipants : p.participants[name].concat(newParticipants)
  }
  setProcessProp(processId, 'participants', participants)
}

const getHandlerInput = (app, processId: string, expectedInput: ExpectedInput, formInputs: FormInputs, registerConfigs: RegisterConfigSet): HandlerInput => {
  const { process, port } = expectedInput

  if (port === CONTACTABLE_CONFIG_PORT_NAME) {
    return {
      app,
      registerConfig: registerConfigs[process],
      callback: (contactableConfig: ContactableConfig) => {
        updateParticipants(processId, process, [contactableConfig], false)
      }
    }
  }

  return {
    input: formInputs[`${process}--${port}`]
  }
}

const runProcess = async (processId: string, app) => {
  const {
    registerConfigs,
    formInputs,
    graphPath,
    templatePath
  } = await getProcess(processId)

  // load up template json
  const template: Template = require(templatePath)
  // load up graph json too
  const graph = require(graphPath)
  // load up expectedInput types, help text, and component names
  const stages = await componentMetaForStages(template.stages, graph)
  const promises = []
  stages.forEach((stage: Stage) => {
    stage.expectedInputs.forEach((expectedInput: ExpectedInput) => {
      promises.push((async () => {
        const handler: Handler = mapInputToHandler(expectedInput)
        const handlerInput: HandlerInput = getHandlerInput(app, processId, expectedInput, formInputs, registerConfigs)
        const finalInput = await handler(handlerInput)
        const { process, port } = expectedInput
        if (port === CONTACTABLE_CONFIG_PORT_NAME) {
          updateParticipants(processId, process, finalInput, true)
        }
        return convertToGraphInput(process, port, finalInput)
      })())
    })
  })
  const graphInputs = await Promise.all(promises)

  // once they're all ready, now commence the process
  // mark as running now
  setProcessProp(processId, 'configuring', false)
  setProcessProp(processId, 'running', true)
  const jsonGraph = overrideJsonGraph(graphInputs, graphPath)
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
}

const getRegisterConfig = (formInputs: FormInputs, process: string, path: string): RegisterConfig => {
  return {
    stage: process,
    isFacilitator: formInputs[`${process}-check-facil_register`] === 'facil_register',
    processContext: formInputs[`${process}-ParticipantRegister-process_context`] || process,
    maxTime: (parseFloat(formInputs[`${process}-ParticipantRegister-max_time`]) || 5) * 60, // five minute default, converted to seconds
    maxParticipants: formInputs[`${process}-ParticipantRegister-max_participants`] || '*', // unlimited default
    path
  }
}

export {
  CONTACTABLE_CONFIG_PORT_NAME,
  getProcess,
  setProcessProp,
  newProcess,
  runProcess,
  getRegisterConfig,
  handleRegisterConfig,
  convertToGraphInput,
  handleOptionsData,
  mapInputToFormType,
  mapInputToHandler
}


/*
  // capture the results for each as they come in
  // do this in a non-blocking way
  const updatePList = async (key: string, newP: ContactableConfig, allP?: ContactableConfig[]) => {
    const old = (await getProcess(processId))[key]
    const updated = allP ? allP : [...old].concat(newP) // clone and add
    setProcessProp(processId, key, updated)
  }
  const ideationP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, paths[0], registerConfigs[0], (newP: ContactableConfig) => {
    updatePList('ideationParticipants', newP)
  })
  const reactionP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, paths[1], registerConfigs[1], (newP: ContactableConfig) => {
    updatePList('reactionParticipants', newP)
  })
  const summaryP: Promise<ContactableConfig[]> = proceedWithRegisterConfig(app, paths[2], registerConfigs[2], (newP: ContactableConfig) => {
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


*/