const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./openapi.json");
require("dotenv").config();

const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.use(express.json());

// ==================== AUTH ROUTES ====================

// Signup
app.post("/auth/signup", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        return res.status(400).json({
            error: error.message
        });
    }

    return res.status(201).json({
        message: "Signup successful",
        user: data.user,
        access_token: data.session?.access_token || null,
        refresh_token: data.session?.refresh_token || null
    });
});


// Login
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({
            error: "Invalid login credentials"
        });
    }

    return res.status(200).json({
        message: "Login successful",
        user: data.user,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    });
});


// ==================== STAGE 4: AUTH MIDDLEWARE + LOGOUT ====================

// Public route
app.get("/public/info", (req, res) => {
    res.status(200).json({
        message: "This is a public route",
        info: "No authentication is required"
    });
});


// Reusable authentication middleware
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authorization token required"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            error: "Authorization token required"
        });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }

    req.user = data.user;
    next();
};


// Protected profile route
app.get("/protected/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        message: "Authenticated user",
        user: {
            id: req.user.id,
            email: req.user.email,
            created_at: req.user.created_at
        }
    });
});


// Protected dashboard route
app.get("/protected/dashboard", authMiddleware, (req, res) => {
    res.status(200).json({
        message: "Welcome to your dashboard",
        user: {
            id: req.user.id,
            email: req.user.email
        }
    });
});


// Protected logout route
app.post("/auth/logout", authMiddleware, async (req, res) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return res.status(500).json({
            error: "Logout failed"
        });
    }

    return res.status(204).send();
});


// ==================== POSTGRESQL ====================

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


// Initialize database
async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            done BOOLEAN NOT NULL DEFAULT FALSE
        )
    `);

    const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM tasks"
    );

    if (result.rows[0].count === 0) {
        await pool.query(
            "INSERT INTO tasks (title, done) VALUES ($1, $2), ($3, $4), ($5, $6)",
            [
                "Learn JavaScript",
                false,
                "Build CRUD API",
                false,
                "Test API with Swagger",
                false
            ]
        );

        console.log("Seed data inserted");
    }

    console.log("PostgreSQL database ready");
}


// ==================== TASK ROUTES ====================

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
app.get("/tasks", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, title, done FROM tasks ORDER BY id"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// Get task by ID
app.get("/tasks/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        const result = await pool.query(
            "SELECT id, title, done FROM tasks WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// Create a new task
app.post("/tasks", async (req, res) => {
    try {
        const { title, done = false } = req.body;

        if (
            typeof title !== "string" ||
            title.trim() === "" ||
            typeof done !== "boolean"
        ) {
            return res.status(400).json({
                error: "Invalid task data"
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks (title, done)
             VALUES ($1, $2)
             RETURNING id, title, done`,
            [title.trim(), done]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// Update a task
app.put("/tasks/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(404).json({
                error: "Task not found"
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

        const existing = await pool.query(
            "SELECT id, title, done FROM tasks WHERE id = $1",
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        const currentTask = existing.rows[0];

        const updatedTitle =
            title !== undefined ? title.trim() : currentTask.title;

        const updatedDone =
            done !== undefined ? done : currentTask.done;

        const result = await pool.query(
            `UPDATE tasks
             SET title = $1, done = $2
             WHERE id = $3
             RETURNING id, title, done`,
            [updatedTitle, updatedDone, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// Delete a task
app.delete("/tasks/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        const result = await pool.query(
            "DELETE FROM tasks WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});


// ==================== SWAGGER UI ====================

app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);


// ==================== START SERVER ====================

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database initialization failed:", error);
        process.exit(1);
    });