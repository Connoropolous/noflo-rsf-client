const express = require('express')
const {
    VIEWS,
    URLS,
    EVENTS
} = require('./constants')

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
module.exports.addTestDevPage = addTestDevPage

// validate a proposed partcipantConfig
const validInput = (input) => {
    if (!input.type || !input.id) {
        return false
    }
    return true
}

const remainingTime = (maxTime, startTime) => {
    return (maxTime - (Date.now() - startTime) / 1000).toFixed() // round it
}
module.exports.remainingTime = remainingTime

const standUpRegisterPageAndGetResults = (app, mountPoint, maxTime, maxParticipants, isFacilitator, processDescription, eachNew = (newParticipant) => {}) => {
    console.log('standing up new registration page at ' + mountPoint)
    return new Promise((resolve, reject) => {
        // capture the process kickoff time for reference
        const startTime = Date.now()
        let results = []


        let timeoutId
        if (!isFacilitator) {
            // stop the process after a maximum amount of time
            timeoutId = setTimeout(() => {
                // complete, saving whatever results we have
                complete()
            }, maxTime * 1000)
        }

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

        if (isFacilitator) {
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
                    res.status(422).send(e) // Unprocessable Entity
                } else {
                    res.sendStatus(200) // Ok
                    results = configs
                    complete()
                }
            })
        } else {
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
                    isFacilitator,
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
        }
    })
}
module.exports.standUpRegisterPageAndGetResults = standUpRegisterPageAndGetResults

const guidGenerator = () => {
    const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
}
module.exports.guidGenerator = guidGenerator

const addSocketListeners = (io, app) => {
    io.on('connection', function (client) {

        // handle participant register flow
        client.on(EVENTS.RECEIVE.PARTICIPANT_REGISTER, async (data) => {
            const mountPoint = `${URLS.REGISTER}/${guidGenerator()}`

            // take the configuration variables that come in as the request
            const { isFacilitator, maxParticipants, maxTime, processDescription } = data

            // send the registration endpoint along early
            client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_URL, process.env.URL + mountPoint)
            const results = await standUpRegisterPageAndGetResults(
                app,
                mountPoint,
                maxTime,
                maxParticipants,
                isFacilitator,
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
module.exports.addSocketListeners = addSocketListeners
