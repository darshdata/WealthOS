# WealthOS: Task 1 Project Foundation Architecture

## Overview
WealthOS is an institutional-grade investment portfolio analytics platform built with the MERN stack (MongoDB, Express, React, Node.js). Task 1 establishes the verified foundation across both frontend and backend domains.

---

## Architecture & Request Flow

```
┌────────────────────────────────┐
│  Client (React + Vite)         │
│  http://localhost:5173         │
└───────────────┬────────────────┘
                │
                │ HTTP Request (e.g., fetch /api/health)
                │ Cross-Origin Request Headers
                ▼
┌────────────────────────────────┐
│  Express API (CORS Middleware) │
│  http://localhost:5000         │
└───────────────┬────────────────┘
                │
                │ Allowed Origin: http://localhost:5173
                │ Route Dispatcher: /api/health
                ▼
┌────────────────────────────────┐
│  Express Router & Controller   │
│  src/routes/health.routes.js   │
└───────────────┬────────────────┘
                │
                │ Mongoose connection check (readyState === 1)
                ▼
┌────────────────────────────────┐
│  MongoDB Atlas Cluster         │
│  mongodb+srv://...             │
└────────────────────────────────┘
```

### Detailed Request Walkthrough
1. **User Action / Component Mount**:
   A React component (such as `Sidebar.jsx`) calls `fetch('http://localhost:5000/api/health')`.
2. **Browser Network Layer & Preflight**:
   The browser initiates an HTTP request. Since the client origin is `http://localhost:5173` and the target is `http://localhost:5000`, the browser sends CORS headers (`Origin: http://localhost:5173`).
3. **Express Middleware Pipeline**:
   In `src/app.js`, the request enters `cors()` middleware. Express validates the origin against `process.env.CLIENT_URL` (`http://localhost:5173`) and sets `Access-Control-Allow-Origin: http://localhost:5173`.
4. **Router Dispatch**:
   The request URL `/api/health` matches `app.use('/api/health', healthRoutes)`. The route handler executes and checks `mongoose.connection.readyState`.
5. **Database Interaction**:
   Mongoose checks its connection pool against MongoDB Atlas. If connected, readyState returns `1` (Connected). If not connected, it returns `0` (Disconnected), allowing the health endpoint to respond with status `503`.
6. **Response Return**:
   Express serializes the JSON response payload back through the network socket to the client, where React state updates reactively.

---

## Directory Layout
- `client/`: React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts, React Router.
- `server/`: Node.js ES modules, Express 5, Mongoose 9, dotenv, CORS, Zod, Nodemon.
- `docs/`: Architectural specifications and sprint tracking.
