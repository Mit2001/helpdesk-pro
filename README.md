# HelpDesk Pro — Enterprise IT Service Management System

**HelpDesk Pro** is a production-grade, full-stack IT Service Management (ITSM) and helpdesk web application built for enterprise operations. It provides end-to-end incident lifecycle management, role-based access control (RBAC), automated SLA tracking, real-time metrics aggregation, organizational category taxonomy management, security audit logging, and global search.

---

## Key Features

* **Role-Based Access Control (RBAC)**: Strict role segregation across **Admin**, **Support Engineer**, and **Employee** roles with server-side authorization enforcement.
* **Incident & Ticket Lifecycle**: Complete workflow with state machines (`Open` → `Assigned` → `In Progress` → `Pending Customer` → `Escalated` → `Resolved` → `Closed` / `Reopened`).
* **Automated SLA Engine**: Real-time evaluation of response and resolution targets with SLA status indicators (`Healthy`, `Warning`, `Breached`).
* **Public Replies & Internal Notes**: Conversation timeline supporting public customer communication and private internal collaboration strictly filtered server-side.
* **Role-Specific Dashboards & Analytics**: Live MongoDB aggregation engine calculating SLA compliance rates, average resolution time, MTTR, ticket volume trends, category breakdowns, and engineer workload distribution.
* **Administrative Governance**:
  * **User Management**: User creation, role promotion, and activation/deactivation with self-lockout safeguards.
  * **Category Taxonomy**: Dynamic organizational categories with soft-deletion and historical ticket referential integrity.
  * **SLA Configuration**: Configurable target hours per priority level (`Critical`, `High`, `Medium`, `Low`).
  * **Immutable Audit Trail**: Structured event logging recording administrative actions, security transitions, and ticket history.
* **Global Search**: Debounced, role-scoped ticket search across ticket IDs, subjects, descriptions, departments, and priority levels.
* **User Profile & Credentials**: Self-service profile updates and secure password changes with bcrypt verification.
* **Notification System**: In-app notifications with unread counter badges and read/unread status updates.

---

## Tech Stack

### Frontend
* **Framework**: React.js 18 + Vite
* **Routing**: React Router DOM (v6) with declarative role guards
* **Styling**: Tailwind CSS with enterprise dark theme styling
* **Icons**: Lucide React
* **Charts & Visualizations**: Recharts
* **HTTP Client**: Axios with centralized authorization interceptors and error handlers

### Backend
* **Runtime**: Node.js (ES Modules)
* **Web Framework**: Express.js
* **Database & ODM**: MongoDB with Mongoose
* **Authentication**: JSON Web Tokens (JWT) & bcryptjs
* **Security & Hardening**: Helmet HTTP headers, CORS whitelisting, and strict request size limits
* **Logging**: Morgan

---

## System Architecture

```text
React.js Frontend (Vite)
       │
       ▼  (Axios Interceptor + Bearer JWT)
REST API Layer (Express.js + Helmet + CORS)
       │
       ├── Middleware (Auth, RBAC, Error Handler)
       ├── Controllers (Auth, Tickets, Profile, Search, Users, SLA, Analytics, Audit)
       │
       ▼  (Mongoose Schema Validation & Aggregations)
MongoDB Database
```

---

## Role Matrix & Permissions

| Feature / Module | Employee | Support Engineer | Admin |
| :--- | :---: | :---: | :---: |
| **Login & JWT Auth** | Yes | Yes | Yes |
| **Personal Profile & Password Change** | Yes | Yes | Yes |
| **Global Ticket Search** | Scoped (Own) | Yes (Global) | Yes (System-wide) |
| **Create Ticket** | Yes | Yes | Yes |
| **My Tickets Queue** | Yes (Own) | Yes (Assigned) | Yes |
| **Global Ticket Queue** | No (403) | Yes | Yes |
| **Ticket Assignment & Assignable Staff** | No (403) | Yes | Yes |
| **Public Comments** | Yes | Yes | Yes |
| **Internal Support Notes** | Hidden / Blocked (403) | Yes | Yes |
| **Escalate & Resolve Tickets** | No (403) | Yes | Yes |
| **Reopen Closed Tickets** | Yes | Yes | Yes |
| **Analytics Dashboard** | Personal | Engineer Workload | Executive ITSM |
| **Administrative User Management** | No (403) | No (403) | Yes |
| **Category Configuration** | Read Active | Read Active | Manage All |
| **SLA Policy Administration** | No (403) | No (403) | Yes |
| **Enterprise Audit Logs** | No (403) | No (403) | Yes |

---

## Default Service Level Agreements (SLA)

| Priority | Response Target | Resolution Target |
| :--- | :---: | :---: |
| **Critical** | 1 hour | 4 hours |
| **High** | 2 hours | 8 hours |
| **Medium** | 6 hours | 24 hours |
| **Low** | 12 hours | 48 hours |

---

## Local Setup & Installation

### Prerequisites
* **Node.js**: v18+ (tested on Node v20/v24)
* **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI

### 1. Clone the repository
```bash
git clone <repository-url>
cd "HelpDesk Pro – IT Service Management System"
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
npm run seed     # Seeds initial admin, engineers, categories, and SLA policies
npm run dev      # Starts backend API on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev      # Starts frontend dev server on http://localhost:5173
```

### 4. Build Verification
```bash
cd client
npm run build    # Produces production-ready bundle with 0 errors
```

---

## Automated Test Suites

The repository contains automated unit and integration test suites using in-memory MongoDB:

* **Phase 3 (Auth & RBAC)**: `node server/src/utils/testAuth.js` (16 tests)
* **Phase 4 (Ticket Lifecycle)**: `node server/src/utils/testTickets.js` (16 tests)
* **Phase 5 (Conversations & Privacy)**: `node server/src/utils/testTicketWorkflow.js` (17 tests)
* **Phase 6 (Analytics Engine)**: `node server/src/utils/testAnalytics.js` (19 tests)
* **Phase 7 (Admin & Governance)**: `node server/src/utils/testAdminManagement.js` (35 tests)
* **Phase 8 (Production Hardening)**: `node server/src/utils/testProductionReadiness.js` (27 tests)

---

## Security & Privacy Highlights

* **No Plaintext Passwords**: Passwords hashed with `bcryptjs` (salt rounds: 10) and excluded by default (`select: false`).
* **Server-Side Authorization**: API routes protect against horizontal and vertical privilege escalation.
* **Internal Note Privacy**: Internal notes filtered server-side from Employee responses.
* **Safe Health Endpoint**: `GET /api/health` returns status without disclosing database URIs or environment variables.
* **No Destructive Startup Operations**: Server startup does not drop databases or collections.

---

## Vercel-Only Production Deployment

HelpDesk Pro is fully configured for unified, single-project deployment on **Vercel**:

### Vercel Architecture
* **Frontend**: React + Vite SPA built to `client/dist` and served with clean SPA routing (`/(.*)` → `/index.html`).
* **Backend API**: Express REST backend invoked via Vercel Serverless Functions (`/api/*` → `api/index.js`) with Mongoose connection pooling.
* **Database**: MongoDB Atlas cloud cluster.

### Deployment Steps
1. Connect your repository to Vercel.
2. In the Vercel Project Settings, configure the following **Environment Variables**:
   * `MONGODB_URI`: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/helpdeskpro?retryWrites=true&w=majority`
   * `JWT_SECRET`: `<your_production_jwt_secret_key>`
   * `CLIENT_URL`: `https://<your-vercel-app>.vercel.app`
   * `NODE_ENV`: `production`
3. Deploy! Vercel will automatically build the client bundle and expose `/api` serverless endpoints.
