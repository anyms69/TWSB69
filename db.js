const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getTasks(status) {
  let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Ошибка получения задач: " + error.message);
  return data || [];
}

async function getTask(id) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

async function createTask({ title, description, priority, due_date }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description: description || null,
      priority: priority || "medium",
      status: "todo",
      due_date: due_date || null,
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
  if (error) throw new Error("Ошибка обновления задачи: " + error.message);
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error("Ошибка удаления задачи: " + error.message);
  return true;
}

async function completeTask(id) {
  return updateTask(id, { status: "done" });
}

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, completeTask };
