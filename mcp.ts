import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express, { Request, Response } from "express";
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from "./db";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "task-mcp-server",
    version: "1.0.0",
  });

  // --- tasks_list ---
  server.registerTool(
    "tasks_list",
    {
      title: "Список задач",
      description: "Получить список всех задач. Можно фильтровать по статусу: todo, in_progress, done",
      inputSchema: {
        status: z.enum(["todo", "in_progress", "done"]).optional().describe("Фильтр по статусу"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status }) => {
      const tasks = await getTasks(status);
      return {
        content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }],
        structuredContent: { tasks },
      };
    }
  );

  // --- tasks_get ---
  server.registerTool(
    "tasks_get",
    {
      title: "Получить задачу",
      description: "Получить детали задачи по ID",
      inputSchema: {
        id: z.number().int().positive().describe("ID задачи"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const task = await getTask(id);
      if (!task) throw new Error(`Задача #${id} не найдена`);
      return {
        content: [{ type: "text", text: JSON.stringify(task, null, 2) }],
        structuredContent: { task },
      };
    }
  );

  // --- tasks_create ---
  server.registerTool(
    "tasks_create",
    {
      title: "Создать задачу",
      description: "Создать новую задачу в менеджере",
      inputSchema: {
        title: z.string().min(1).max(500).describe("Название задачи"),
        description: z.string().optional().describe("Описание задачи"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Приоритет (low/medium/high)"),
        due_date: z.string().optional().describe("Срок выполнения в формате ГГГГ-ММ-ДД"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ title, description, priority, due_date }) => {
      const task = await createTask({ title, description, priority, due_date });
      return {
        content: [{ type: "text", text: `Задача создана: ${JSON.stringify(task, null, 2)}` }],
        structuredContent: { task },
      };
    }
  );

  // --- tasks_update ---
  server.registerTool(
    "tasks_update",
    {
      title: "Обновить задачу",
      description: "Обновить поля задачи (название, описание, приоритет, статус, срок)",
      inputSchema: {
        id: z.number().int().positive().describe("ID задачи"),
        title: z.string().min(1).max(500).optional().describe("Новое название"),
        description: z.string().optional().describe("Новое описание"),
        priority: z.enum(["low", "medium", "high"]).optional().describe("Новый приоритет"),
        status: z.enum(["todo", "in_progress", "done"]).optional().describe("Новый статус"),
        due_date: z.string().optional().describe("Новый срок ГГГГ-ММ-ДД"),
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ id, ...updates }) => {
      const task = await updateTask(id, updates);
      return {
        content: [{ type: "text", text: `Задача обновлена: ${JSON.stringify(task, null, 2)}` }],
        structuredContent: { task },
      };
    }
  );

  // --- tasks_complete ---
  server.registerTool(
    "tasks_complete",
    {
      title: "Выполнить задачу",
      description: "Отметить задачу как выполненную",
      inputSchema: {
        id: z.number().int().positive().describe("ID задачи"),
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ id }) => {
      const task = await completeTask(id);
      return {
        content: [{ type: "text", text: `✅ Задача #${id} выполнена: ${task.title}` }],
        structuredContent: { task },
      };
    }
  );

  // --- tasks_delete ---
  server.registerTool(
    "tasks_delete",
    {
      title: "Удалить задачу",
      description: "Удалить задачу по ID",
      inputSchema: {
        id: z.number().int().positive().describe("ID задачи"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id }) => {
      await deleteTask(id);
      return {
        content: [{ type: "text", text: `🗑️ Задача #${id} удалена` }],
        structuredContent: { deleted: true, id },
      };
    }
  );

  return server;
}

export function startMcpHttp(server: McpServer): void {
  const app = express();
  app.use(express.json());

  const authToken = process.env.MCP_AUTH_TOKEN;

  // Middleware авторизации
  app.use("/mcp", (req: Request, res: Response, next) => {
    if (authToken) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${authToken}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }
    next();
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "task-mcp-bot" });
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, () => {
    console.log(`🚀 MCP сервер запущен на порту ${port}`);
    console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
  });
}
