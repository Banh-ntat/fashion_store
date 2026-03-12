# Fashion Store

E-commerce web app: Django REST API + React frontend.

## Cấu trúc

- **backend/** – Django (API: products, cart, orders, accounts, reviews, contact)
- **frontend/** – React + Vite + TypeScript

## Chạy dự án

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

API: `http://127.0.0.1:8000/api/`
