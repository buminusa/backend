# Bumi Nusa - Backend API

Backend REST API untuk **Bumi Nusa**, platform B2B yang mempertemukan supplier (perusahaan) dengan buyer. Dibangun dengan Express.js dan Prisma ORM di atas PostgreSQL.

## Tech Stack

- **Runtime:** Node.js + Express 4
- **ORM:** Prisma 7 (`@prisma/adapter-pg`) dengan PostgreSQL
- **Auth:** JWT (`jsonwebtoken`) + `bcryptjs`
- **Upload:** Multer + Cloudinary (`multer-storage-cloudinary`)
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
│   │   └── categoriesControllers.js
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
│   │   └── categoriesRoutes.js
│   └── utils/
│       └── slug.js
├── views/                     # Jade views (default express-generator)
└── .github/workflows/
    └── telegram.yml           # Notifikasi Telegram tiap push/PR/release
```

## Model Data (Prisma)

| Model | Deskripsi |
|---|---|
| `Role` | Daftar role (Super_Admin, Admin, Supplier, Buyer, dst) |
| `Users` | Akun user, terhubung ke `Role`, `CompanyProfiles`, `BuyerProfiles` |
| `CompanyProfiles` | Profil supplier (nama perusahaan, NPWP, logo, status verifikasi) |
| `BuyerProfiles` | Profil pembeli |
| `Categories` | Kategori produk |
| `Product` | Produk milik supplier, punya status (`Draft`, `Pending`, `Active`, `Rejected`) dan views |
| `ProductImages` | Gambar produk (relasi 1-N ke `Product`) |

## API Endpoints

Base URL: `/api/v1`

### Auth (`/auth`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/register-company` | Registrasi supplier (upload NPWP + logo) |
| POST | `/register-buyer` | Registrasi buyer |
| POST | `/login` | Login, mengembalikan JWT |

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

> Catatan: rute statis (`/popular`, `/slug/:slug`) didefinisikan sebelum rute dinamis (`/:id`) agar tidak tertangkap sebagai parameter.

### Categories (`/categories`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/` | List semua kategori |
| GET | `/slug/:slug` | Detail kategori by slug |
| GET | `/:id` | Detail kategori by id |
| POST | `/` | Tambah kategori |
| PUT | `/:id` | Update kategori |
| DELETE | `/:id` | Hapus kategori |

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