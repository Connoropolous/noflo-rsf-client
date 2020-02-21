# Rapid Sensemaking Participant Register UI

connect to this server with a websocket, simplified using [rsf-http-register-client](https://github.com/rapid-sensemaking-framework/rsf-http-register-client), and open up web pages to accept user registrations for [rsf-contactables](https://github.com/rapid-sensemaking-framework/rsf-contactable).

## Environment Variables

This project uses dotenv, which means you can create a `.env` file in this folder to configure environment variables, otherwise set them however you wish.

Explanations of the environment variables follow:

```bash
# Optional: enables a development page at /dev-register for development purposes
NODE_ENV=development
# Required: sets the networking port the service should run on
PORT=3012
```

## Usage

This creates a new bin, callable via npx as `rsf-http-register`.
If in the project folder, you can call `npm start` for the same result.

There is a script for building the typescript files, run `npm run build`.

Also can be worked with as a library, by importing it.

Use it like:

```js
const start = require('rsf-http-register').default
start()
```

Can be utilized along with the

`noflo-rsf` [ParticipantRegister](https://github.com/rapid-sensemaking-framework/noflo-rsf/blob/master/components/ParticipantRegister.js) component, and/or with

`electron-rsf`: [electron-rsf](https://github.com/rapid-sensemaking-framework/rsf-electron) A downloadable app, which gives a UI for setting up and configuring rsf processes
