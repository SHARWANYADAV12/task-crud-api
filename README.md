# Task API

A simple RESTful CRUD API built with Node.js, Express, and SQLite.

## Features

- Create, read, update, and delete tasks
- SQLite database for persistent storage
- Input validation
- Proper HTTP status codes
- Parameterized SQL queries
- Swagger UI documentation
- Automatic database and table creation
- Three example tasks are seeded on the first run

## Tech Stack

- Node.js
- Express.js
- SQLite
- better-sqlite3
- Swagger UI
- OpenAPI 3.0

## Installation

Run:

npm install

## Run the API

Start the server with:

node server.js

The API runs at:

http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | API information |
| GET | /health | Health check |
| GET | /tasks | Get all tasks |
| GET | /tasks/:id | Get a task by ID |
| POST | /tasks | Create a new task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| GET | /docs | Swagger API documentation |

## HTTP Status Codes

- 200 — Successful request
- 201 — Task created successfully
- 204 — Task deleted successfully
- 400 — Invalid request
- 404 — Task not found

## Swagger Documentation

Swagger UI is available at:

http://localhost:3000/docs

Swagger screenshot: screenshots/swagger.png

## SQLite Database

This project uses SQLite instead of an in-memory array.

SQLite was chosen because:

- It stores the database in a single file.
- It requires no separate database server.
- It has zero setup for local development.
- Data survives server restarts.
- It is simple and lightweight for a small CRUD API.

## Database Location

The SQLite database is stored as:

tasks.db

The database file is created automatically when the application starts.

The database file is normally kept out of Git using .gitignore, so a fresh clone can create its own database.

## Database Structure

The tasks table contains:

| Column | Type | Description |
|--------|----------|-------------|
| id | INTEGER | Primary key |
| title | TEXT | Task title |
| done | INTEGER | Completion status (0 or 1) |

## Seed Data

When the database is created for the first time, three example tasks are automatically inserted:

1. Learn JavaScript
2. Build CRUD API
3. Test API with Swagger

The seed data is inserted only when the table is empty.

After restarting the server, the existing data remains in the SQLite database.

## SQL Query Example

One SQL query tested during development was:

SELECT * FROM tasks WHERE done = 1;

This query returns all completed tasks.

Another query used to check the number of tasks was:

SELECT COUNT(*) FROM tasks;

## Database Browser Screenshot

The SQLite database was inspected using DB Browser for SQLite.

Screenshot: screenshots/database.png

## Project Structure

task-crud-api/
  screenshots/
    swagger.png
    database.png
  server.js
  openapi.json
  package.json
  package-lock.json
  README.md
  .gitignore

## Data Persistence

Unlike the earlier in-memory version, tasks are now stored in SQLite.

This means:

1. Start the server.
2. Create or update tasks.
3. Stop the server.
4. Start the server again.
5. The tasks are still available.

## Git Stages

### Stage 0
Created the basic Express server.

### Stage 1
Added root and health endpoints.

### Stage 2
Added task read endpoints.

### Stage 3
Added task creation with validation.

### Stage 4
Completed full CRUD operations.

### Stage 5
Added Swagger UI documentation.

### Stage 6
Connected the API to SQLite and added database persistence.

## Author

Sharwan Yadav
