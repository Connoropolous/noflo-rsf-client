
import * as fbpGraph from 'fbp-graph'

import {
  URLS,
  VIEWS
} from './constants'
import {
  remainingTime,
} from './participant_register'
import {
  ExpectedInput,
  Stage,
  GraphInput,
  Template,
  RegisterConfig,
  ContactableConfig,
} from './types'
import {
  getProcess, CONTACTABLE_CONFIG_PORT_NAME
} from './process_model'
import {
  createFbpClient
} from './fbp'

const addGraphEndpoints = (app) => {
  app.get(URLS.PROCESS, async function (req, res) {
    // load up the saved process at the given id
    const config = await getProcess(req.params.processId)
    if (config) {
      const template: Template = require(config.templatePath)
      const stages = template.stages.map((stage: Stage) => {
        // find registerConfigs and participants for contactable_configs
        const expectedRegisters = stage.expectedInputs.reduce((memo, expectedInput: ExpectedInput) => {
          if (expectedInput.port === CONTACTABLE_CONFIG_PORT_NAME) {
            const registerConfig: RegisterConfig = config.registerConfigs[expectedInput.process]
            const participants: ContactableConfig[] = config.participants[expectedInput.process]
            const expectedRegister = {
              ...registerConfig,
              participants,
              showParticipants: !!participants.length,
              // non facilitator keys
              url: `${process.env.URL}${registerConfig.path}`,
              remainingTime: remainingTime(registerConfig.maxTime, config.startTime),
              // facilitator keys
              formHandler: URLS.HANDLE_REGISTER(registerConfig.path),
              showForm: registerConfig.isFacilitator && !participants.length
            }
            return memo.concat([expectedRegister])
          }
          return memo
        }, [])
        return {
          ...stage,
          expectedRegisters
        }
      })
      res.render(VIEWS.PROCESS, {
        ...config,
        // ...keys,
        stages,
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

const overrideJsonGraph = (graphInputs: GraphInput[], graphPath: string) => {
  const originalGraph = require(graphPath)
  // most relevant connections are inputs
  const connections = originalGraph.connections.map(connection => {
    const foundOverride = graphInputs.find(input => {
      return input.tgt.process === connection.tgt.process && input.tgt.port === connection.tgt.port
    })
    return foundOverride || connection
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
  start,
  componentMetaForStages
}