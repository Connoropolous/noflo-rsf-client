require('dotenv').config()
const express = require('express')
const app = express()

app.use(express.json())

const { getJsonGraph, start, convertDataFromSheetToRSF } = require('./run_graph.js')

app.post('/handle', function (req, res) {
    console.log('received a new request to run a graph')
    const convertedInputs = convertDataFromSheetToRSF(req.body.columns)
    const jsonGraph = getJsonGraph(convertedInputs)
    start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)
    res.sendStatus(200)
})
 
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})