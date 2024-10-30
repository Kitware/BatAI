# Use official Node.js image as the base image for building Vue.js app
FROM node:16 as build-stage

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY client .

# Build the Vue.js application
RUN npm run build

# Use NGINX as the final base image
FROM nginx:alpine

# Remove default NGINX website
RUN rm -rf /usr/share/nginx/html/*

# Copy built Vue.js app to NGINX HTML directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

RUN ls
# Copy custom NGINX configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
