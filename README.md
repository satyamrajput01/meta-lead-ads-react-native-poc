# Meta Lead Ads + React Native PoC

A proof-of-concept for delivering Meta Lead Ads to an already-open React Native application in real time.

## Overview

The system is designed so that when a lead is submitted through Meta Lead Ads, the lead can be received by the backend and delivered to the React Native application without manually refreshing the app.

### Intended Flow

Meta Lead Ads  
↓  
Meta Webhook  
↓  
Node.js / Express Backend  
↓  
Meta Graph API  
↓  
Local Persistence  
↓  
Socket.IO  
↓  
React Native App

## Features

- Meta webhook endpoint with verification support
- Lead data processing and normalization
- Lead persistence
- Real-time lead delivery using Socket.IO
- React Native mobile application
- User authentication
- User-specific Socket.IO rooms
- Web dashboard for monitoring server status and leads
- Development lead simulator for local testing
- Mobile connection status
- Duplicate lead handling

## Tech Stack

### Backend

- Node.js
- Express
- TypeScript
- Socket.IO
- REST APIs
- Local JSON-based persistence

### Mobile

- React Native
- Expo SDK 57
- TypeScript
- React Navigation
- Socket.IO Client
- AsyncStorage

### Web Dashboard

- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide Icons

## Project Structure

```text
.
├── backend/       # Backend services and API logic
├── mobile/        # React Native application
├── src/           # Web dashboard
├── data/          # Local runtime data
├── server.ts      # Unified backend + web server
└── package.json


Install dependencies
From the project root:
npm install

For the mobile app:
cd mobile
npm install

Start the backend and dashboard
From the project root:
npm run dev

The dashboard will be available at:
http://localhost:3000

Start the React Native app
cd mobile
npx expo start

For a physical device, configure the API URL in:
mobile/src/config/env.ts

using a local network address or HTTPS tunnel.
