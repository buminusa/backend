const path = require('path');
const dotenv = require('dotenv');
dotenv.config();  

const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const createError = require('http-errors');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');



// routers
const indexRouter = require('./src/routes/index');
const authRouter = require('./src/routes/authRoutes');
const usersRouter = require('./src/routes/usersRoutes');
const productsRouter = require('./src/routes/productsRoutes');
const companyProfileRouter = require('./src/routes/companyProfileRoutes');
const buyerRouter = require('./src/routes/buyerRoutes');
const categoriesRouter = require('./src/routes/categoriesRoutes');
const orderRouter = require('./src/routes/ordersRoutes');

const app = express();


// SECURITY
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);


// MIDDLEWARE
app.use(compression());
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// ROUTES
app.use('/', indexRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/company-profiles', companyProfileRouter);
app.use('/api/v1/buyers', buyerRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/orders', orderRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});


// ERROR HANDLING

app.use((req, res, next) => {
  next(createError(404));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isDev = req.app.get('env') === 'development';

  const status = err.status || 500;
  const response = {
    status,
    message: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  };

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json(response);
});


// SERVER
const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`[server] Running on port ${port} (${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('[server] Closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

module.exports = app;