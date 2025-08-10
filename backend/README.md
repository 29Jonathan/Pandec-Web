Backend quick notes

Env: copy `.env.example` to `.env` and fill values.

Run:
```
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API endpoints under `/api/`.


