# AnythingLLM MCP Server

Complete MCP (Model Context Protocol) server for AnythingLLM - the all-in-one AI document chat platform.

## Features

Zero human interaction. Just set your API key and go.

### Tools (15 total)

**System**
- `check_token` - Validate API token
- `generate_api_key` - Generate new API key (admin)

**Workspaces**
- `list_workspaces` - List all workspaces
- `get_workspace` - Get workspace details
- `create_workspace` - Create new workspace
- `update_workspace` - Update workspace settings
- `delete_workspace` - Delete a workspace

**Chat**
- `chat` - Send chat message (chat/query mode)
- `stream_chat` - Stream chat response

**Documents**
- `upload_document` - Upload document to workspace
- `update_embeddings` - Manage workspace embeddings
- `list_workspace_documents` - List workspace documents

**Threads**
- `list_threads` - List workspace threads
- `get_thread` - Get thread details
- `delete_thread` - Delete a thread

**System & Compatible**
- `get_system_env` - Get system configuration
- `openai_chat_completion` - OpenAI-compatible endpoint

## Quick Start

### 1. Install
```bash
npm install -g anythingllm-mcp
```

### 2. Set API Key
Get your API key from AnythingLLM: **Settings > Developer API**

```bash
export ANYTHING_LLM_API_KEY="your-api-key-here"
export ANYTHING_LLM_BASE="http://localhost:3001/api/v1"  # optional, default
```

### 3. Add to OpenCode
Add to your `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "anythingllm": {
      "type": "local",
      "command": ["anythingllm-mcp"],
      "environment": {
        "ANYTHING_LLM_API_KEY": "your-api-key-here",
        "ANYTHING_LLM_BASE": "http://localhost:3001/api/v1"
      },
      "enabled": true
    }
  }
}
```

### 4. Use in Any Session
The tools are now available. Example:
```
> Use the chat tool to ask AnythingLLM about my documents
```

## Development

```bash
git clone https://github.com/moliv/anythingllm-mcp.git
cd anythingllm-mcp
npm install
npm run build
```

## Requirements
- AnythingLLM running (local or remote)
- Valid API key from AnythingLLM
- Node.js 18+

## License
MIT
