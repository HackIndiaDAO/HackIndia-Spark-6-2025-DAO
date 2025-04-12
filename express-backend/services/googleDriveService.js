// googleDriveService.js
const { google } = require('googleapis');

exports.listPDFFiles = async (auth) => {
  const drive = google.drive({ version: 'v3', auth });
  const result = await drive.files.list({
    q: "mimeType='application/pdf' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation'",
    fields: 'files(id, name, mimeType)',
  });
  return result.data.files;
};