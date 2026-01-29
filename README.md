# Quizz

Live, multi‑step quiz flow with presenter controls and participant voting.

## Requirements
- Node.js 18+
- MongoDB (local or Atlas)

## Setup
1. Install dependencies:
   - `cd server && npm install`
   - `cd client && npm install`
2. Create `server/.env`:
   - `MONGODB_URI=your_mongodb_connection_string`

## Run locally
- Server: `cd server && npm run dev`
- Client: `cd client && npm run dev`

Client runs on `http://localhost:5173` by default.

## App routes
- `/` Home
- `/start` Presenter start (creates a quiz)
- `/start/:quizzId/:phase` Presenter deep‑link with state
- `/go/:quizzId` Participant join link

## Deployment (Render)
- Server: Render Web Service (root `server`, start `node index.js`)
- Client: Render Static Site (root `client`, build `npm run build`, publish `dist`)

If you deploy separately, set a client API base URL and enable CORS on the server.
