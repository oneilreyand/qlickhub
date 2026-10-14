import express from 'express';
import { ordersRouter } from './routes/orders.routes.js';

const server = express();
server.use('/api', ordersRouter);
server.listen(3000);
