import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// --- CRUD операции ---

export async function getTasks(status?: string): Promise<Task[]> {
  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Ошибка получения задач: ${error.message}`);
  return data || [];
}

export async function getTask(id: number): Promise<Task | null> {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function createTask(task: {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  due_date?: string;
}): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: task.title,
      description: task.description || null,
      priority: task.priority || "medium",
      status: "todo",
      due_date: task.due_date || null,
    })
    .select()
    .single();
  if (error) throw new Error(`Ошибка создания задачи: ${error.message}`);
  return data;
}

export async function updateTask(
  id: number,
  updates: Partial<Pick<Task, "title" | "description" | "priority" | "status" | "due_date">>
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Ошибка обновления задачи: ${error.message}`);
  return data;
}

export async function deleteTask(id: number): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Ошибка удаления задачи: ${error.message}`);
  return true;
}

export async function completeTask(id: number): Promise<Task> {
  return updateTask(id, { status: "done" });
}
