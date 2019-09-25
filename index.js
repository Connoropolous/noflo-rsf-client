require('dotenv').config()
const express = require('express')
const app = express()

app.use(express.json())

const runGraph = require('./run_graph.js')

const mattermostServerColumnIndex = 6

const columnMap = {
    '1': {
        process: 'CollectResponses ParticipantConfig',
        port: 'in',
    },
    '2': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'prompt',
    },
    '3': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'max_responses',
    },
    '4': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'max_time',
    },
    '5': {
        process: 'SendMessageToAll ParticipantConfig',
        port: 'in'
    }
}
 
app.post('/handle', function (req, res) {

    console.log('received a new request to run a graph')
    const inputs = Object.keys(columnMap).map(indexString => {
        const inputType = columnMap[indexString]
        const index = parseInt(indexString)
        const inputData = req.body.columns[index]
        return {
            inputType,
            inputData
        }
    })

    const mattermostServer = req.body.columns[mattermostServerColumnIndex]

    runGraph(inputs, mattermostServer, process.env.ADDRESS, process.env.TOP_SECRET)
    res.sendStatus(200)
})
 
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})