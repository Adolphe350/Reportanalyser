#!/bin/sh

# Print environment information
echo "=== Environment Information ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "Current directory: $(pwd)"
echo ""

# Check if package.json exists
echo "=== File Checks ==="
if [ -f "package.json" ]; then
  echo "package.json exists"
else
  echo "ERROR: package.json not found!"
  echo "Directory contents:"
  ls -la
  
  # Use backup package.json if available
  if [ -f "package.backup.json" ]; then
    echo "Using backup package.json"
    cp package.backup.json package.json
    npm install
  fi
fi

if [ -f "index.js" ]; then
  echo "index.js exists"
else
  echo "ERROR: index.js not found!"
  echo "Directory contents:"
  ls -la
  
  # Use backup index.js if available
  if [ -f "index.backup.js" ]; then
    echo "Using backup index.js"
    cp index.backup.js index.js
  fi
fi

echo ""
echo "=== Starting Application ==="
# Start the application
node index.js 