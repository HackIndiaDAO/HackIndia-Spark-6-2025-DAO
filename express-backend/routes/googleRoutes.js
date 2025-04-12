const express = require('express');
const router = express.Router();
const {
  getAuthURL,
  handleOAuthCallback,
  searchDocs,
  listDocs
} = require('../controllers/googleController');

router.get('/auth-url', getAuthURL);
router.get('/callback', handleOAuthCallback);
router.get('/search', searchDocs);
router.get('/list-files', listDocs);

module.exports = router;