import { Customer } from './entities/customer.js';
import { Order } from './entities/order.js';

Customer.hasMany(Order, { as: 'orders', foreignKey: 'customerId' });
