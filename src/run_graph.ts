
import * as fbpGraph from 'fbp-graph'

import {
  URLS,
  VIEWS
} from './constants'
import {
  remainingTime,
} from './participant_register'
import {
  ContactableConfig,
  Option,
  ExpectedInput,
  Stage,
} from './types'
import {
  getProcess
} from './process_model'
import {
  createFbpClient
} from './fbp'

// noflo input types
// all, string, number, int, object, array, boolean, color, date, bang, function, buffer, stream
// map these to form inputs
// allow for overrides
const nofloTypeToInputType = {
  string: 'text',
  number: 'text',
  int: 'text',
  boolean: 'checkbox',
  array: 'text',
  object: 'text',
  all: 'text'
  // todo: the rest
}
const specialPorts = {
  contactable_configs: 'register_config'
}
const mapInputToFormType = (expectedInput: ExpectedInput): string => {
  const { type, port, inputTypeOverride } = expectedInput
  // specialPorts > input_type_override > basic type
  const form_partial = specialPorts[port] || inputTypeOverride || nofloTypeToInputType[type]
  return `form_${form_partial}`
}

const addGraphEndpoints = (app) => {
  app.get(URLS.PROCESS, async function (req, res) {
    // load up the saved process at the given id
    const config = await getProcess(req.params.processId)
    if (config) {
      const keys = ['ideation', 'reaction', 'summary'].reduce((memo, value, index) => {
        memo[`${value}IsFacilitator`] = config.registerConfigs[index].isFacilitator
        memo[`${value}ShowParticipants`] = !!config[`${value}Participants`].length
        // non facilitator keys
        memo[`${value}Url`] = `${process.env.URL}${config.paths[index]}`
        memo[`${value}RemainingTime`] = remainingTime(config.registerConfigs[index].maxTime, config.startTime)
        // facilitator keys
        memo[`${value}FormHandler`] = URLS.HANDLE_REGISTER(config.paths[index])
        memo[`${value}ShowForm`] = config.registerConfigs[index].isFacilitator && config[`${value}Participants`].length === 0
        return memo
      }, {})
      res.render(VIEWS.PROCESS, {
        ...config,
        ...keys,
        layout: false
      })
    } else {
      res.sendStatus(404)
    }
  })
}


const start = async (jsonGraph, dataWatcher = (signal) => { }): Promise<void> => {
  const client = await createFbpClient()
  /// TODO: disconnect?
  return new Promise((resolve, reject) => {
    fbpGraph.graph.loadJSON(jsonGraph, async (err, graph) => {
      if (err) {
        reject(err)
        return
      }
      await client.protocol.graph.send(graph, true)

      const observer = client.observe(['network:*'])

      try {
        await client.protocol.network.start({
          graph: graph.name,
        })
      } catch (e) {
        if (e.toString() !== 'Error: network:start timed out') reject(e)
        // ignore network:start timed out error, it still starts
      }
      // forward each network data signal for this specific graph
      client.on('network', signal => {
        if (signal.command === 'data' && signal.payload.graph === graph.name) {
          // just forward the payload itself, as other meta is assumed
          dataWatcher(signal.payload)
        }
      })
      // we receive two useful things here:
      // DATA signals, and STOPPED signal, oh and ERROR signals
      // console.log(signals)
      const signals = await observer.until(['network:stopped'], ['network:error', 'network:processerror'])
      const stopped = signals.find(signal => signal.command === 'stopped' && signal.payload.graph === graph.name)
      const error = signals.find(signal => signal.command === 'error' && signal.payload.graph === graph.name)
      const processError = signals.find(signal => signal.command === 'processerror' && signal.payload.graph === graph.name)
      if (stopped) resolve()
      else reject(error || processError)
    })
  })
}

const componentMetaForStages = async (stages: Stage[], graph): Promise<Stage[]> => {
  const client = await createFbpClient()
  const components = await client.protocol.component.list()
  /// TODO: disconnect?
  return stages.map((stage: Stage): Stage => {
    return {
      ...stage,
      expectedInputs: stage.expectedInputs.map((e: ExpectedInput): ExpectedInput => {
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

const handleOptionsData = (optionsData: string): Option[] => {
  // e.g. a+A=Agree, b+B=Block
  return optionsData
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

const convertDataFromSheetToRSF = (inputs, participantConfigs: ContactableConfig[][]) => {
  const [ideationParticipants, reactionParticipants, summaryParticipants] = participantConfigs
  const inputsNeeded = [
    {
      process: 'rsf/CollectResponses_lctpp',
      port: 'contactable_configs',
    },
    {
      process: 'rsf/CollectResponses_lctpp',
      port: 'prompt',
    },
    {
      process: 'rsf/CollectResponses_lctpp',
      port: 'max_responses',
    },
    {
      process: 'rsf/CollectResponses_lctpp',
      port: 'max_time',
    },
    {
      process: 'rsf/ResponseForEach_cd3dx',
      port: 'contactable_configs',
    },
    {
      process: "rsf/ResponseForEach_cd3dx",
      port: "max_time"
    },
    {
      process: "rsf/ResponseForEach_cd3dx",
      port: "options"
    },
    {
      process: 'rsf/SendMessageToAll_xil86',
      port: 'contactable_configs'
    }
  ]

  // all incoming data are strings
  return inputsNeeded.map((inputType, index) => {
    let inputData
    switch (index) {
      case 0:
        inputData = ideationParticipants
        break
      case 1:
        inputData = inputs[`${inputType.process}--${inputType.port}`]
        break
      case 2: // max_responses
        inputData = parseInt(inputs[`${inputType.process}--${inputType.port}`])
        break
      case 3: // max_time
      case 5: // max_time
        inputData = parseFloat(inputs[`${inputType.process}--${inputType.port}`]) * 60 // minutes, converted to seconds
        break
      case 4:
        inputData = reactionParticipants
        break
      case 6:
        inputData = handleOptionsData(inputs[`${inputType.process}--${inputType.port}`])
        break
      case 7:
        inputData = summaryParticipants
        break
    }
    return {
      inputType,
      inputData
    }
  })
}

const overrideJsonGraph = (inputs, graphPath: string) => {
  const originalGraph = require(graphPath)

  // most relevant connections are inputs
  const connections = originalGraph.connections.map(connection => {
    const foundOverride = inputs.find(input => {
      return input.inputType.process === connection.tgt.process && input.inputType.port === connection.tgt.port
    })
    if (foundOverride) {
      return {
        tgt: {
          ...connection.tgt
        },
        data: foundOverride.inputData
      }
    }
    else return connection
  })

  const modifiedGraph = {
    ...originalGraph,
    // override the name, give a unique name to this graph
    properties: {
      ...originalGraph.properties,
      name: `${Math.random() * 100}randomid`
    },
    // override the connections, or inputs
    connections
  }

  return modifiedGraph
}

export {
  overrideJsonGraph,
  addGraphEndpoints,
  convertDataFromSheetToRSF,
  start,
  mapInputToFormType,
  componentMetaForStages
}