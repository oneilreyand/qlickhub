import { Router } from 'express';
import { listItems, createItem, getItem } from './itemController.js';

export const itemRoutes = Router();
const cache = new Map<string, string>();
cache.get('not-a-route');

itemRoutes.get('/', listItems);
itemRoutes.post('/', requireRole(['owner']), createItem);
itemRoutes.get('/:itemId', getItem);
