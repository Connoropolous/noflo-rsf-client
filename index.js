const express = require('express')
const app = express()

app.use(express.json())

const runGraph = require('./run_graph')
 
app.post('/handle', function (req, res) {
    console.log(req.body)
    runGraph()
    res.sendStatus(200)
})
 
app.listen(process.env.PORT)