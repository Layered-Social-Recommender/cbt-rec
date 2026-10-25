# Multi-runtime container: Node 20 + Python 3 on Debian Bookworm
FROM node:20-bookworm-slim

# Install Python 3, pip, and virtual environment tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files (source code, config, SQLite dataset, and requirements)
COPY . .

# Create Python virtual environment and install dependencies
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Install backend Node.js dependencies
WORKDIR /app/ui/backend
RUN npm install --omit=dev

# Return to root directory so python -m and relative dataset paths resolve correctly
WORKDIR /app

# Default environment variables
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

# Start the Express server
CMD ["node", "ui/backend/server.js"]
