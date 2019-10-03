const fbpGraph = require('fbp-graph')
// https://github.com/flowbased/fbp-graph/blob/master/src/Graph.coffee
// https://flowbased.github.io/fbp-protocol/
const fbpClient = require('fbp-client')

async function start(jsonGraph, address, secret) {
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


const handleParticipantsData = (threeColumnIndexes, columnData) => {

    const splitFilterMap = (userlist, idFunc) => {
        return userlist
            .split('\n')
            .filter(username => username.length > 0)
            .map(idFunc)
    }

    return threeColumnIndexes.reduce((memo, columnIndex, currentIndex) => {
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
}

const convertDataFromSheetToRSF = (columnData) => {
    const inputsNeeded = [
        {
            process: 'CollectResponses ParticipantConfig',
            port: 'in',
        },
        {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'prompt',
        },
        {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'max_responses',
        },
        {
            process: 'rsf/CollectResponses_mbtdi',
            port: 'max_time',
        },
        {
            process: 'SendMessageToAll ParticipantConfig',
            port: 'in'
        }
    ]

    // all incoming data are strings
    return inputsNeeded.map((inputType, index) => {
        let inputData
        switch (index) {
            case 0:
                inputData = JSON.stringify(handleParticipantsData([1, 2, 3], columnData))
                break
            case 1:
                inputData = columnData[4]
                break
            case 2:
                inputData = parseInt(columnData[5])
                break
            case 3:
                inputData = parseInt(columnData[6])
                break
            case 4:
                inputData = JSON.stringify(handleParticipantsData([7, 8, 9], columnData))
                break
        }
        return {
            inputType,
            inputData
        }
    })
}
module.exports.convertDataFromSheetToRSF = convertDataFromSheetToRSF

const getJsonGraph = (inputs) => {
    const originalGraph = require('./collect-responses.json')

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
module.exports.getJsonGraph = getJsonGraph


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