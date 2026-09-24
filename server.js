const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./openapi.json");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3000;

app.use(express.json());

// SQLite database
const db = new Database("tasks.db");

// Create tasks table if it does not exist
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0
    )
`);

// Seed initial tasks only if the table is empty
const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();

if (taskCount.count === 0) {
    const insertTask = db.prepare(
        "INSERT INTO tasks (title, done) VALUES (?, ?)"
    );

    insertTask.run("Learn JavaScript", 0);
    insertTask.run("Build CRUD API", 0);
    insertTask.run("Test API with Swagger", 0);
}

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "Task API",
        version: "1.0",
        endpoints: ["/tasks"]
    });
});

// Health endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

// Get all tasks
app.get("/tasks", (req, res) => {
    const tasks = db
        .prepare("SELECT id, title, done FROM tasks")
        .all()
        .map(task => ({
            id: task.id,
            title: task.title,
            done: Boolean(task.done)
        }));

    res.json(tasks);
});

// Get task by ID
app.get("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);

    const task = db
        .prepare("SELECT id, title, done FROM tasks WHERE id = ?")
        .get(id);

    if (!task) {
        return res.status(404).json({
            error: `Task ${id} not found`
        });
    }

    res.json({
        id: task.id,
        title: task.title,
        done: Boolean(task.done)
    });
});

// Create a new task
app.post("/tasks", (req, res) => {
    const { title } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({
            error: "Title is required"
        });
    }

    const result = db
        .prepare("INSERT INTO tasks (title, done) VALUES (?, ?)")
        .run(title.trim(), 0);

    const newTask = db
        .prepare("SELECT id, title, done FROM tasks WHERE id = ?")
        .get(result.lastInsertRowid);

    res.status(201).json({
        id: newTask.id,
        title: newTask.title,
        done: Boolean(newTask.done)
    });
});

// Update a task
app.put("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);

    const task = db
        .prepare("SELECT id, title, done FROM tasks WHERE id = ?")
        .get(id);

    if (!task) {
        return res.status(404).json({
            error: `Task ${id} not found`
        });
    }

    const { title, done } = req.body;

    if (
        (title !== undefined &&
            (typeof title !== "string" || title.trim() === "")) ||
        (done !== undefined && typeof done !== "boolean")
    ) {
        return res.status(400).json({
            error: "Invalid task data"
        });
    }

    const updatedTitle =
        title !== undefined ? title.trim() : task.title;

    const updatedDone =
        done !== undefined ? done : Boolean(task.done);

    db.prepare(`
        UPDATE tasks
        SET title = ?, done = ?
        WHERE id = ?
    `).run(
        updatedTitle,
        updatedDone ? 1 : 0,
        id
    );

    const updatedTask = db
        .prepare("SELECT id, title, done FROM tasks WHERE id = ?")
        .get(id);

    res.json({
        id: updatedTask.id,
        title: updatedTask.title,
        done: Boolean(updatedTask.done)
    });
});

// Delete a task
app.delete("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);

    const result = db
        .prepare("DELETE FROM tasks WHERE id = ?")
        .run(id);

    if (result.changes === 0) {
        return res.status(404).json({
            error: `Task ${id} not found`
        });
    }

    res.status(204).send();
});

// Swagger UI
app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});