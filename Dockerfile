# Sử dụng Node.js 20 Alpine làm base image để có kích thước nhẹ
FROM node:20-alpine AS builder

# Thư mục làm việc trong container
WORKDIR /app

# Cài đặt các công cụ build hỗ trợ biên dịch package native (như bcrypt)
RUN apk add --no-cache python3 make g++

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# ----------------------------------------------------
# Production Image
# ----------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules và source code từ stage builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# Expose port ứng dụng (mặc định trong .env là 8080)
EXPOSE 8080

# Lệnh khởi chạy ứng dụng
CMD ["node", "app.js"]
