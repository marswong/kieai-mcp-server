import fs from 'node:fs';
import path from 'node:path';
import test from 'ava';
import { Client } from '@modelcontextprotocol/sdk/client';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod/v4';
import server from './server.js';

const p = path.resolve(process.cwd(), '.env');
if (fs.existsSync(p)) {
  process.loadEnvFile(p);
}

test('text_to_image_flux_2_pro', async t => {
  const client = new Client({
    name: 'client',
    version: '1.0',
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  t.timeout(60000);
  const result = await client.request<any>(
    {
      method: 'tools/call',
      params: {
        name: 'text_to_image_flux_2_pro',
        arguments: {
          prompt: 'Generate a simple random logo',
          aspect_ratio: '1:1',
          resolution: '1K',
        },
      }
    },
    CallToolResultSchema,
  );

  t.true(z.url().safeParse(result.content[0].text).success);
});
