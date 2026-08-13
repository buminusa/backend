# Bumi Nusa - Backend API

Backend REST API untuk **Bumi Nusa**, platform B2B yang mempertemukan supplier (perusahaan) dengan buyer. Dibangun dengan Express.js dan Prisma ORM di atas PostgreSQL.

## Tech Stack

- **Runtime:** Node.js + Express 4
- **ORM:** Prisma 7 (`@prisma/adapter-pg`) dengan PostgreSQL
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs`
- **Upload:** Multer + Cloudinary (`multer-storage-cloudinary`)
- **Email:** Nodemailer (verifikasi email, reset password, notifikasi order)
- **Security:** Helmet, CORS, `express-rate-limit`, Compression
- **Logging:** Morgan
- **CI/CD:** GitHub Actions (notifikasi Telegram untuk push, pull request, dan release)

## Struktur Proyek

```
be_bumi_nusa/
├── app.js                     # Entry point Express (middleware, routing, error handler)
├── bin/www                    # HTTP server bootstrap
├── prisma/
│   ├── schema.prisma          # Skema database
│   └── migrations/            # Riwayat migrasi
├── prisma.config.ts           # Konfigurasi Prisma (path schema & migrations)
├── src/
  │   ├── config/
  │   │   ├── database.js        # Koneksi pool `pg` (native)
  │   │   ├── prisma.js          # Prisma Client (adapter-pg)
  │   │   └── cloudinary.js      # Konfigurasi Cloudinary & multer storage
  │   ├── controllers/
  │   │   ├── authControllers.js
  │   │   ├── usersControllers.js
  │   │   ├── companyProfileConrtrollers.js
  │   │   ├── buyerControllers.js
  │   │   ├── productControllers.js
  │   │   ├── categoriesControllers.js
  │   │   └── orderControllers.js
  │   ├── middlewares/
  │   │   ├── authMiddleware.js  # `authenticate` & `authorize`
  │   │   └── uploadMiddleware.js
  │   ├── routes/
  │   │   ├── index.js
  │   │   ├── authRoutes.js
  │   │   ├── usersRoutes.js
  │   │   ├── companyProfileRoutes.js
  │   │   ├── buyerRoutes.js
  │   │   ├── productsRoutes.js
  │   │   ├── categoriesRoutes.js
  │   │   └── ordersRoutes.js
  │   └── utils/
│       ├── slug.js
│       ├── generateNumberOrders.js
│       ├── flowOders.js
│       ├── tokenUtils.js    # generate/verify JWT untuk verifikasi & reset password
│       └── mailer.js        # queue email via nodemailer
├── views/                     # Jade views (default express-generator)
└── .github/workflows/
    └── telegram.yml           # Notifikasi Telegram tiap push/PR/release
```

## Model Data (Prisma)

| Model | Deskripsi |
|---|---|
| `Role` | Daftar role (Super_Admin, Admin, Supplier, Buyer, dst) |
| `Users` | Akun user, terhubung ke `Role`, `CompanyProfiles`, `BuyerProfiles`; punya flag `verified` |
| `CompanyProfiles` | Profil supplier (nama perusahaan, NPWP, logo, status verifikasi) |
| `BuyerProfiles` | Profil pembeli |
| `Categories` | Kategori produk |
| `Product` | Produk milik supplier (harga min/max, min_order, unit, HS code, views, slug) |
| `ProductImages` | Gambar produk (relasi 1-N ke `Product`) |
| `Orders` | Order dari buyer ke supplier, punya status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Completed`, `Cancelled`) |
| `OrderItems` | Baris item dalam order (relasi N-1 ke `Orders` dan `Product`) |

## API Endpoints

Base URL: `/api/v1`

### Auth (`/auth`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/register-company` | Registrasi supplier (upload NPWP + logo) + kirim email verifikasi |
| POST | `/register-buyer` | Registrasi buyer + kirim email verifikasi |
| POST | `/login` | Login, mengembalikan JWT (rate-limit 5/15 menit) |
| GET | `/verify-email?token=...` | Verifikasi email via link dari email |
| POST | `/forgot-password` | Kirim link reset password ke email (rate-limit 3/15 menit) |
| POST | `/reset-password` | Reset password pakai token dari email |

### Users (`/users`) — khusus `Super_Admin`
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/` | List semua user |
| GET | `/:id` | Detail user |
| PUT | `/:id` | Update user |
| DELETE | `/:id` | Hapus user |
| PATCH | `/:id/role` | Assign role ke user |
| GET | `/:id/products` | List produk milik user |

### Company Profiles (`/company-profiles`)
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/` | Admin | List semua profil perusahaan |
| GET | `/:id` | Auth | Detail profil perusahaan |
| PUT | `/:id` | Supplier | Update profil perusahaan |
| PUT | `/:id/logo` | Supplier | Update logo |
| PATCH | `/:id/verification-status` | Admin | Update status verifikasi |

### Buyers (`/buyers`)
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/` | Public | List semua profil buyer |
| GET | `/:id` | Auth | Detail profil buyer |
| PUT | `/:id` | Auth | Update profil buyer |

### Products (`/products`)
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/` | Auth | List semua produk |
| GET | `/popular` | Auth | List produk terpopuler (by views) |
| GET | `/slug/:slug` | Auth | Detail produk by slug |
| GET | `/:id` | Auth | Detail produk by id |
| POST | `/` | Supplier | Tambah produk (upload max 5 gambar) |
| PUT | `/:id` | Supplier | Update produk |
| PATCH | `/:id/status` | Admin | Update status produk |
| DELETE | `/:id` | Supplier, Super_Admin | Hapus produk |
| DELETE | `/images/:imageId` | Supplier | Hapus gambar produk |


### Categories (`/categories`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/` | List semua kategori |
| GET | `/slug/:slug` | Detail kategori by slug |
| GET | `/:id` | Detail kategori by id |
| POST | `/` | Tambah kategori |
| PUT | `/:id` | Update kategori |
| DELETE | `/:id` | Hapus kategori |

### Orders (`/orders`)
| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/` | Admin, Super_Admin | List semua order (filter `status`, `buyerId`, `supplierId`, `search`, `page`, `limit`) |
| GET | `/buyer/my-orders` | Buyer | List order milik buyer yang login |
| GET | `/supplier/my-orders` | Supplier | List order masuk ke supplier yang login |
| GET | `/:id` | Auth (ownership) | Detail order by id |
| POST | `/` | Buyer | Buat order (1 order = 1 supplier, validasi min_order) + kirim email notifikasi |
| PATCH | `/:id/status` | Admin, Super_Admin | Update status order (ikuti alur status) |
| PATCH | `/:id/cancel` | Buyer | Batalkan order milik sendiri |
| DELETE | `/:id` | Admin, Super_Admin | Hapus order permanen |

Alur status order: `Pending -> Confirmed -> Processing -> Shipped -> Completed`, dengan `Cancelled` tersedia dari `Pending`/`Confirmed` (buyer hanya bisa cancel saat `Pending`).

### Lainnya
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/health` | Health check server |

## Format Response

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": {}
}
```

## Autentikasi & Otorisasi

- Autentikasi menggunakan JWT dikirim via header `Authorization: Bearer <token>`.
- Middleware `authenticate` memverifikasi token dan melampirkan `req.user` (termasuk relasi `role`).
- Middleware `authorize("RoleName", ...)` membatasi akses berdasarkan `req.user.role.name_role`, contoh: `Supplier`, `Admin`, `Super_Admin`.

## Email & Verifikasi

- Registrasi (`register-company` / `register-buyer`) otomatis mengirim email verifikasi; user memiliki flag `verified` (default `false`). Login tetap berhasil walau belum verifikasi, namun response menyertakan `data.verified: false` + peringatan.
- Verifikasi dilakukan via `GET /verify-email?token=...` (token JWT bertipe `verify_email`). Reset password via `POST /forgot-password` lalu `POST /reset-password` (token bertipe `reset_password`, anti user-enumeration).
- Pembuatan order memicu pengiriman email notifikasi ke buyer & supplier (`queueOrderEmails`).
- Email dikirim melalui queue (tidak memblokir response). Konfigurasi via variabel `SMTP_*` di `.env`.


## Instalasi

### Prasyarat
- Node.js
- PostgreSQL
- Akun Cloudinary

### Langkah

```bash
git clone https://github.com/buminusa/backend.git
cd backend
npm install
```

Buat file `.env` di root project:

```env
# Server
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bumi_nusa

# JWT
JWT_SECRET=your_jwt_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer - Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Bumi Nusa <your_email@gmail.com>

# Frontend URL (untuk link verifikasi/reset password)
FRONTEND_URL=http://localhost:3000
```

Jalankan migrasi Prisma:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Menjalankan Aplikasi

```bash
# development (dengan nodemon)
npm run dev

# production
npm start
```

Server berjalan di `http://localhost:3000` (atau sesuai `PORT`).

## CI/CD

Workflow `.github/workflows/telegram.yml` mengirim notifikasi ke Telegram setiap ada event `push`, `pull_request`, dan `release`, dengan deduplikasi berdasarkan commit SHA. Memerlukan secrets berikut di repository:

- `TELEGRAM_TOKEN`
- `TELEGRAM_CHAT_ID`