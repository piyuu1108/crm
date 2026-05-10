
git clone https://github.com/mohit-rajput-py/erp-clg.git
cd apps/client
pnpm install
Environment Variables

Create a .env file in the root directory:

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Database (Neon)
DATABASE_URL=

# QStash
QSTASH_URL=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Brevo)
BREVO_API_KEY=

# S3 (MinIO local or AWS)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=erp-dev
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

run
pnpm dev