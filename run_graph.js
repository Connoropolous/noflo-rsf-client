const express = require('express')
const fbpGraph = require('fbp-graph')
// https://github.com/flowbased/fbp-graph/blob/master/src/Graph.coffee
// https://flowbased.github.io/fbp-protocol/
const fbpClient = require('fbp-client')
const {
    URLS,
    VIEWS
} = require('./constants')

const addGraphEndpoints = (app) => {
    app.get(URLS.RUN_GRAPH, function (req, res) {
        res.render(VIEWS.RUN_GRAPH, {
            formHandler: URLS.HANDLE_RUN_GRAPH
        })
    })

    // form handler
    app.post(URLS.HANDLE_RUN_GRAPH, express.urlencoded({ extended: true }), (req, res) => {
        console.log('received a new request to run a graph')
        const inputs = Object.keys(req.body).map(key => {
            return req.body[key]
        })
        console.log('form data', inputs)
        if (inputs.join('').length > 0) {
            const convertedInputs = convertDataFromSheetToRSF(inputs)
            const jsonGraph = overrideJsonGraph(convertedInputs, 'collect-react-results.json')
            start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)
        }
        res.status(200).send("Process Is Starting")
    })
}
module.exports.addGraphEndpoints = addGraphEndpoints

const start = async (jsonGraph, address, secret) => {
    const client = await fbpClient({
        address,
        protocol: 'websocket',
        secret
    })

    await client.connect()
    console.log('connected')

    fbpGraph.graph.loadJSON(jsonGraph, async (err, graph) => {
        if (err) {
            console.log(err)
            return
        }

        await client.protocol.graph.send(graph, true)

        console.log('sent graph')

        await client.protocol.network.start({
            graph: graph.name,
        })

        console.log('started network')
    })
}
module.exports.start = start

// going into a 'makefunction' component, hence the 'return 'return'
const handleParticipantsData = (threeColumnIndexes, columnData) => {

    const splitFilterMap = (userlist, idFunc) => {
        return userlist
            .split('\n')
            .filter(username => username.length > 0)
            .map(idFunc)
    }

    const participants = threeColumnIndexes.reduce((memo, columnIndex, currentIndex) => {
        let idFunc
        if (currentIndex === 0) {
            idFunc = (username) => ({ type: 'mattermost', id: `${username}@https://chat.holochain.org` })
        } else if (currentIndex === 1) {
            idFunc = (username) => ({ type: 'mattermost', id: `${username}@https://chat.diglife.org` })
        } else if (currentIndex === 2) {
            idFunc = username => ({ type: 'telegram', id: username })
        }
        const participants = splitFilterMap(columnData[columnIndex], idFunc)
        return memo.concat(participants)
    }, [])

    return 'return ' + JSON.stringify(participants)
}

// going into a 'makefunction' component, hence the 'return 'return'
const handleOptionsData = (optionsData) => {
    // e.g. a+A=Agree, b+B=Block/c+C=Clock
    let options = []
    optionsData
        .split(',')
        .forEach(s => {
            s.trim().split('/').forEach(o => {
                const [triggers, text] = o.split('=')
                options.push({
                    triggers: triggers.split('+'),
                    text
                })
            })
        })
    return 'return ' + JSON.stringify(options)
}

const convertDataFromSheetToRSF = (columnData) => {
    const inputsNeeded = [
        // 0
        {
            process: 'CollectResponsesPeople',
            port: 'function',
        },
        // 1
        {
            process: 'rsf/CollectResponses_lctpp',
            port: 'prompt',
        },
        // 2
        {
            process: 'rsf/CollectResponses_lctpp',
            port: 'max_responses',
        },
        // 3
        {
            process: 'rsf/CollectResponses_lctpp',
            port: 'max_time',
        },
        // 4
        {
            process: 'ResponseForEachPeople',
            port: 'function',
        },
        // 5
        {
            process: "rsf/ResponseForEach_cd3dx",
            port: "max_time"
        },
        // 6
        {
            process: "Reaction Options",
            port: "function"
        },
        // 7
        {
            process: 'SendMessageToAllPeople',
            port: 'function'
        }
    ]

    // all incoming data are strings
    return inputsNeeded.map((inputType, index) => {
        let inputData
        switch (index) {
            case 0:
                inputData = handleParticipantsData([0, 1, 2], columnData)
                break
            case 1:
                inputData = columnData[3]
                break
            case 2:
                inputData = parseInt(columnData[4])
                break
            case 3:
                inputData = parseInt(columnData[5])
                break
            case 4:
                inputData = handleParticipantsData([6, 7, 8], columnData)
                break
            case 5:
                inputData = parseInt(columnData[9])
                break
            case 6:
                inputData = handleOptionsData(columnData[10])
                break
            case 7:
                inputData = handleParticipantsData([11, 12, 13], columnData)
                break
        }
        return {
            inputType,
            inputData
        }
    })
}
module.exports.convertDataFromSheetToRSF = convertDataFromSheetToRSF

const overrideJsonGraph = (inputs, filename) => {
    const originalGraph = require(`./graphs/${filename}`)

    // most relevant connections are inputs
    const connections = originalGraph.connections.map(connection => {
        const foundOverride = inputs.find(input => {
            return input.inputType.process === connection.tgt.process && input.inputType.port === connection.tgt.port
        })
        if (foundOverride) {
            return {
                tgt: {
                    ...connection.tgt
                },
                data: foundOverride.inputData
            }
        }
        else return connection
    })

    const modifiedGraph = {
        ...originalGraph,
        // override the name, give a unique name to this graph
        properties: {
            ...originalGraph.properties,
            name: `${Math.random() * 100}randomid`
        },
        // override the connections, or inputs
        connections
    }

    return modifiedGraph
}
module.exports.overrideJsonGraph = overrideJsonGraph


/*
client.protocol = {
    component: {
        list,
        getsource,
        source
    },
    graph: {
        clear,
        addnode,
        removenode,
        renamenode,
        changenode,
        addedge,
        removeedge,
        changeedge,
        addinitial,
        removeinitial,
        addinport,
        removeinport,
        renameinport,
        addoutport,
        removeoutport,
        renameoutport,
        addgroup,
        removegroup,
        renamegroup,
        changegroup,
        send
    },
    network: {
        start,
        getstatus,
        stop,
        persist,
        debug,
        edges
    },
    runtime: {
        getruntime,
        packet
    },
    trace: {
        start,
        stop,
        dump,
        clear
    }
}
*/

/*
const graph = new fbpGraph('one-plus-one');
      graph.addNode('repeat', 'core/Repeat');
      graph.addNode('plus', 'foo/PlusOne');
      graph.addNode('output', 'core/Output');
      graph.addEdge('repeat', 'out', 'plus', 'val');
      graph.addEdge('plus', 'out', 'output', 'in');
      graph.addInitial(1, 'repeat', 'in');
      return client.protocol.graph.send(graph, true)

client.protocol.graph.addnode({
        id: 'foo',
        component: 'bar',
        graph: 'not-existing',
      })

client.protocol.network.start({
        graph: 'one-plus-one',
      })

client.protocol.network.getstatus({
        graph: 'one-plus-one',
      })

client.protocol.runtime.packet({
        graph: 'exported-plus-one',
        event: 'data',
        port: 'in',
        payload: 1,
      })

client.protocol.network.stop({
        graph: 'exported-plus-one',
      })

client.disconnect()
*/