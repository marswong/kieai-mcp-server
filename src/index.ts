import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import pRetry from 'p-retry';
import express from 'ultimate-express';
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
    inputSchema: {
      prompt: z.string().min(3).max(5000),
      aspect_ratio: z.enum(['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto']).default('1:1'),
      resolution: z.enum(['1K', '2K']).default('1K'),
    },
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
          if (code !== 200) {
            throw new Error(message);
          }
          const { resultUrls } = JSON.parse(data.resultJson);
          return resultUrls;
        },
        { retries: 3, minTimeout: 10000, maxTimeout: 10000 },
      );
      return { content: [{ type: 'text', text: result }] };
    } catch (err) {
      console.error(err);
      return { content: [{ type: 'text', text: '' }] };
    }
  }
);

const app = express();
app.set('catch async errors', true);
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '6573');
app.listen(port, () => {
  console.log(`KIEAI MCP Server running on http://localhost:${port}/mcp`);
});
