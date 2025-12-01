# kieai-mcp-server

## Usage

> Make sure to set up env `KIEAI_API_KEY` at your runtime

Claude Code:
```sh
# Start MCP server at background
npm ci
npm run build
npm start

# add MCP server to Claude
claude mcp add --transport http kieai-mcp-server http://localhost:6573/mcp
```
