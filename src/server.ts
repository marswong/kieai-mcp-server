import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pRetry from 'p-retry';
import * as z from 'zod/v4';

const server = new McpServer({
  name: 'kieai-mcp-server',
  version: '0.1.0'
});

server.registerTool(
  'text_to_image_flux_2_pro',
  {
    title: 'Text to Image FLUX 2 Pro',
    description: 'Generate image from text with FLUX 2 Pro',
    inputSchema: z.object({
      prompt: z.string().min(3).max(5000),
      aspect_ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto']).default('1:1'),
      resolution: z.enum(['1K', '2K']).default('1K'),
    }),
  },
  async ({ prompt, aspect_ratio, resolution }) => {
    const apiKey = process.env.KIEAI_API_KEY;

    if (!apiKey) {
      return { content: [{ type: 'text', text: '' }] };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    try {
      const res = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'flux-2/pro-text-to-image',
          input: { prompt, aspect_ratio, resolution },
        }),
      });

      const { code, message, data } = await res.json();

      if (code !== 200) {
        throw new Error(message);
      }

      const { taskId } = data;
      const result = await pRetry<string>(
        async () => {
          const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
            method: 'GET',
            headers,
          });
          const { code, message, data } = await res.json();
          if (code !== 200 || data.state !== 'success') {
            throw new Error(message);
          }
          const { resultUrls } = JSON.parse(data.resultJson);
          return Array.isArray(resultUrls) ? resultUrls[0] : resultUrls;
        },
        { retries: 5, minTimeout: 5000, maxTimeout: 10000 },
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (err) {
      console.error(err);
      return { content: [{ type: 'text', text: '' }] };
    }
  }
);

export default server;
