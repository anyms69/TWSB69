const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getTasks(filters = {}) {
  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  const { data, error } = await query;
  if (error) throw new Error("Ошибка получения задач: " + error.message);
  return data || [];
}

async function getTask(id) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

async function searchTasks(query) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .ilike("title", `%${query}%`)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Ошибка поиска: " + error.message);
  return data || [];
}

async function createTask({ title, description, priority, due_date, category, remind_at, tags, notes }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: description || null,
      priority: priority || "medium",
      status: "todo",
      due_date: due_date || null,
      category: category || null,
      remind_at: remind_at || null,
      tags: tags || [],
      notes: notes || null,
      subtasks: [],
    })
    .select()
    .single();
  if (error) throw new Error("Ошибка создания задачи: " + error.message);
  return data;
}

async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error("Ошибка обновления: " + error.message);
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error("Ошибка удаления: " + error.message);
  return true;
}

async function completeTask(id) {
  return updateTask(id, { status: "done" });
}

async function addSubtask(taskId, subtaskTitle) {
  const task = await getTask(taskId);
  if (!task) throw new Error("Задача не найдена");
  const subtasks = task.subtasks || [];
  subtasks.push({ id: Date.now(), title: subtaskTitle, done: false });
  return updateTask(taskId, { subtasks });
}

async function completeSubtask(taskId, subtaskId) {
  const task = await getTask(taskId);
  if (!task) throw new Error("Задача не найдена");
  const subtasks = (task.subtasks || []).map(s =>
    s.id === subtaskId ? { ...s, done: true } : s
  );
  return updateTask(taskId, { subtasks });
}

async function getStats() {
  const { data, error } = await supabase.from("tasks").select("status, priority, created_at");
  if (error) throw new Error("Ошибка статистики: " + error.message);
  const tasks = data || [];
  const today = new Date().toDateString();
  return {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
    high: tasks.filter(t => t.priority === "high").length,
    done_today: tasks.filter(t => t.status === "done" && new Date(t.updated_at).toDateString() === today).length,
  };
}

async function getReminders() {
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .neq("status", "done")
    .lte("remind_at", soon)
    .gte("remind_at", now);
  if (error) return [];
  return data || [];
}

async function getCategories() {
  const { data, error } = await supabase
    .from("tasks")
    .select("category")
    .neq("category", null);
  if (error) return [];
  const cats = [...new Set((data || []).map(t => t.category).filter(Boolean))];
  return cats;
}

module.exports = {
  getTasks, getTask, searchTasks, createTask, updateTask,
  deleteTask, completeTask, addSubtask, completeSubtask,
  getStats, getReminders, getCategories
};
