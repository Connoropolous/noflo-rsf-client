
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
  input_type_override?: string
  default_value?: any
  placeholder?: string,
}

interface Stage {
  name: string
  description: string
  expected_inputs: ExpectedInput[]
}

interface Template {
  name: string
  description: string
  stages: Stage[]
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
  ExpectedInput
}
