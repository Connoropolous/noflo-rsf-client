require('dotenv').config()
const express = require('express')
const mustacheExpress = require('mustache-express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

const { overrideJsonGraph, start, convertDataFromSheetToRSF } = require('./run_graph.js')

app.engine('mustache', mustacheExpress())
app.set('view engine', 'mustache')
app.set('views', __dirname + '/ParticipantRegisterAssets')

app.post('/handle', express.json(), function (req, res) {
    console.log('received a new request to run a graph')
    console.log('spreadsheet data', req.body.columns)
    if (req.body.columns.length === 16 && req.body.columns.join('').length > 0) {
        const convertedInputs = convertDataFromSheetToRSF(req.body.columns)
        const jsonGraph = overrideJsonGraph(convertedInputs, 'collect-react-results.json')
        start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)
    }
    res.sendStatus(200)
})

const validInput = (input) => {
    if (!input.type || !input.id) {
        return false
    }
    return true
}
const standUpRegisterPageAndGetResults = (mountPoint, maxTime, maxParticipants, isFacilitator, processDescription) => {
    return new Promise((resolve, reject) => {
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
                calledComplete = true
                clearTimeout(timeoutId)
                // give it enough time to send a response to the
                // last registered participant
                resolve(results)
            }
        }

        app.get(mountPoint, (req, res) => {
            res.render('register', {
                mountPoint,
                processDescription,
                maxTime,
                maxParticipants,
                isFacilitator
            })
        })

        // setup web server... collect participant configs
        app.post(`${mountPoint}/new-participant`, express.urlencoded({ extended: true }), (req, res) => {
            const input = req.body

            if (!validInput(input)) {
                res.redirect(`${mountPoint}?failure`)
                return
            }

            res.redirect(`${mountPoint}?success`)
            results.push({
                id: input.id,
                type: input.type,
                name: input.name
            })
            if (results.length === maxParticipants) {
                complete()
            }
        })
    })
}

const guidGenerator = () => {
    const S4 = () => (((1+Math.random())*0x10000)|0).toString(16).substring(1)
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4())
}
io.on('connection', function(client) {
    client.on('participant_register', async (data) => {
        const mountPoint = `/register/${guidGenerator()}`
        const { isFacilitator, maxParticipants, maxTime, processDescription } = data
        client.emit('participant_register_url', process.env.URL + mountPoint)
        const results = await standUpRegisterPageAndGetResults(
            mountPoint,
            maxTime,
            maxParticipants,
            isFacilitator,
            processDescription
        )
        client.emit('participant_register_results', results)
        client.disconnect()
    })
})
 
server.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})