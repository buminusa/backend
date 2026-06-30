var express = require('express');
var router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ message: 'Welcome to the Bumi Nusa API!' });
});

/* Auth routes */
router.use('/api/auth', authRoutes);
router.use('/api/products', productRoutes);

module.exports = router;
