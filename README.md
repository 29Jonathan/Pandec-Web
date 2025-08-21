# Pandec Web

Full-stack app: React (Vite) + Django REST, Supabase Auth/Storage, Postgres (Supabase).

Features
- User register & login (Supabase Auth). Stores `username` and `role` (customer|factory) in user metadata
- One admin user (email equals `ADMIN_EMAIL`)
- Create/View orders (order id, factory id, customer id, ship name, departure date, arrival date, type, price, amount, weight)
- Upload files and download via signed URL (bucket `uploads`)

Quick Start
1) Configure envs
```
cp backend/.env.example backend/.env || true
cp frontend/.env.example frontend/.env || true
```
Fill values as described below.

Backend `backend/.env`
- SECRET_KEY=change-me
- DEBUG=True
- ALLOWED_HOSTS=localhost,127.0.0.1
- SUPABASE_URL=https://hboosknxnrbqsgsdbljj.supabase.co
- SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib29za254bnJicXNnc2RibGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Mzk5MTcsImV4cCI6MjA3MTMxNTkxN30.fKlsokjFmqoPIw-E0l__fDKC23MqQsD5MBdwGsHWvxg
- SUPABASE_JWKS_URL=https://hboosknxnrbqsgsdbljj.supabase.co/auth/v1/keys
- SUPABASE_JWT_SECRET=LVHjGMRDMoqYyL8H31NgOCwqlTwhzc8IxC0v0cao2zaUq6rnli4l6tiGQng2KL2ESRsA0V1IVZnsmoKOvAUzdw==
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib29za254bnJicXNnc2RibGpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTczOTkxNywiZXhwIjoyMDcxMzE1OTE3fQ.k38PT-BjfNKC5BOwWY6vdSw7qm89t6f_s4Y3CP-_Rho
- ADMIN_EMAIL=admin@example.com
- CORS_ALLOWED_ORIGINS=http://localhost:5173
- DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.hboosknxnrbqsgsdbljj.supabase.co:5432/postgres?sslmode=require (or keep sqlite for local)

Frontend `frontend/.env`
- VITE_SUPABASE_URL=https://hboosknxnrbqsgsdbljj.supabase.co
- VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib29za254bnJicXNnc2RibGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Mzk5MTcsImV4cCI6MjA3MTMxNTkxN30.fKlsokjFmqoPIw-E0l__fDKC23MqQsD5MBdwGsHWvxg
- VITE_API_BASE_URL=http://127.0.0.1:8000

2) Backend
```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

3) Frontend
```
cd frontend
npm install
npm run dev -- --host
```

Open http://localhost:5173

Usage
- Register a user with username and role
- Login; then create/view orders, upload and download files

GitHub
```
git add .
git commit -m "init app"
git remote add origin git@github.com:YOUR_USER/pandec_web.git
git push -u origin main
```
