# Rapid Sensemaking UI

Design and run rapid sensemaking processes!

Connects to a 'noflo runtime' in order to execute a configured flow-based programming graph.

This repo could be extended to allow different noflo graphs representing various rsf type flows. 

These flows can be designed and run on app.flowhub.io. You can then download the graph JSON files, and put them in this repo.

## Developers

EXAMPLE .env
```
URL=http://localhost:3002 # the url for which to connect to via websockets for 'clients' for ParticipantRegister
PORT=3001 # the port to run this web server at
TOP_SECRET=123asdfkj  # a scret value shared between a noflo client and noflo server
ADDRESS=ws://some-noflo-server.com  # the websocket address of the noflo server
```

