require('dotenv').config()
const { start, getJsonGraph, convertDataFromSheetToRSF } = require('./run_graph')

// const TestJsonGraph = require('./TestEnv.json')

const inputsFromSheets = [
    1234, // timestamp
    'connorturland', // CollectResponses holochain mattermost
    'connorturland', // CollectResponses diglife mattermost
    'connorturland', // CollectResponses telegram
    'sheets test prompt', // prompt
    '3', // max responses
    '300', // max time
    '', // SendMessageToAll holochain mattermost
    '', // SendMessageToAll diglife mattermost
    'connorturland', // SendMessageToAll telegram
]
const convertedInputs = convertDataFromSheetToRSF(inputsFromSheets)
console.log(convertedInputs)

const inputs = [
    {
        inputType: {
            process: 'CollectResponses ParticipantConfig',
            port: 'in',
        },
        inputData: JSON.stringify([ { 'type': 'telegram', 'id': 'connorturland' }, { 'type': 'telegram', 'id': 'robert_best' } ])
    },
    {
        inputType: {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'prompt',
        },
        inputData: 'favourite web platforms?'
    },
    {
        inputType: {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'max_responses',
        },
        inputData: 3
    },
    {
        inputType: {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'max_time',
        },
        inputData: 600
    },
    {
        inputType: {
            process: 'SendMessageToAll ParticipantConfig',
            port: 'in'
        },
        inputData: JSON.stringify([ { 'type': 'telegram', 'id': 'connorturland' }, { 'type': 'telegram', 'id': 'robert_best' } ])
    }
]

const jsonGraph = getJsonGraph(convertedInputs)

start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)

