import * as express from 'express'
import {
  VIEWS,
  URLS,
  EVENTS
} from './constants'
import { ContactableConfig } from './types'

const addTestDevPage = (app) => {
  /* dev endpoint */
  app.get(URLS.DEV.REGISTER, (req, res) => {
    res.render(VIEWS.REGISTER, {
      mountPoint: '/test',
      showParticipantBlock: true,
      showTime: true,
      remainingTime: 600,
      maxParticipants: 3,
      participantCount: 0,
      processDescription: 'test',
      registrationClosed: false
    })
  })
}

// validate a proposed ContactableConfig
const validInput = (input: ContactableConfig) => {
  if (!input.type || !input.id) {
    return false
  }
  return true
}

const remainingTime = (maxTime: number, startTime: number) => {
  return (maxTime - (Date.now() - startTime) / 1000).toFixed() // round it
}

const standUpFacilitatorEndpoint = (app, mountPoint: string): Promise<ContactableConfig[]> => {
  return new Promise((resolve) => {
    let results = []
    const formHandler = URLS.HANDLE_REGISTER(mountPoint)

    // setup a completion handler that
    // can only fire once
    let calledComplete = false
    const complete = () => {
      if (!calledComplete) {
        calledComplete = true
        resolve(results)
      }
    }

    // bulk handler
    // only mount a handler here
    app.post(formHandler, express.json(), (req, res) => {
      // registration has ended already?
      if (calledComplete) {
        res.sendStatus(403) // Forbidden
        return
      }
      const { configs } = req.body
      if (!configs.every(validInput)) {
        res.sendStatus(422) // Unprocessable Entity
      } else {
        res.sendStatus(200) // Ok
        results = configs
        complete()
      }
    })
  })
}

const standUpRegisterPageAndGetResults = (app, mountPoint: string, maxTime: number, maxParticipants: any, processDescription: string, eachNew: (newParticipant: ContactableConfig) => void = (newParticipant: ContactableConfig) => { }): Promise<ContactableConfig[]> => {
  console.log('standing up new registration page at ' + mountPoint)
  return new Promise((resolve) => {
    // capture the process kickoff time for reference
    const startTime = Date.now()
    let results = []


    let timeoutId
    // stop the process after a maximum amount of time
    timeoutId = setTimeout(() => {
      // complete, saving whatever results we have
      complete()
    }, maxTime * 1000)

    // setup a completion handler that
    // can only fire once
    let calledComplete = false
    const complete = () => {
      if (!calledComplete) {
        console.log('closing registration for ' + mountPoint)
        calledComplete = true
        clearTimeout(timeoutId)
        resolve(results)
      }
    }

    const formHandler = URLS.HANDLE_REGISTER(mountPoint)


    // one by one handler

    // route for serving the registration form page
    app.get(mountPoint, (req, res) => {
      res.render(VIEWS.REGISTER, {
        formHandler,
        showParticipantBlock: true,
        showTime: true,
        remainingTime: remainingTime(maxTime, startTime),
        maxParticipants,
        participantCount: results.length,
        processDescription,
        registrationClosed: calledComplete
      })
    })

    // endpoint for handling form submits
    app.post(formHandler, express.urlencoded({ extended: true }), (req, res) => {
      // registration has ended already?
      if (calledComplete) {
        res.sendStatus(403) // Forbidden
        return
      }

      const input = req.body

      if (!validInput(input)) {
        res.redirect(`${mountPoint}?failure`)
        return
      }

      const newParticipant = {
        id: input.id,
        type: input.type,
        name: input.name
      }
      // add to final results
      results.push(newParticipant)
      // also call into callback with each new result
      eachNew({ ...newParticipant }) // clone
      if (results.length === maxParticipants) {
        complete()
      }
      res.redirect(`${mountPoint}?success`)
    })
  })
}

const guidGenerator = (): string => {
  const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
}

const addSocketListeners = (io, app) => {
  io.on('connection', function (client) {

    // handle participant register flow
    client.on(EVENTS.RECEIVE.PARTICIPANT_REGISTER, async (data) => {
      const mountPoint = `${URLS.REGISTER}/${guidGenerator()}`

      // take the configuration variables that come in as the request
      const { maxParticipants, maxTime, processDescription } = data

      // send the registration endpoint along early
      client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_URL, process.env.URL + mountPoint)
      const results = await standUpRegisterPageAndGetResults(
        app,
        mountPoint,
        maxTime,
        maxParticipants,
        processDescription,
        // forward each new registration live as well
        (newParticipant) => {
          client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_RESULT, newParticipant)
        }
      )
      // send the final results when we've got them
      client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_RESULTS, results)
      client.disconnect()
    })

  })
}
export {
  addSocketListeners,
  addTestDevPage,
  guidGenerator,
  standUpRegisterPageAndGetResults,
  standUpFacilitatorEndpoint,
  remainingTime
}
