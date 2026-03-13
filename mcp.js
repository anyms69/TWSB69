const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { z } = require("zod");
const express = require("express");
const { getTasks, getTask, createTask, updateTask, deleteTask, completeTask } = require("./db");

function createMcpServer() {
  const server = new McpServer({ name: "task-mcp-server", version: "1.0.0" });

  server.registerTool("tasks_list", {
    title: "Список задач",
    description: "Получить список задач. Фильтр по статусу: todo, in_progress, done",
    inputSchema: { status: z.enum(["todo","in_progress","done"]).optional() },
    annotations: { readOnlyHint: true }
  }, async ({ status }) => {
    const tasks = await getTasks(status);
    return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
  });

  server.registerTool("tasks_create", {
    title: "Создать задачу",
    description: "Создать новую задачу",
    inputSchema: {
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      priority: z.enum(["low","medium","high"]).optional(),
      due_date: z.string().optional()
    }
  }, async ({ title, description, priority, due_date }) => {
    const task = await createTask({ title, description, priority, due_date });
    return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
  });

  server.registerTool("tasks_complete", {
    title: "Выполнить задачу",
    description: "Отметить задачу выполненной по ID",
    inputSchema: { id: z.number().int().positive() }
  }, async ({ id }) => {
    const task = await completeTask(id);
    return { content: [{ type: "text", text: `✅ Задача #${id} выполнена: ${task.title}` }] };
  });

  server.registerTool("tasks_update", {
    title: "Обновить задачу",
    description: "Обновить поля задачи",
    inputSchema: {
      id: z.number().int().positive(),
      title: z.string().optional(),
      priority: z.enum(["low","medium","high"]).optional(),
      status: z.enum(["todo","in_progress","done"]).optional(),
      due_date: z.string().optional()
    }
  }, async ({ id, ...updates }) => {
    const task = await updateTask(id, updates);
    return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
  });

  server.registerTool("tasks_delete", {
    title: "Удалить задачу",
    description: "Удалить задачу по ID",
    inputSchema: { id: z.number().int().positive() },
    annotations: { destructiveHint: true }
  }, async ({ id }) => {
    await deleteTask(id);
    return { content: [{ type: "text", text: `🗑️ Задача #${id} удалена` }] };
  });

  return server;
}

function startMcpHttp(server) {
  const app = express();
  app.use(express.json());
  const authToken = process.env.MCP_AUTH_TOKEN;

  app.use("/mcp", (req, res, next) => {
    if (authToken && req.headers.authorization !== `Bearer ${authToken}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => console.log(`🚀 MCP сервер на порту ${port}`));
}

module.exports = { createMcpServer, startMcpHttp };
