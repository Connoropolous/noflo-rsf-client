require('dotenv').config()
const { start, overrideJsonGraph, convertDataFromSheetToRSF } = require('./run_graph')

const inputsFromSheets = {
    'rsf/CollectResponses_lctpp--prompt': 'npm run test prompt', // CollectResponses prompt
    'rsf/CollectResponses_lctpp--max_responses': '3', // CollectResponses max responses
    'rsf/CollectResponses_lctpp--max_time': '1', // CollectResponses max time (minutes)
    'rsf/ResponseForEach_cd3dx--max_time': '1', // ResponseForEach max time (minutes)
    'rsf/ResponseForEach_cd3dx--options': 'a+A=Agree, b+B=Block, c+C=Clock', // ResponseForEach options
}
const participantConfigs = [
    [ { type: 'telegram', id: 'connorturland' }], // ideation
    [ { type: 'telegram', id: 'connorturland' }], // reaction
    [ { type: 'telegram', id: 'connorturland' }] // summary
]
const convertedInputs = convertDataFromSheetToRSF(inputsFromSheets, participantConfigs)
const jsonGraph = overrideJsonGraph(convertedInputs, 'collect-react-results.json')


const dataWatcher = (signal) => {
    if (signal.id === 'rsf/FormatReactionsList_cukq9() FORMATTED -> IN core/MakeFunction_lsxgf()') {
        console.log('results', signal.data)
    }
}
start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET, dataWatcher)
    .then(() => {
        console.log('success')
        process.exit(0)
    })
    .catch(e => {
        console.log('error', e)
        process.exit(1)
    })

