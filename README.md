# 🤖 Task Manager Bot + MCP Server

Менеджер задач: Telegram-бот для управления задачами с телефона + MCP-сервер для Claude.

---

## 🚀 Деплой за 4 шага

### Шаг 1 — Создать Telegram-бота

1. Откройте Telegram → найдите **@BotFather**
2. Напишите `/newbot`
3. Придумайте имя и username (например `MyTaskBot`)
4. Скопируйте **токен** — он выглядит так: `1234567890:ABCdef...`

---

### Шаг 2 — Создать базу данных в Supabase

1. Зайдите на [supabase.com](https://supabase.com) → войдите через GitHub
2. Нажмите **New project** → придумайте название и пароль
3. После создания проекта: **Settings → API**
4. Скопируйте **Project URL** и **anon public key**
5. Откройте **SQL Editor** → вставьте содержимое файла `supabase-schema.sql` → нажмите **Run**

---

### Шаг 3 — Залить код на GitHub

1. Создайте новый репозиторий на [github.com](https://github.com) (можно приватный)
2. Загрузите все файлы этого проекта

Через терминал:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_USERNAME/task-mcp-bot
git push -u origin main
```

---

### Шаг 4 — Задеплоить на Railway

1. Зайдите на [railway.app](https://railway.app) → войдите через GitHub
2. Нажмите **New Project → Deploy from GitHub repo**
3. Выберите ваш репозиторий
4. Перейдите в **Variables** и добавьте:

| Переменная | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен от BotFather |
| `SUPABASE_URL` | URL из Supabase Settings → API |
| `SUPABASE_ANON_KEY` | anon key из Supabase Settings → API |
| `MCP_AUTH_TOKEN` | придумайте любой пароль |

5. Нажмите **Deploy** — Railway сам соберёт и запустит

---

## 📱 Использование в Telegram

| Команда | Описание |
|---|---|
| `/list` | Все задачи |
| `/todo` | Активные задачи |
| `/done_list` | Выполненные |
| `/add Купить молоко` | Добавить задачу |
| `/add !Срочный звонок` | Добавить с высоким приоритетом |
| `/done 5` | Выполнить задачу #5 |
| `/progress 5` | Взять задачу #5 в работу |
| `/delete 5` | Удалить задачу #5 |
| `/priority 5 high` | Изменить приоритет |
| `/due 5 2025-12-31` | Установить срок |
| Просто текст | Быстро добавить задачу |

---

## 🤖 Подключение к Claude Desktop (опционально)

В файле конфига Claude Desktop:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tasks": {
      "type": "http",
      "url": "https://ВАШ-ПРОЕКТ.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer ВАШ_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

URL проекта найдёте в Railway Dashboard → ваш сервис → **Settings → Domains**.

---

## 🔒 Безопасность

- Токены **никогда** не хранятся в коде
- Все секреты только в переменных Railway
- MCP-сервер защищён токеном авторизации
- `.env` файл добавлен в `.gitignore`
