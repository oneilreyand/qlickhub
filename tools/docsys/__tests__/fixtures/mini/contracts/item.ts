import { z } from 'zod';

export const ItemStatusSchema = z.enum(['open', 'closed']);
export const ItemSchema = z
  .object({ id: z.string().uuid(), name: z.string(), status: ItemStatusSchema })
  .strict();
export const CreateItemSchema = ItemSchema.extend({ note: z.string().optional() });
const InternalSchema = z.object({ secret: z.string() });
export type Item = z.infer<typeof ItemSchema>;
