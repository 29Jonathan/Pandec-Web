import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticate } from './middleware/auth';
import usersRouter from './routes/users';
import ordersRouter from './routes/orders';
import offersRouter from './routes/offers';
import shipmentsRouter from './routes/shipments';
import containersRouter from './routes/containers';
import metaRouter from './routes/meta';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',              // dev
  'http://localhost:3000',              // dev
  'https://pandec-web.vercel.app',      // production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow tools like Postman (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Pandec Backend API'
  });
});

// API Routes (all require authentication)
app.use('/api/users', authenticate, usersRouter);
app.use('/api/orders', authenticate, ordersRouter);
app.use('/api/offers', authenticate, offersRouter);
app.use('/api/shipments', authenticate, shipmentsRouter);
app.use('/api/containers', authenticate, containersRouter);
app.use('/api/meta', authenticate, metaRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 Pandec Backend Server Running        ║
║   Port: ${PORT}                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   Time: ${new Date().toLocaleString()}    ║
╚═══════════════════════════════════════════╝
  `);
  console.log(`API Endpoints:
  - GET  /api/health
  - *    /api/users
  - *    /api/orders
  - *    /api/offers
  - *    /api/shipments
  - *    /api/containers
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
