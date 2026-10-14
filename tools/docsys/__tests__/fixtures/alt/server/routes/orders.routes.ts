import express from 'express';
import { listOrders, updateOrder } from '../orders.js';

export const ordersRouter = express.Router();
ordersRouter.get('/orders', listOrders);
ordersRouter.patch('/orders/:orderId', updateOrder);
