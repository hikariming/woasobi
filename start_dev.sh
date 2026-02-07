#!/bin/bash

# Kill any existing processes on dev ports
for PORT in 1420 2026; do
  PID=$(lsof -ti :$PORT)
  if [ -n "$PID" ]; then
    echo "⚠️  Port $PORT is in use by PID $PID. Killing..."
    kill -9 $PID
    echo "✅ Process killed."
  else
    echo "✅ Port $PORT is free."
  fi
done

# Navigate to client and start tauri dev (includes API + Tauri)
echo "🚀 Starting API backend + Tauri frontend..."
cd client
pnpm tauri:dev
