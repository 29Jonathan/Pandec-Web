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
- SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
- SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
- SUPABASE_JWKS_URL=https://YOUR-PROJECT-REF.supabase.co/auth/v1/keys
- SUPABASE_JWT_SECRET=YOUR_SUPABASE_JWT_SECRET  # optional, from Settings → API (JWT secret)
- ADMIN_EMAIL=admin@example.com
- CORS_ALLOWED_ORIGINS=http://localhost:5173
- DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/postgres?sslmode=require (or keep sqlite for local)

Frontend `frontend/.env`
- VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
- VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
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


GitHub
```
git add .
git commit -m "init app"
git remote add origin git@github.com:YOUR_USER/pandec_web.git
git push -u origin main
```
