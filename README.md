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


The google scripts hook being worked with
https://developers.google.com/apps-script/guides/triggers/events#edit
https://developers.google.com/apps-script/reference/spreadsheet/range#getValues()
https://developers.google.com/apps-script/guides/triggers/

```
var url = 'https://noflo-rsf-client.herokuapp.com/handle'

/**
 * The event handler triggered when editing the spreadsheet.
 * @param {Event} e The onEdit event.
 */
function onEdit(e) {
    // get an array of the changes values
    var columns = e.range.getValues()[0];
  
    // don't continue if there are any empty cells
    if (columns.filter(function (i) { return !i }).length > 0) {
        return;
    }

    // Make a POST request with a JSON payload.
    UrlFetchApp.fetch(url, {
        'method' : 'post',
        'contentType': 'application/json',
        // Convert the JavaScript object to a JSON string.
        'payload' : JSON.stringify({
            'columns': columns
        })
    });
}
```

Then you have to set up the 'trigger'
