import {
  guidGenerator, standUpFacilitatorEndpoint, standUpRegisterPageAndGetResults
} from './participant_register'
import { URLS } from './constants'
import { ContactableConfig, RegisterConfig, Process } from './types'
import { convertDataFromSheetToRSF, overrideJsonGraph, start } from './run_graph'

const processes = {}

const getProcess = async (id: string): Promise<Process> => {
  return processes[id]
}

const setProcessProp = async (id: string, key: string, value: any): Promise<boolean> => {
  processes[id][key] = value
  return true
}

const newProcess = async (inputs: object, templateId: string, templatePath: string, graphPath: string): Promise<string> => {
  const id = guidGenerator()
  let registerConfigs = getRegisterConfigs(inputs)
  // boot up participant config stages
  const ideationPath = `${URLS.REGISTER}/${guidGenerator()}`
  const reactionPath = `${URLS.REGISTER}/${guidGenerator()}`
  const summaryPath = `${URLS.REGISTER}/${guidGenerator()}`
  const paths = [ideationPath, reactionPath, summaryPath]

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
    registerConfigs,
    paths,
    inputs,
    participants: [[], [], []]
  }
  processes[id] = newProcess
  console.log('created a new process configuration', newProcess)
  return id
}

const runProcess = async (processId: string, app) => {
  const { paths, registerConfigs, inputs, graphPath } = await getProcess(processId)
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
  // once they're all ready, now commence the process
  Promise.all([ideationP, reactionP, summaryP]).then((participantArrays: ContactableConfig[][]) => {
    // mark as running now
    setProcessProp(processId, 'configuring', false)
    setProcessProp(processId, 'running', true)
    const convertedInputs = convertDataFromSheetToRSF(inputs, participantArrays)
    const jsonGraph = overrideJsonGraph(convertedInputs, graphPath)
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
}

const getRegisterConfigs = (formInput: object): RegisterConfig[] => {
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
  getProcess,
  setProcessProp,
  newProcess,
  runProcess,
  getRegisterConfigs,
  proceedWithRegisterConfig
}