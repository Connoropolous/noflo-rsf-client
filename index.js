require('dotenv').config()
const express = require('express')
const app = express()

app.use(express.json())

const runGraph = require('./run_graph.js')
 
app.post('/handle', function (req, res) {
    console.log(req.body)
    // runGraph(process.env.ADDRESS, process.env.TOP_SECRET)
    res.sendStatus(200)
})
 
app.listen(process.env.PORT, () => {
    console.log('listening on port ' + process.env.PORT)
})