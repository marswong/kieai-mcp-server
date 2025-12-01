# kieai-mcp-server

## Usage

Make sure to set up env `KIEAI_API_KEY` first.

Claude Code:
```sh
npx -y tsx src/index.ts # or: npm ci && npm run build && npm start
claude mcp add --transport http kieai-mcp-server http://localhost:6573/mcp
```
