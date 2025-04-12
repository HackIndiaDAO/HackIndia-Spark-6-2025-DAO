const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();
router.post('/search', async (req, res) => {
    try {
      const response = await axios.post('http://localhost:5000/search', {
        query: req.body.query,
      });
      console.log(response)
      res.json(response.data);
    } catch (err) {
      console.error('Python search error:', err.message);
      res.status(500).json({ error: 'Search failed' });
    }
  });
  module.exports = router;