require('dotenv').config()
const express = require('express')
const app = express()

app.use(express.json())

const runGraph = require('./run_graph.js')

/*
{ 'COL$B': 'connorturland',
  'COL$F': 'connorturland',
  'COL$E': '300',
  'COL$D': '3',
  'COL$C': 't',
  id: '2',
  'COL$A': '8/31/2019 11:25:06',
*/
const map = {
    'COL$B': {
        process: 'CollectResponses ParticipantConfig',
        port: 'in',
    },
    'COL$C': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'prompt',
    },
    'COL$D': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'max_responses',
    },
    'COL$E': {
        process: 'rsf/CollectResponses_mbtdi',
        port: 'max_time',
    },
    'COL$F': {
        process: 'SendMessageToAll ParticipantConfig',
        port: 'in'
    }
}
 
app.post('/handle', function (req, res) {

    console.log('received a new request to run a graph')
    // ?
    const inputs = Object.keys(map).map(column => {
        const inputType = map[column]
        const inputData = req.body[column]
        return {
            inputType,
            inputData
        }
    })

    runGraph(inputs, process.env.ADDRESS, process.env.TOP_SECRET)
    res.sendStatus(200)
})
 
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})