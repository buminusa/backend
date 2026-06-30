var express = require('express');
var router = express.Router();

const authRoutes = require('./authRoutes');
const productRoutes = require('./productsRoutes');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ message: 'Welcome to the Bumi Nusa API!' });
});

module.exports = router;
