# WealthOS

WealthOS is a modern, high-precision portfolio tracking and simulated trading platform built with **React 19**, **Vite**, **Tailwind CSS**, **Express 5**, and **MongoDB Atlas**.

Designed with institutional financial integrity in mind, WealthOS replaces floating-point calculations with integer subunit precision (paise) and enforces ACID-compliant trade execution with idempotency protections.

---

## 🌟 Key Features

- **Integer Subunit Precision (`paise`)**: All monetary values are processed and stored as integer subunits (paise, Scale 100) across both client and server to completely avoid IEEE 754 floating-point inaccuracies.
- **ACID Portfolio Trade Engine**: Multi-document atomic transactions on MongoDB Atlas ensure cash balance debits/credits and position inventory updates occur synchronously with immutable transaction ledger entries.
- **Idempotency & Concurrency Safety**: Prevents double-spend and duplicate trade execution using client-supplied idempotency keys backed by compound database indexes and account ownership validation.
- **Server-Authoritative Pricing & Circuit Limits**: Simulated market orders are validated against server-side reference prices and daily circuit limit bands ($\pm 20\%$) to prevent client-side price tampering.
- **Timestamped Valuation Snapshots**: Automated daily portfolio valuation snapshots scheduled in the `Asia/Kolkata` timezone with idempotent upsert capabilities and audit logging.
- **Holdings & Analytics Dashboard**: Real-time portfolio valuation, sector allocation, concentration risk (Herfindahl-Hirschman Index), returns tracking, and responsive transaction history with filtering and search.

---

## 🏗️ Architecture

```
wealthos/
├── client/                     # React 19 Frontend (Vite)
│   ├── src/
│   │   ├── components/         # Modular UI components (Navbar, Sidebar, Modals, Tables)
│   │   ├── context/            # Central reactive PortfolioContext & state store
│   │   ├── pages/              # Dashboard, Holdings, Analytics, Settings
│   │   ├── services/           # REST API client & simulated tick streaming
│   │   └── utils/              # Integer currency & financial math utilities
│   └── test/                   # Client-side analytics math unit test suite
├── server/                     # Express 5 Backend (ESM)
│   ├── src/
│   │   ├── config/             # MongoDB Atlas connection & replica-set configuration
│   │   ├── controllers/        # Trade execution, portfolio state & snapshot controllers
│   │   ├── models/             # Mongoose schemas (Portfolio, Transaction, PortfolioSnapshot)
│   │   ├── routes/             # RESTful API routing
│   │   └── services/           # Market pricing service & snapshot scheduler
│   └── test/                   # Automated node:test backend test suites
└── docs/                       # Architecture & technical documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MongoDB**: MongoDB Atlas cluster (M0 or higher with replica set support) or a local replica set

### 1. Repository Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/darshdata/WealthOS.git
cd WealthOS

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
cd ..
```

### 2. Environment Configuration

Create `.env` configuration files for both server and client:

**`server/.env`**:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
CLIENT_URL=http://localhost:5173
```

**`client/.env`**:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Running Locally

Start the backend API server:
```bash
cd server
npm run dev
# Server runs on http://localhost:5001
```

In a separate terminal, start the frontend Vite development server:
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

---

## 🧪 Testing & Code Quality

### Server Tests
The backend includes 25 unit and integration tests covering trade execution, weighted-average cost basis, concurrency, idempotency, circuit limit validation, and daily snapshots:
```bash
cd server
npm test
npm run check
```

### Client Tests & Linting
The frontend includes 14 math engine tests verifying returns, allocation percentages, concentration risk metrics, and chart formatting:
```bash
cd client
npm test
npm run lint
npm run build
```

---

## 🔒 Security & Integrity Notice

- **Paper-Trading Sandbox**: WealthOS is a simulated paper-trading platform designed for portfolio analytics demonstrations. It uses server-calibrated simulated prices and does not connect to live stock exchanges.
- **Environment Secrets**: Database credentials and sensitive environment variables must be stored in `.env` files and never committed to version control.
