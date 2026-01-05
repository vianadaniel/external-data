# Use the official Node.js image as a base
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy the rest of the files to the working directory
COPY . .

# Compile the TypeScript code with increased memory limit
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# Expose the port on which the NestJS server is running
EXPOSE 3002

# Command to start the application when the container is started
CMD ["npm", "run", "start:prod"]

