
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
  maxParticipants: number | string,
  path: string
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

type RegisterConfigSet = {
  [key: string]: RegisterConfig
}

type ContactableConfigSet = {
  [key: string]: ContactableConfig[]
}

type FormInputs = object

interface Process {
  id: string
  templateId: string
  templatePath: string
  graphPath: string
  configuring: boolean
  running: boolean
  complete: boolean
  results?: any
  error?: any
  startTime: number
  formInputs: FormInputs
  registerConfigs: RegisterConfigSet
  participants: ContactableConfigSet
}

/*
interface Reaction {
	statement
}
*/

interface GraphInput {
  tgt: { // target
    process: string
    port: string
  }
  data: any
}

export {
  ContactableConfig,
  ContactableConfigSet,
  Statement,
  Option,
  RegisterConfig,
  RegisterConfigSet,
  Template,
  Stage,
  FormInputs,
  ExpectedInput,
  Process,
  GraphInput
}
