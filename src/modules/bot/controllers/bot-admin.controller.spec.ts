import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { BotAdminController } from './bot-admin.controller';
import type { HuggingFaceService } from '../services/huggingface.service';

describe('BotAdminController', () => {
  it('delegates thread message lookups to the bot service', async () => {
    const expectedMessages = [
      {
        id: 'message-1',
        threadId: 'thread-1',
        role: 'user',
        content: 'Hola',
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
      },
      {
        id: 'message-2',
        threadId: 'thread-1',
        role: 'assistant',
        content: '¿Cómo va?',
        createdAt: new Date('2026-05-05T10:00:01.000Z'),
      },
    ];

    const botService: Pick<HuggingFaceService, 'getThreadMessages'> = {
      getThreadMessages: jest.fn().mockResolvedValue(expectedMessages),
    };

    const controller = new BotAdminController(botService as HuggingFaceService);

    await expect(controller.listThreadMessages('thread-1')).resolves.toEqual(expectedMessages);
    expect(botService.getThreadMessages).toHaveBeenCalledWith('thread-1');
    expect(botService.getThreadMessages).toHaveBeenCalledTimes(1);
  });

  it('exposes the admin thread message route metadata', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BotAdminController)).toBe('admin/bot');
    expect(Reflect.getMetadata(PATH_METADATA, BotAdminController.prototype.listThreadMessages)).toBe(
      'threads/:id/messages',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, BotAdminController.prototype.listThreadMessages)).toBe(
      RequestMethod.GET,
    );
  });
});
