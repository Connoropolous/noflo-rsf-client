import * as express from 'express'
import { VIEWS, URLS, EVENTS } from './constants'
import { ContactableConfig, ParticipantRegisterConfig } from 'rsf-types'

interface Register {
  id: string
  showParticipantBlock: boolean
  showTime: boolean
  startTime: number
  maxTime: number
  maxParticipants: number | string
  description: string
  registrationHasOpened: boolean
  registrationClosed: boolean
  results: ContactableConfig[]
}

interface RegisterTemplate {
  formHandler: string
  showParticipantBlock: boolean
  showTime: boolean
  remainingTime: string
  maxParticipants: number | string
  participantCount: number
  description: string
  registrationHasOpened: boolean
  registrationClosed: boolean
  layout: boolean
}

const addTestDevPage = (app: express.Application) => {
  /* dev endpoint */
  app.get(URLS.DEV.REGISTER, (req, res) => {
    const registerTemplate: RegisterTemplate = {
      formHandler: '//',
      showParticipantBlock: true,
      showTime: true,
      remainingTime: '600',
      maxParticipants: 3,
      participantCount: 2,
      description: 'test',
      registrationHasOpened: true,
      registrationClosed: false,
      layout: false
    }
    res.render(VIEWS.REGISTER, registerTemplate)
  })
}

// validate a proposed ContactableConfig
const validInput = (input: ContactableConfig): boolean => {
  if (!input.type || !input.id) {
    return false
  }
  return true
}

const remainingTime = (maxTimeInSeconds: number, startTime: number): string => {
  const secondsElapsed = (Date.now() - startTime) / 1000
  return (maxTimeInSeconds - secondsElapsed).toFixed() // round it
}

type EachNewCallback = (newParticipant: ContactableConfig) => void
const defaultEachNewParticipant: EachNewCallback = () => {}

const createNewRegister = (
  app: express.Application,
  id: string,
  maxTimeInSeconds: number,
  maxParticipants: number | string,
  description: string
) => {
  const register: Register = {
    id,
    showParticipantBlock: true,
    showTime: true,
    maxTime: maxTimeInSeconds,
    startTime: null,
    maxParticipants,
    results: [],
    description,
    registrationHasOpened: false,
    registrationClosed: false
  }

  console.log('standing up new registration page at ' + id)
  // new route for serving the registration form page
  app.get(id, (req, res) => {
    const formHandler = URLS.HANDLE_REGISTER(id)
    const remaining = register.registrationHasOpened
      ? remainingTime(register.maxTime, register.startTime)
      : null
    const registerTemplate: RegisterTemplate = {
      formHandler,
      showParticipantBlock: true,
      showTime: true,
      remainingTime: remaining,
      maxParticipants: register.maxParticipants,
      participantCount: register.results.length,
      description: register.description,
      registrationHasOpened: register.registrationHasOpened,
      registrationClosed: register.registrationClosed,
      layout: false
    }
    res.render(VIEWS.REGISTER, registerTemplate)
  })

  return register
}

const openRegister = (
  app: express.Application,
  register: Register,
  eachNew: EachNewCallback = defaultEachNewParticipant
): Promise<ContactableConfig[]> => {
  return new Promise(resolve => {
    // modify that register
    register.startTime = Date.now()
    register.registrationHasOpened = true
    const formHandler = URLS.HANDLE_REGISTER(register.id)
    const maxTimeInMilliseconds = register.maxTime * 1000
    // stop the process after a maximum amount of time
    const timeoutId = setTimeout(() => {
      // complete, saving whatever results we have
      complete()
    }, maxTimeInMilliseconds)
    // setup a completion handler that
    // can only fire once
    const complete = () => {
      if (!register.registrationClosed) {
        console.log('closing registration for ' + register.id)
        register.registrationClosed = true
        clearTimeout(timeoutId)
        resolve(register.results)
      }
    }

    // endpoint for handling form submits
    app.post(
      formHandler,
      express.urlencoded({ extended: true }),
      (req, res) => {
        // registration has ended already?
        if (register.registrationClosed) {
          res.sendStatus(403) // Forbidden
          return
        }
        const input = req.body
        if (!validInput(input)) {
          res.redirect(`${register.id}?failure`)
          return
        }
        const newParticipant: ContactableConfig = {
          id: input.id,
          type: input.type,
          name: input.name
        }
        // add to final results
        register.results.push(newParticipant)
        // also call into callback with each new result
        eachNew({ ...newParticipant }) // clone
        if (register.results.length === register.maxParticipants) {
          complete()
        }
        res.redirect(`${register.id}?success`)
      }
    )
  })
}

const addSocketListeners = (io: SocketIO.Server, app: express.Application) => {
  const registers: { [id: string]: Register } = {}
  io.on('connection', function(client) {
    // create a new register page
    client.on(
      EVENTS.RECEIVE.PARTICIPANT_REGISTER,
      async (participantRegisterConfig: ParticipantRegisterConfig) => {
        const {
          id,
          maxParticipants,
          maxTime,
          description
        } = participantRegisterConfig
        const mountPoint = URLS.REGISTER(id)
        const register = createNewRegister(
          app,
          mountPoint,
          maxTime,
          maxParticipants,
          description
        )
        registers[id] = register
      }
    )
    // activate or open a registration
    client.on(EVENTS.RECEIVE.OPEN_REGISTER, async (id: string) => {
      const register = registers[id]
      if (!register) return
      const results: ContactableConfig[] = await openRegister(
        app,
        register,
        // forward each new registration live as well
        (newParticipant: ContactableConfig) => {
          client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_RESULT, newParticipant)
        }
      )
      // send the final results when we've got them
      client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_RESULTS, results)
    })
  })
}
export { addSocketListeners, addTestDevPage }
