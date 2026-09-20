# Start FundTrace

## 1. Install Dependencies
Run the following commands to install dependencies for both the frontend and backend:

```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

## 2. Start Local Blockchain (Hardhat)
To start a local hardhat node and deploy the contracts for testing:
```bash
npx hardhat node
```
In another terminal, deploy the smart contracts (or run the live demo script):
```bash
npm run demo:reset
# or
npm run demo:live
```

## 3. Start Backend (NestJS)
To run the NestJS backend API:
```bash
npm run backend:dev
```
*Backend runs on `http://localhost:3001`*

## 4. Start Frontend (Next.js)
To run the Next.js frontend:
```bash
npm run dev
```
*Frontend runs on `http://localhost:3000`*

## Environment Variables
Make sure to set up `.env` for both frontend and backend using their respective `.env.example` templates if you haven't already.
