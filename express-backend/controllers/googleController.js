// googleController.js
const axios = require('axios');
const oAuth2Client = require('../utils/oauthClient');
const { listPDFFiles } = require('../services/googleDriveService');

exports.getAuthURL = (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'    
    ],
  });

  res.json({ url: authUrl });
};

exports.handleOAuthCallback = async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`
    }
  });

  const email = userInfo.data.email;
  const user_id = email.split('@')[0];
  console.log(user_id)
  const files = (await listPDFFiles(oAuth2Client)).slice(0, 4); // index only 2 for demo

  const payload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date,
    client_id: oAuth2Client._clientId,
    client_secret: oAuth2Client._clientSecret,
    scope: tokens.scope,
    token_uri: "https://oauth2.googleapis.com/token"
  };


  for (const file of files) {
    try {
      await axios.post('http://localhost:5000/index-file/', {
        token: payload,
        file_id: file.id,
        name: file.name,
        mimeType: file.mimeType
      });
      console.log(`Indexed ${file.name}`);
    } catch (err) {
      console.error(`Failed to index ${file.name}:`, err.message);
    }
  }

  res.redirect(`http://localhost:5173/dashboard?user_id=${user_id}`); // send user_id to client for future search
};

exports.searchDocs = async (req, res) => {
  const query = req.query.q;
  const username = req.query.username;


  if (!query || !username) return res.status(400).send('Missing ?q= and/or username');

  try {
    const result = await axios.get('http://localhost:5000/search/', {
      params: { query, username }
    });
    console.log(result.data)
    const formatted = result.data.map((item) => ({
        file: item.file,
        id: item.id,
        relevance: item.score,
        link: item.link
      }));
      
    res.json(formatted);

  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).send('Search error: ' + err.message);
  }
};

exports.listDocs = async (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).send('Missing username');
    try {
        const result = await axios.get('http://localhost:5000/list-files/', {
          params: { username }
        });
        const formatted = result.data.map((item) => ({
            file: item.file,
            id: item.id,
            link: item.link
          }));
          
        res.json(formatted);
    
      } catch (err) {
        console.error('Search error:', err.message);
        res.status(500).send('Search error: ' + err.message);
      }
}