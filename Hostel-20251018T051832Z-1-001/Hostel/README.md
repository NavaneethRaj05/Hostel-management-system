# Hostel Management (Starter Scaffold)

This scaffold provides a minimal full‑stack structure:

backend (Node.js + Express, JWT-ready) and frontend (vanilla HTML/CSS/JS). MongoDB connection is prepared but optional.

## Getting Started

1) Install dependencies

```bash
npm install
```

2) Set environment variables

Create a `.env` in project root:

```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/hostel_management
JWT_SECRET=dev_secret_change_me
JWT_EXPIRES=7d
```

3) Run backend API

```bash
npm run dev
```

API runs at `http://localhost:5000`.

4) Open frontend

Open `frontend/index.html` directly in a browser or with a static server.

## Scripts

- `npm run dev`: start server with nodemon
- `npm start`: start server with node

## Structure

See folders under `backend/` and `frontend/`.

## Notes

- Controllers and routes are basic placeholders you can extend.
- Auth uses JWT; middleware checks `Authorization: Bearer <token>`.


