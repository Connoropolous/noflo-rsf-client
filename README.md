# noflo-rsf-client

A simple nodejs express server, designed to handle webhook requests, and connect to a 'noflo runtime' in order to execute a configured flow-based programming graph.

Has a `/handle` endpoint for receiving webhook requests from Google Scripts.

Google Form -> Google Spreadsheet -> Google Scripts hook -> **noflo-rsf-client (on heroku)** -> noflo-rsf (heroku noflo server)

This repo could be extended to allow different noflo graphs representing various rsf type flows. 

These flows can be designed and run on app.flowhub.io. You can then download the graph JSON files, and put them in this repo.

EXAMPLE .env
```
PORT=3001
TOP_SECRET=123asdfkj
ADDRESS=ws://some-noflo-server.com
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

- In the script window, go to 'View' and check 'Show manifest file'
- Open it using the file selector on the left
- Add the following to it, in order to set the correct permission scopes

**appsscript.json**
```
{
  "timeZone": "America/New_York",
  "dependencies": {
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "exceptionLogging": "STACKDRIVER"
}
```

Useful links:
- https://developers.google.com/apps-script/guides/triggers/events#edit
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
    - Event Type: On edit
- Click 'Save'
- Accept the authentication requests for your google account, to authorize it



