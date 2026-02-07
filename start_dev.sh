#!/bin/bash

PORT=1420

# Check if port is in use
# lsof -ti :$PORT lists only the PID of the process listening on the port
PID=$(lsof -ti :$PORT)

if [ -n "$PID" ]; then
  echo "⚠️  Port $PORT is in use by PID $PID."
  echo "🔪 Killing process $PID..."
  kill -9 $PID
  echo "✅ Process $PID killed."
else
  echo "✅ Port $PORT is free."
fi

# Navigate to client and start tauri dev
echo "🚀 Starting development server..."
cd client
pnpm tauri:dev
