# Bumi Nusa Backend

Backend API untuk platform B2B Bumi Nusa — menghubungkan Supplier (perusahaan manufaktur/industri) dengan Buyer (pembeli korporat).

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM + `@prisma/adapter-pg`)
- **Auth**: JWT (stateless) + bcryptjs
- **Email**: Nodemailer + custom in-memory queue (3 retry, exponential backoff)
- **Storage**: Cloudinary (images/PDF via multer-storage-cloudinary)
- **Rate Limiting**: express-rate-limit
- **Security**: helmet, cors, compression

## Project Structure

```
src/
├── config/           # Prisma, Cloudinary, DB pool
├── controllers/      # Request handlers per domain
│   ├── authControllers.js        # Register, login, verify, reset password
│   ├── orderControllers.js       # Order CRUD, status flow
│   ├── productControllers.js     # Product CRUD (supplier only)
│   ├── companyProfileConrtrollers.js  # NOTE: filename has typo "Conrtrollers"
│   ├── buyerControllers.js
│   ├── usersControllers.js       # Admin user management
│   └── categoriesControllers.js
├── middlewares/      # Auth (authenticate/authorize), upload error handling
├── routes/           # Express routers
├── utils/            # Helpers (token, slug, email queue, order flow, mailer)
├── generated/        # Prisma client (gitignored)
prisma/
├── schema.prisma     # Database schema
├── migrations/       # Migration history
├── seed.js           # Demo data (Super_Admin, Admin, Supplier, Buyer)
```

## Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `Super_Admin` | Platform owner | Full access, user/role management |
| `Admin` | Platform operator | Orders, verification, users (read) |
| `Supplier` | Perusahaan penjual | Products, company profile, incoming orders, status update |
| `Buyer` | Pembeli korporat | Buyer profile, create orders, my orders |

## Auth Flow

1. **Register** (`POST /api/v1/auth/register-company|register-buyer`)
   - Creates user + profile (company/buyer) in a transaction
   - Sends verification email (queued, non-blocking)
   - Returns `verified: false`

2. **Verify Email** (`GET /api/v1/auth/verify-email?token=`)
   - Validates JWT (purpose: `verify_email`, 24h expiry)
   - Sets `user.verified = true`

3. **Login** (`POST /api/v1/auth/login`)
   - Validates credentials
   - **Rejects if `verified: false`** (403)
   - Returns JWT (1h expiry) with payload:
     ```json
     { "userId": 1, "email": "...", "roleId": 3, "role": "Supplier", "name": "...", "verified": true }
     ```

4. **Protected Routes** — Require `Authorization: Bearer <token>`
   - `authenticate` verifies JWT, fetches fresh user from DB, re-checks `user.verified`, attaches `req.user`
   - Role-based access via `authorize("Role1", "Role2")`
   - `verify-email` & `reset-password` paths are public (email-link tokens carry their own purpose check)

5. **Forgot/Reset Password**
   - `POST /forgot-password` → sends reset link (30m expiry, 3/15min rate limit, anti-enumeration)
   - `POST /reset-password` with token + newPassword (min 6 chars)

## Order Status Flow

```
Pending → Confirmed → Processing → Shipped → Completed
   │           │            │
Cancelled  Cancelled    Cancelled
```

Role transitions enforced in `utils/flowOders.js`:
- **Buyer**: Pending → Cancelled
- **Supplier**: Pending → Confirmed/Cancelled, Confirmed → Processing/Cancelled, Processing → Shipped
- **Admin/Super_Admin**: All transitions

On order creation, an email notification is queued to **Admin** (`ADMIN_EMAIL`) and the **Buyer** (order confirmation).

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/register-company` | 🔓 | - | Register supplier (multipart npwp/logo wired but optional in handler) |
| POST | `/register-buyer` | 🔓 | - | Register buyer |
| POST | `/login` | 🔓 | - | Login (rate limited 5/15min) |
| GET | `/verify-email` | 🔓 | - | Verify email via token |
| POST | `/forgot-password` | 🔓 | - | Request reset (rate limited 3/15min) |
| POST | `/reset-password` | 🔓 | - | Reset with token |
| POST | `/logout` | 🔐 | all | Logout (client-side token removal) |
| GET | `/me` | 🔐 | all | Current user profile |

### Company Profiles (`/api/v1/company-profiles`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔐 | Admin, Super_Admin | List all (paginated, filter status) |
| GET | `/:id` | 🔐 | all | Get by userId |
| PUT | `/:id` | 🔐 | Supplier | Update own profile (ownership check) |
| PUT | `/:id/logo` | 🔐 | Supplier | Upload logo (Cloudinary) |
| PATCH | `/:id/verification-status` | 🔐 | Admin, Super_Admin | Update verification |

### Buyers (`/api/v1/buyers`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔓 | - | List all (public) |
| GET | `/:id` | 🔐 | all | Get profile |
| PUT | `/:id` | 🔐 | Buyer | Update own profile |

### Products (`/api/v1/products`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔐 | all | List all (paginated, filter) |
| GET | `/me` | 🔐 | Supplier | My products |
| GET | `/slug/:slug` | 🔐 | all | Get by slug |
| GET | `/popular` | 🔐 | all | Top by views (limit 12) |
| GET | `/:id` | 🔐 | all | Get by ID (increments views) |
| POST | `/` | 🔐 | Supplier, Super_Admin | Create (max 5 images; Super_Admin may set supplierId) |
| PUT | `/:id` | 🔐 | Supplier | Update own |
| DELETE | `/:id` | 🔐 | Supplier, Super_Admin | Delete own |
| DELETE | `/images/:imageId` | 🔐 | Supplier | Delete product image |

Product rules: `price_min <= price_max`; `min_order >= 100`; slug auto-generated & unique.

### Orders (`/api/v1/orders`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔐 | Admin, Super_Admin | All orders |
| GET | `/buyer/my-orders` | 🔐 | Buyer | My orders as buyer |
| GET | `/supplier/my-orders` | 🔐 | Supplier | My orders as supplier |
| GET | `/:id` | 🔐 | Buyer, Supplier, Admin, Super_Admin | Detail (ownership check) |
| POST | `/` | 🔐 | Buyer | Create (single supplier, quantity >= product.min_order) |
| PATCH | `/:id/status` | 🔐 | Supplier, Admin, Super_Admin | Update status (validated flow) |
| PATCH | `/:id/cancel` | 🔐 | Buyer | Cancel own (Pending only) |
| DELETE | `/:id` | 🔐 | Admin, Super_Admin | Hard delete (cascade order items) |

### Categories (`/api/v1/categories`)
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔓 | - | List all |
| GET | `/:id` | 🔓 | - | Get by ID |
| GET | `/slug/:slug` | 🔓 | - | Get by slug |
| POST | `/` | 🔐 | Super_Admin | Create |
| PUT | `/:id` | 🔐 | Super_Admin | Update |
| DELETE | `/:id` | 🔐 | Super_Admin | Delete |

### Users (`/api/v1/users`) — Super_Admin only
| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | 🔐 | Super_Admin | List all |
| GET | `/:id` | 🔐 | Super_Admin | Get by ID |
| PUT | `/:id` | 🔐 | Super_Admin | Update (email, role) |
| DELETE | `/:id` | 🔐 | Super_Admin | Delete |
| PATCH | `/:id/role` | 🔐 | Super_Admin | Assign role |
| GET | `/:id/products` | 🔐 | Super_Admin | Products by user |

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=your-secret-key

# Frontend (for email links); comma-separated allowed for CORS origins
FRONTEND_URL=https://your-frontend.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Bumi Nusa <noreply@buminusa.com>"
ADMIN_EMAIL=admin@buminusa.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# App
PORT=3000
NODE_ENV=development
```

## Development

```bash
# Install deps
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Dev server (nodemon)
npm run dev

# Production start
npm start
```

## Demo Accounts (after `npm run db:seed`)

| Email | Password | Role | Verified |
|-------|----------|------|----------|
| superadmin@buminusa.com | 12345678 | Super_Admin | ✅ |
| admin@buminusa.com | 12345678 | Admin | ✅ |
| supplier@buminusa.com | 12345678 | Supplier | ❌ (verify via email) |
| buyer@buminusa.com | 12345678 | Buyer | ❌ (verify via email) |

## Key Implementation Details

- **Slug uniqueness**: Auto-generated from name via `utils/slug.js`; collision retry loop with `Date.now()` + random suffix. Company/category controllers have their own inline slug logic.
- **Role creation**: Idempotent via `findFirst` + `create` with `P2002` retry (race-safe)
- **Email queue** (`utils/emailQueue.js`): In-memory, 3 attempts with delays [1s, 3s], non-blocking
- **File uploads**: Cloudinary via multer-storage-cloudinary — NPWP/logo 1MB (jpg/png/pdf for NPWP), product images 10MB (jpg/png, max 5)
- **Rate limiting**: Global 100/15min + login 5/15min + forgot-password 3/15min
- **Order number**: `ORD-YYYYMMDD-XXXX` generated in `utils/generateNumberOrders.js`
- **Security**: Helmet, CORS, compression, input validation; passwords bcryptjs (10 rounds)

## License

Internal use only — Bumi Nusa.
