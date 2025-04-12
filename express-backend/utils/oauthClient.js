const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials.json')));
const { client_id, client_secret, redirect_uris } = credentials.web;
console.log(redirect_uris)

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

module.exports = oAuth2Client;