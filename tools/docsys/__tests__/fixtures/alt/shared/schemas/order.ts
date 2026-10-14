import { z } from 'zod';

export const OrderStateSchema = z.enum(['open', 'paid']);
export const OrderSchema = z.object({ id: z.string(), total: z.number(), state: OrderStateSchema });
