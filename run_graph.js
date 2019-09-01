const fbpGraph = require('fbp-graph')
// https://github.com/flowbased/fbp-graph/blob/master/src/Graph.coffee
// https://flowbased.github.io/fbp-protocol/
const fbpClient = require('fbp-client')

async function start(graph, address, secret) {
    const client = await fbpClient({
        address,
        protocol: 'websocket',
        secret
    })

    await client.connect()

    console.log('connected')


    await client.protocol.graph.send(graph, true)

    console.log('sent graph')

    await client.protocol.network.start({
        graph: graph.name,
    })

    console.log('started network')
}

function convertDataFromSheetToRSF(connection, inputData, mattermostServer) {
    // all incoming data are strings
    if (connection.tgt.process === 'CollectResponses ParticipantConfig' && connection.tgt.port === 'in') {
        return JSON.stringify(inputData.split('\n').map(username => ({
            type: 'mattermost',
            id: `${username}@${mattermostServer}`
        })))
    }
    else if (connection.tgt.process === 'rsf/CollectResponses_mbtdi' && connection.tgt.port === 'prompt') {
        return inputData
    }
    else if (connection.tgt.process === 'rsf/CollectResponses_mbtdi' && connection.tgt.port === 'max_responses') {
        return parseInt(inputData)
    }
    else if (connection.tgt.process === 'rsf/CollectResponses_mbtdi' && connection.tgt.port === 'max_time') {
        return parseInt(inputData)
    }
    else if (connection.tgt.process === 'SendMessageToAll ParticipantConfig' && connection.tgt.port === 'in') {
        return JSON.stringify(inputData.split('\n').map(username => ({
            type: 'mattermost',
            id: `${username}@${mattermostServer}`
        })))
    }
}

module.exports = (inputs, mattermostServer, address, secret) => {
    const originalGraph = require('./collect-responses.json')
    const modifiedGraph = {
        ...originalGraph,
        // override the name, give a unique name to this graph
        properties: {
            ...originalGraph.properties,
            name: `${Math.random() * 100}randomid`
        },
        // override the connections
        connections: originalGraph.connections.map(connection => {
            const foundOverride = inputs.find(input => {
                return input.inputType.process === connection.tgt.process && input.inputType.port === connection.tgt.port
            })
            if (foundOverride) {
                return {
                    tgt: {
                        ...connection.tgt
                    },
                    data: convertDataFromSheetToRSF(connection, foundOverride.inputData, mattermostServer)
                }
            }
            else return connection
        })
    }

    fbpGraph.graph.loadJSON(modifiedGraph, (err, graph) => {
        if (!err) start(graph, address, secret)
        else console.log(err)
    })
}



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