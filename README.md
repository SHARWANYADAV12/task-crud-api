# Task API

A RESTful CRUD API built with Node.js, Express, and PostgreSQL, fully containerized with Docker Compose.

## Features

- Create, read, update, and delete tasks
- PostgreSQL database for persistent storage
- Docker and Docker Compose support
- Automatic database and table creation
- Three example tasks seeded automatically when the table is empty
- Input validation
- Parameterized SQL queries
- Proper HTTP status codes
- Swagger UI documentation
- Data persistence across container restarts

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Docker
- Docker Compose
- node-postgres (`pg`)
- Swagger UI
- OpenAPI 3.0

## Run the Application

Make sure Docker Desktop is running.

Start the complete API and PostgreSQL stack with:

```bash
docker compose up
```