# Group Chat Realtime

Real-time group chat with AI-assisted moderation. The app combines a FastAPI backend, a Next.js frontend, WebSocket chat, authentication, and message analysis for toxicity, intent, and tone.

## What this project does

- Real-time chat rooms with live messaging
- User authentication with JWT tokens
- AI moderation signals for toxic language, intent, and tone
- Message editing, reactions, pinning, and room management features
- Profile views and user room access controls

## Project Structure

- `backend/` FastAPI application, models, ML helpers, and database setup
- `frontend/` Next.js application and UI components
- `datasets/` training and reference data used by moderation models
- `docs/` API and deployment documentation
- `screenshots/` product screenshots and UI captures

## Prerequisites

- Python 3.10+ for the backend
- Node.js 18+ for the frontend
- A database, either SQLite for local development or PostgreSQL for production
- Optional: Cloudinary credentials for uploads
- Optional: OpenAI API key if you want to use related AI features

## Backend Setup

1. Create and activate a virtual environment in `backend/`.
2. Install dependencies.
3. Copy `backend/.env.example` to `backend/.env` and update the values for your machine.
4. Start the API server.

Example:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend reads its database connection from `DATABASE_URL`. SQLite is the easiest local option, while PostgreSQL is recommended for deployed environments.

## Frontend Setup

1. Install dependencies in `frontend/`.
2. Point the app at your backend API and WebSocket server.
3. Start the development server.

Example:

```bash
cd frontend
npm install
npm run dev
```

Set these environment variables for the frontend when needed:

- `NEXT_PUBLIC_API_URL` for the REST API base URL
- `NEXT_PUBLIC_WS_URL` for the WebSocket base URL

## Environment Variables

The backend expects values such as:

- `DATABASE_URL`
- `SECRET_KEY`
- `FRONTEND_URL`
- `OPENAI_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Use `backend/.env.example` as the starting point, then replace any placeholder or local-only values before running the app.

## Useful Commands

Backend:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm start
```

## Deployment Notes

The repo includes deployment guidance in `docs/DEPLOYMENT.md`. For production, make sure to:

- Use a real database instead of the default SQLite file
- Set a strong `SECRET_KEY`
- Configure CORS for your deployed frontend origin
- Verify `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
- Avoid loading heavy ML components at startup if your hosting plan has tight memory limits

## API Documentation

See `docs/API.md` for endpoint examples and response shapes.

## Notes

- The backend is built around FastAPI, SQLAlchemy, JWT auth, and WebSockets.
- The frontend uses the Next.js App Router and Tailwind CSS.
- Some moderation components are optional and may fall back to lighter behavior if model loading fails.