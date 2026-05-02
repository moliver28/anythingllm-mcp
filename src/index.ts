#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import https from "https";
import http from "http";
import { URL } from "url";

const ANYTHING_LLM_BASE =
  process.env.ANYTHING_LLM_BASE || "http://localhost:3001/api/v1";
const ANYTHING_LLM_API_KEY = process.env.ANYTHING_LLM_API_KEY;

if (!ANYTHING_LLM_API_KEY) {
  console.error("Error: ANYTHING_LLM_API_KEY environment variable is required");
  process.exit(1);
}

function apiRequest(path: string, method = "GET", body?: any, extraHeaders = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const baseUrl = new URL(ANYTHING_LLM_BASE);
    const fullUrl = new URL(path, baseUrl);
    const options: any = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (fullUrl.protocol === "https:" ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: Object.assign({
        "Authorization": "Bearer " + ANYTHING_LLM_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      }, extraHeaders),
    };

    const lib = fullUrl.protocol === "https:" ? https : http;
    const req = lib.request(options, (res: any) => {
      let data = "";
      res.on("data", (chunk: string) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({ raw: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = new Server(
  { name: "anythingllm-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      { name: "auth_verify", description: "Verify API token", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "system_check_token", description: "Check API token", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "system_generate_api_key", description: "Generate API key", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "system_env_dump", description: "Get system environment", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "workspace_list", description: "List all workspaces", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "workspace_get", description: "Get workspace details", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
      { name: "workspace_create", description: "Create workspace", inputSchema: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" } }, required: ["name"] } },
      { name: "workspace_update", description: "Update workspace", inputSchema: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" } }, required: ["slug"] } },
      { name: "workspace_delete", description: "Delete workspace", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
      { name: "chat_send", description: "Send chat message", inputSchema: { type: "object", properties: { workspace: { type: "string" }, message: { type: "string" } }, required: ["workspace", "message"] } },
      { name: "chat_stream", description: "Stream chat", inputSchema: { type: "object", properties: { workspace: { type: "string" }, message: { type: "string" } }, required: ["workspace", "message"] } },
      { name: "thread_list", description: "List threads", inputSchema: { type: "object", properties: { workspace: { type: "string" } }, required: ["workspace"] } },
      { name: "document_list", description: "List documents", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "openai_list_models", description: "List models", inputSchema: { type: "object", properties: {}, required: [] } },
      { name: "openai_chat_completion", description: "Chat completion", inputSchema: { type: "object", properties: { model: { type: "string" }, messages: { type: "array" } }, required: ["model", "messages"] } },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    if (name === "auth_verify") { result = await apiRequest("/auth"); }
    else if (name === "system_check_token") { result = await apiRequest("/system/check-token"); }
    else if (name === "system_generate_api_key") { result = await apiRequest("/system/generate-api-key", "POST"); }
    else if (name === "system_env_dump") { result = await apiRequest("/system/env-dump"); }
    else if (name === "workspace_list") { result = await apiRequest("/workspaces"); }
    else if (name === "workspace_get") { result = await apiRequest("/workspace/" + args?.slug); }
    else if (name === "workspace_create") { result = await apiRequest("/workspace/new", "POST", { name: args?.name, slug: args?.slug }); }
    else if (name === "workspace_update") { result = await apiRequest("/workspace/" + args?.slug + "/update", "POST", { name: args?.name }); }
    else if (name === "workspace_delete") { result = await apiRequest("/workspace/" + args?.slug, "DELETE"); }
    else if (name === "chat_send") { result = await apiRequest("/workspace/" + args?.workspace + "/chat", "POST", { message: args?.message }); }
    else if (name === "chat_stream") { result = await apiRequest("/workspace/" + args?.workspace + "/stream-chat", "POST", { message: args?.message }); }
    else if (name === "thread_list") { result = await apiRequest("/workspace/" + args?.workspace); result = { threads: result?.workspace?.threads || [] }; }
    else if (name === "document_list") { result = await apiRequest("/documents"); }
    else if (name === "openai_list_models") { result = await apiRequest("/openai/models"); }
    else if (name === "openai_chat_completion") { result = await apiRequest("/openai/chat/completions", "POST", { model: args?.model, messages: args?.messages }); }
    else { throw new McpError(ErrorCode.MethodNotFound, "Unknown tool: " + name); }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error: any) {
    throw new McpError(ErrorCode.InternalError, "AnythingLLM API error: " + error.message);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AnythingLLM MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
