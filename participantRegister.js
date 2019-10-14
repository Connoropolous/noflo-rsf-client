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
            isFacilitator: true,
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

const standUpRegisterPageAndGetResults = (app, mountPoint, maxTime, maxParticipants, isFacilitator, processDescription) => {
    console.log('standing up new registration page at ' + mountPoint)
    return new Promise((resolve, reject) => {
        // capture the process kickoff time for reference
        const startTime = Date.now()
        const results = []

        // stop the process after a maximum amount of time
        const timeoutId = setTimeout(() => {
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

        // route for serving the registration form page
        app.get(mountPoint, (req, res) => {
            res.render(VIEWS.REGISTER, {
                mountPoint,
                showParticipantBlock: true,
                showTime: true,
                remainingTime: (maxTime - (Date.now() - startTime) / 1000).toFixed(), // round it
                maxParticipants,
                participantCount: results.length,
                processDescription,
                isFacilitator,
                registrationClosed: calledComplete
            })
        })

        // endpoint for handling form submits
        app.post(URLS.HANDLE_REGISTER(mountPoint), express.urlencoded({ extended: true }), (req, res) => {
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

            results.push({
                id: input.id,
                type: input.type,
                name: input.name
            })
            if (results.length === maxParticipants || (isFacilitator && input.facilitator_complete === 'on')) {
                complete()
            }
            res.redirect(`${mountPoint}?success`)
        })
    })
}
module.exports.standUpRegisterPageAndGetResults = standUpRegisterPageAndGetResults

const guidGenerator = () => {
    const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())
}

const addSocketListeners = (io, app) => {
    io.on('connection', function (client) {

        // handle participant register flow
        client.on(EVENTS.RECEIVE.PARTICIPANT_REGISTER, async (data) => {
            const mountPoint = `${URLS.DEV.REGISTER}/${guidGenerator()}`
            const { isFacilitator, maxParticipants, maxTime, processDescription } = data
            client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_URL, process.env.URL + mountPoint)
            const results = await standUpRegisterPageAndGetResults(
                app,
                mountPoint,
                maxTime,
                maxParticipants,
                isFacilitator,
                processDescription
            )
            client.emit(EVENTS.SEND.PARTICIPANT_REGISTER_RESULTS, results)
            client.disconnect()
        })

    })
}
module.exports.addSocketListeners = addSocketListeners
