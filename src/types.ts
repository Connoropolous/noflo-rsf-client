
interface ContactableConfig {
  type: string
  id: string
  name?: string
}

interface Statement {
  text: string
}

interface Option {
  triggers: string[],
  text: string
}

interface RegisterConfig {
  stage: string
  isFacilitator: boolean
  processContext: string
  maxTime: number
  maxParticipants: number | string
}

interface ExpectedInput {
  process: string
  port: string
  help?: string
  label?: string
  type?: string
  component?: string
  inputTypeOverride?: string
  defaultValue?: any
  placeholder?: string,
}

interface Stage {
  name: string
  description: string
  expectedInputs: ExpectedInput[]
}

interface Template {
  name: string
  description: string
  stages: Stage[]
}

interface Process {
  id: string
  templateId: string,
  templatePath: string,
  graphPath: string,
  configuring: boolean,
  running: boolean,
  complete: boolean,
  results?: any,
  error?: any,
  startTime: number,
  registerConfigs: RegisterConfig[],
  paths: string[],
  inputs: object,
  participants: ContactableConfig[][]
}

/*
interface Reaction {
	statement
}
*/

export {
  ContactableConfig,
  Statement,
  Option,
  RegisterConfig,
  Template,
  Stage,
  ExpectedInput,
  Process
}
