import { z } from 'zod';

export const BotChatDto = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(2000, 'El mensaje no puede exceder 2000 caracteres'),
  conversationId: z.string().optional(),
});

export type BotChatDtoType = z.infer<typeof BotChatDto>;