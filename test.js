require('dotenv').config()
const { start, overrideJsonGraph, convertDataFromSheetToRSF } = require('./run_graph')

const inputsFromSheets = [
    1234, // timestamp
    '', // 'connorturland', // CollectResponses holochain mattermost
    '', // 'connorturland', // CollectResponses diglife mattermost
    'connorturland', // CollectResponses telegram
    'sheets test prompt', // CollectResponses prompt
    '3', // CollectResponses max responses
    '300', // CollectResponses max time
    '', // ResponseForEach holochain mattermost
    '', // ResponseForEach diglife mattermost
    'connorturland', // ResponseForEach telegram
    '300', // ResponseForEach max time
    'a+A=Agree, b+B=Block/c+C=Clock', // ResponseForEach options
    '', // SendMessageToAll holochain mattermost
    '', // SendMessageToAll diglife mattermost
    'connorturland', // SendMessageToAll telegram
]
const convertedInputs = convertDataFromSheetToRSF(inputsFromSheets)
console.log(convertedInputs)

const jsonGraph = overrideJsonGraph(convertedInputs, 'collect-react-results.json')

start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)

