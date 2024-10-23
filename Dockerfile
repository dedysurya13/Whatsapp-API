# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/engine/reference/builder/

# Gunakan image Node.js sebagai basis
FROM node:18.0.0

# Buat direktori kerja untuk aplikasi
WORKDIR /app

# Copy file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua file aplikasi ke dalam container
COPY . .

# Tentukan port yang akan digunakan oleh aplikasi
EXPOSE 8000

# Jalankan aplikasi
CMD npm run start:auto