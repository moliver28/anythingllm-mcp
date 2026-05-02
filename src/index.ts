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
  console.error(
    "Error: ANYTHING_LLM_API_KEY environment variable is required"
  );
  process.exit(1);
}

interface AnythingLLMResponse {
  [key: string]: any;
}

function apiRequest(
  path: string,
  method = "GET",
  body?: any
): Promise<AnythingLLMResponse> {
  return new Promise((resolve, reject) => {
    const baseUrl = new URL(ANYTHING_LLM_BASE);
    const fullUrl = new URL(path, baseUrl);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (fullUrl.protocol === "https:" ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        Authorization: `Bearer ${ANYTHING_LLM_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    const lib = fullUrl.protocol === "https:" ? https : http;
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
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
      // System Tools
      {
        name: "check_token",
        description: "Validate the current API token",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "generate_api_key",
        description: "Generate a new API key (admin)",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },

      // Workspace Tools
      {
        name: "list_workspaces",
        description: "List all workspaces",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_workspace",
        description: "Get details of a specific workspace",
        inputSchema: {
          type: "object",
          properties: { slug: { type: "string" } },
          required: ["slug"],
        },
      },
      {
        name: "create_workspace",
        description: "Create a new workspace",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            openAiTemp: { type: "number" },
            openAiHistory: { type: "number" },
            similarityThreshold: { type: "number" },
            topN: { type: "number" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_workspace",
        description: "Update workspace settings",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            openAiTemp: { type: "number" },
            openAiHistory: { type: "number" },
            systemPrompt: { type: "string" },
            similarityThreshold: { type: "number" },
            topN: { type: "number" },
          },
          required: ["slug"],
        },
      },
      {
        name: "delete_workspace",
        description: "Delete a workspace",
        inputSchema: {
          type: "object",
          properties: { slug: { type: "string" } },
          required: ["slug"],
        },
      },

      // Chat Tools
      {
        name: "chat",
        description: "Send a chat message to a workspace (mode: chat or query)",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            message: { type: "string" },
            mode: { type: "string", enum: ["chat", "query"] },
            userId: { type: "number" },
          },
          required: ["workspace", "message"],
        },
      },
      {
        name: "stream_chat",
        description: "Stream a chat message to a workspace",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            message: { type: "string" },
            mode: { type: "string", enum: ["chat", "query"] },
            userId: { type: "number" },
            threadSlug: { type: "string" },
          },
          required: ["workspace", "message"],
        },
      },

      // Document Tools
      {
        name: "upload_document",
        description: "Upload a document to a workspace",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            filePath: { type: "string" },
          },
          required: ["workspace", "filePath"],
        },
      },
      {
        name: "update_embeddings",
        description: "Add or remove documents from workspace embeddings",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            adds: { type: "array", items: { type: "string" } },
            deletes: { type: "array", items: { type: "string" } },
          },
          required: ["workspace"],
        },
      },
      {
        name: "list_workspace_documents",
        description: "List all documents in a workspace",
        inputSchema: {
          type: "object",
          properties: { slug: { type: "string" } },
          required: ["slug"],
        },
      },

      // Thread Tools
      {
        name: "list_threads",
        description: "List all threads in a workspace",
        inputSchema: {
          type: "object",
          properties: { workspace: { type: "string" } },
          required: ["workspace"],
        },
      },
      {
        name: "get_thread",
        description: "Get details of a specific thread",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            threadSlug: { type: "string" },
          },
          required: ["workspace", "threadSlug"],
        },
      },
      {
        name: "delete_thread",
        description: "Delete a thread from a workspace",
        inputSchema: {
          type: "object",
          properties: {
            workspace: { type: "string" },
            threadSlug: { type: "string" },
          },
          required: ["workspace", "threadSlug"],
        },
      },

      // System Settings Tools
      {
        name: "get_system_env",
        description: "Get system environment configuration",
        inputSchema: { type: "object", properties: {}, required: [] },
      },

      // OpenAI Compatible Tools
      {
        name: "openai_chat_completion",
        description:
          "OpenAI-compatible chat completion endpoint (use workspace as model)",
        inputSchema: {
          type: "object",
          properties: {
            model: { type: "string" },
            messages: { type: "array" },
            stream: { type: "boolean" },
          },
          required: ["model", "messages"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      // System
      case "check_token":
        result = await apiRequest("/system/check-token");
        break;

      case "generate_api_key":
        result = await apiRequest("/system/generate-api-key", "POST");
        break;

      // Workspaces
      case "list_workspaces":
        result = await apiRequest("/workspaces");
        break;

      case "get_workspace":
        result = await apiRequest(`/workspace/${args?.slug}`);
        break;

      case "create_workspace": {
        const body: any = { name: args?.name };
        if (args?.slug) body.slug = args.slug;
        if (args?.openAiTemp) body.openAiTemp = args.openAiTemp;
        if (args?.openAiHistory) body.openAiHistory = args.openAiHistory;
        if (args?.similarityThreshold)
          body.similarityThreshold = args.similarityThreshold;
        if (args?.topN) body.topN = args.topN;
        result = await apiRequest("/workspace/new", "POST", body);
        break;
      }

      case "update_workspace": {
        const body: any = {};
        if (args?.name) body.name = args.name;
        if (args?.openAiTemp !== undefined) body.openAiTemp = args.openAiTemp;
        if (args?.openAiHistory !== undefined)
          body.openAiHistory = args.openAiHistory;
        if (args?.systemPrompt) body.systemPrompt = args.systemPrompt;
        if (args?.similarityThreshold !== undefined)
          body.similarityThreshold = args.similarityThreshold;
        if (args?.topN !== undefined) body.topN = args.topN;
        result = await apiRequest(`/workspace/${args?.slug}/update`, "POST", body);
        break;
      }

      case "delete_workspace":
        result = await apiRequest(`/workspace/${args?.slug}`, "DELETE");
        break;

      // Chat
      case "chat":
        result = await apiRequest(`/workspace/${args?.workspace}/chat`, "POST", {
          message: args?.message,
          mode: args?.mode || "chat",
          userId: args?.userId,
        });
        break;

      case "stream_chat":
        result = await apiRequest(
          `/workspace/${args?.workspace}/stream-chat`,
          "POST",
          {
            message: args?.message,
            mode: args?.mode || "chat",
            userId: args?.userId,
            threadSlug: args?.threadSlug,
          }
        );
        break;

      // Documents
      case "list_workspace_documents":
        result = await apiRequest(`/workspace/${args?.slug}`);
        result = { documents: result?.workspace?.documents || [] };
        break;

      case "update_embeddings":
        result = await apiRequest(
          `/workspace/${args?.workspace}/update-embeddings`,
          "POST",
          {
            adds: args?.adds || [],
            deletes: args?.deletes || [],
          }
        );
        break;

      // Threads
      case "list_threads":
        result = await apiRequest(`/workspace/${args?.workspace}`);
        result = { threads: result?.workspace?.threads || [] };
        break;

      case "get_thread":
        result = await apiRequest(
          `/workspace/${args?.workspace}/thread/${args?.threadSlug}`
        );
        break;

      case "delete_thread":
        result = await apiRequest(
          `/workspace/${args?.workspace}/thread/${args?.threadSlug}`,
          "DELETE"
        );
        break;

      // System
      case "get_system_env":
        result = await apiRequest("/system/env-dump");
        break;

      // OpenAI Compatible
      case "openai_chat_completion":
        result = await apiRequest("/openai/chat/completions", "POST", {
          model: args?.model,
          messages: args?.messages,
          stream: args?.stream || false,
        });
        break;

      // Document upload (simplified - returns instructions)
      case "upload_document":
        result = {
          note: "Document upload requires multipart form data. Use AnythingLLM UI or direct API call to /api/v1/document/upload with file attachment.",
          workspace: args?.workspace,
          filePath: args?.filePath,
        };
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `AnythingLLM API error: ${error.message}`
    );
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
