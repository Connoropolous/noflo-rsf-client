const express = require('express')
const fbpGraph = require('fbp-graph')
// https://github.com/flowbased/fbp-graph/blob/master/src/Graph.coffee
// https://flowbased.github.io/fbp-protocol/
const fbpClient = require('fbp-client')
const {
    URLS,
    VIEWS
} = require('./constants')
const {
    guidGenerator,
    standUpRegisterPageAndGetResults,
    remainingTime
} = require('./participantRegister')

// hold process awareness
const processes = {}

const addGraphEndpoints = (app) => {
    app.get(URLS.CONFIGURE_1, function (req, res) {
        res.render(VIEWS.CONFIGURE_1, {
            formHandler: URLS.HANDLE_CONFIGURE_1
        })
    })

    app.get(URLS.CONFIGURE_2, function (req, res) {
        // load up the saved process at the given id
        const config = processes[req.params.processId]
        if (config) {
            const keys = ['ideation', 'reaction', 'summary'].reduce((memo, value, index) => {
                memo[`${value}IsFacilitator`] = config.participantConfigs[index].isFacilitator
                memo[`${value}ShowParticipants`] = !!config[`${value}Participants`].length
                // non facilitator keys
                memo[`${value}Url`] = `${process.env.URL}${config.paths[index]}`
                memo[`${value}RemainingTime`] = remainingTime(config.participantConfigs[index].maxTime, config.startTime)
                // facilitator keys
                memo[`${value}FormHandler`] = URLS.HANDLE_REGISTER(config.paths[index])
                memo[`${value}ShowForm`] = config.participantConfigs[index].isFacilitator && config[`${value}Participants`].length === 0
                return memo
            }, {})
            res.render(VIEWS.CONFIGURE_2, {
                ...config,
                ...keys
            })
        } else {
            res.sendStatus(404)
        }
    })

    // form handler
    app.post(URLS.HANDLE_CONFIGURE_1, express.urlencoded({ extended: true }), async (req, res) => {

        const processId = guidGenerator()
        const startTime = Date.now()

        let participantConfigs = getParticipantConfigs(req.body)

        // boot up participant config stages
        const ideationPath = `${URLS.REGISTER}/${guidGenerator()}`
        const reactionPath = `${URLS.REGISTER}/${guidGenerator()}`
        const summaryPath = `${URLS.REGISTER}/${guidGenerator()}`
        const paths = [ideationPath, reactionPath, summaryPath]

        // save this process to memory
        processes[processId] = {
            startTime,
            processId,
            participantConfigs,
            paths,
            inputs: req.body,
            ideationParticipants: [],
            reactionParticipants: [],
            summaryParticipants: []
        }
        
        // capture the results for each as they come in
        // do this in a non-blocking way
        const callbacks = [
            newP => { processes[processId].ideationParticipants.push(newP) },
            newP => { processes[processId].reactionParticipants.push(newP) },
            newP => { processes[processId].summaryParticipants.push(newP) }
        ]
        // capture the sum results for each
        const promises = proceedWithParticipantConfig(app, paths, participantConfigs, callbacks)
        promises[0].then(ideationParticipants => {
            processes[processId].ideationParticipants = ideationParticipants
        })
        promises[1].then(reactionParticipants => {
            processes[processId].reactionParticipants = reactionParticipants
        })
        promises[2].then(summaryParticipants => {
            processes[processId].summaryParticipants = summaryParticipants
        })
        // once they're all ready, now commence the process
        Promise.all(promises).then(participantArrays => {
            // mark as running now
            processes[processId].running = true
            const convertedInputs = convertDataFromSheetToRSF(req.body, participantArrays)
            const jsonGraph = overrideJsonGraph(convertedInputs, 'collect-react-results.json')
            start(jsonGraph, process.env.ADDRESS, process.env.TOP_SECRET)
        })

        console.log('created a new process configuration', processes[processId])
        
        res.redirect(URLS.CONFIGURE_2.replace(':processId', processId))
    })
}
module.exports.addGraphEndpoints = addGraphEndpoints

const getParticipantConfigs = (formInput) => {
    return ['CollectResponses', 'ResponseForEach', 'SendMessageToAll'].map((s, index) => {
        let processContext
        if (index === 0) processContext = 'Ideation'
        else if (index === 1) processContext = 'Reaction'
        else if (index === 2) processContext = 'Summary'

        return {
            stage: s,
            isFacilitator: formInput[`${s}-check-facil_register`] === 'facil_register',
            processContext: formInput[`${s}-ParticipantRegister-process_context`] || processContext,
            maxTime: formInput[`${s}-ParticipantRegister-max_time`] || 300, // five minute default
            maxParticipants: formInput[`${s}-ParticipantRegister-max_participants`] || '*' // unlimited default
        }
    })
}
module.exports.getParticipantConfigs = getParticipantConfigs

const proceedWithParticipantConfig = (app, paths, participantConfigs, callbacks) => {
    return paths.map((path, index) => {
        return standUpRegisterPageAndGetResults(
            app,
            path,
            participantConfigs[index].maxTime,
            participantConfigs[index].maxParticipants,
            participantConfigs[index].isFacilitator,
            participantConfigs[index].processContext || processContext,
            callbacks[index]
        )
    })
}
module.exports.proceedWithParticipantConfig = proceedWithParticipantConfig

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
const handleParticipantsData = (participants) => {
    return 'return ' + JSON.stringify(participants)
}

// going into a 'makefunction' component, hence the 'return 'return'
const handleOptionsData = (optionsData) => {
    // e.g. a+A=Agree, b+B=Block, c+C=Clock
    let options = optionsData
        .split(',')
        .map(s => {
            // trim cleans white space
            const [triggers, text] = s.trim().split('=')
            return {
                triggers: triggers.split('+'),
                text
            }
        })
    return 'return ' + JSON.stringify(options)
}

const convertDataFromSheetToRSF = (inputs, [ideationParticipants, reactionParticipants, summaryParticipants]) => {
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
            process: "ReactionOptions",
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
                inputData = handleParticipantsData(ideationParticipants)
                break
            case 1:
                inputData = inputs[`${inputType.process}--${inputType.port}`]
                break
            case 2: // max_responses
            case 3: // max_time
            case 5: // max_time
                inputData = parseInt(inputs[`${inputType.process}--${inputType.port}`])
                break
            case 4:
                inputData = handleParticipantsData(reactionParticipants)
                break
            case 6:
                inputData = handleOptionsData(inputs[`${inputType.process}--${inputType.port}`])
                break
            case 7:
                inputData = handleParticipantsData(summaryParticipants)
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