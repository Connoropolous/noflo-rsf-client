import {
  guidGenerator
} from './participant_register'

type Process = any

const processes = {}

const getProcess = async (id): Promise<Process> => {
  return processes[id]
}

const setProcessProp = async (id, key, value): Promise<boolean> => {
  processes[id][key] = value
  return true
}

const newProcess = async (process: Process): Promise<string> => {
  const id = guidGenerator()
  processes[id] = {
    ...process,
    id
  }
  console.log('created a new process configuration', processes[id])
  return id
}

export {
  getProcess,
  setProcessProp,
  newProcess
}