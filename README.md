# noflo-rsf-client

A simple nodejs express server, designed to handle webhook requests, and connect to a 'noflo runtime' in order to execute a configured flow-based programming graph.

Has a `/handle` endpoint for receiving webhook requests from Google Scripts.

Google Form -> Google Spreadsheet -> Google Scripts hook -> **noflo-rsf-client (on heroku)** -> noflo-rsf (heroku noflo server)

This repo could be extended to allow different noflo graphs representing various rsf type flows. 

These flows can be designed and run on app.flowhub.io. You can then download the graph JSON files, and put them in this repo.

EXAMPLE .env
```
URL=http://localhost:3002 # the url for which to connect to via websockets for 'clients' for ParticipantRegister
PORT=3001 # the port to run this web server at
TOP_SECRET=123asdfkj  # a scret value shared between a noflo client and noflo server
ADDRESS=ws://some-noflo-server.com  # the websocket address of the noflo server
```


# Set up the script

- In the Google Sheet, of the form responses, go to 'Tools -> Script editor'
- Add the following code to `Code.gs`

**Code.gs**
```
var url = 'https://noflo-rsf-client.herokuapp.com/handle'

/**
 * The event handler triggered when editing the spreadsheet.
 * @param {Event} e The onEdit event.
 */
function onEdit(e) {
    // get an array of the changes values
    var columns = e.range.getValues()[0]

    // Make a POST request with a JSON payload.
    UrlFetchApp.fetch(url, {
        'method' : 'post',
        'contentType': 'application/json',
        // Convert the JavaScript object to a JSON string.
        'payload' : JSON.stringify({
            'columns': columns
        })
    })
}
```

Useful links:
- https://developers.google.com/apps-script/guides/triggers/events#form-submit
- https://developers.google.com/apps-script/reference/spreadsheet/range#getValues()
- https://developers.google.com/apps-script/guides/triggers/

## Set up the trigger

- Go to https://script.google.com/home/my and click on your script.
- Go to 'Project Details -> ...(vertical) -> Triggers'
- Click '+ Add Trigger' in the bottom right
- Configure it as follows:
    - Function: onEdit
    - Deployment: Head
    - Event Source: From spreadsheet
    - Event Type: On form submit
- Click 'Save'
- Accept the authentication requests for your google account, to authorize it



