# Use Ubuntu as the base image
FROM ubuntu:22.04

# Set environment variable to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt update && apt install -y \
  curl \
  git \
  unzip \
  ffmpeg \
  build-essential \
  ca-certificates

# Install Node.js 20 and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt install -y nodejs

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Install PM2 globally
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Copy dependencies first
COPY package.json ./
COPY bun.lockb ./

# Install project dependencies with Bun
RUN bun install

# Copy the rest of the project files
COPY . .

# Optional: expose a port (not needed for Discord bots)
EXPOSE 3000

# Start using PM2 (make sure ecosystem.config.js exists)
CMD ["pm2","start", "ecosystem.config.cjs", "--no-daemon"]
