# noflo-rsf-client

has a `/handle` endpoint for receiving webhook requests from Zapier. 

Google Form -> Google Spreadsheet -> Zapier Zap (automation recipe) -> noflo-rsf-client (on heroku) -> noflo-rsf (heroku noflo server)

This repo could be extended to allow different noflo graphs representing various rsf type flows. 

These flows can be designed and run on app.flowhub.io. You can then download the graph JSON files, and put them in this repo.

EXAMPLE .env
```
PORT=3001
TOP_SECRET=123asdfkj
ADDRESS=ws://some-noflo-server.com
```
