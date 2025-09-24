# --- STAGE 1: Build the Application ---
# This stage sets up a temporary environment to build your Node.js app.
# We use a Node.js base image (node:20-alpine) because it contains npm and Node.js.
FROM node:20-alpine AS builder

# Set the working directory inside the container. All subsequent commands will be run from here.
WORKDIR /app

# Copy the package.json and package-lock.json first.
# This allows Docker to cache the npm install step if these files don't change, speeding up future builds.
COPY package*.json ./

# Install all project dependencies.
RUN npm install

# Copy the rest of the application source code into the container.
COPY . .

# Run the build command as defined in your package.json.
# This generates the optimized, static HTML/CSS/JS files into the 'dist' directory.
RUN npm run build
# --- STAGE 1: Build the Application (Modified) ---
FROM node:20-alpine AS builder

# ... (Previous lines remain the same: WORKDIR, COPY package*.json, RUN npm install)

# Copy all source files
COPY . .

# Run the build command
RUN npm run build

# ADD THIS LINE TO DEBUG: Show contents of the /app directory
RUN ls -la /app 

# ... (Rest of Dockerfile remains the same)



# --- STAGE 2: Serve the Static Files with Nginx ---
# This is the final, production-ready stage. We use a very small Nginx image.
FROM nginx:alpine

# Copy the custom Nginx configuration file we created in the previous step.
# This ensures Nginx knows how to handle your Single Page Application.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the 'builder' stage into the Nginx public directory.
# The '--from=builder' flag is crucial for this multi-stage copy.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world, so the container can receive web traffic.
EXPOSE 80

# The command that starts the Nginx server when the container runs.
# "daemon off;" keeps it running in the foreground, which is necessary for Docker.
CMD ["nginx", "-g", "daemon off;"]