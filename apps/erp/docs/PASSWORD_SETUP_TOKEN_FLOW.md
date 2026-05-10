# Password Setup Token Flow

Implemented secure password setup tokens with Redis-backed one-time usage:

- Generate token using `crypto.randomBytes(32)` for each password email send.
- Store only SHA-256 hashed token in Redis with key format `password:setup:{hashedToken}`.
- Apply Redis TTL of 24 hours (`ex: 60 * 60 * 24`) for automatic expiry.
- Send only raw token in the HTTPS setup link query param.
- Added `POST /api/set-password` to validate token and password rules, hash password with bcrypt, and invalidate token via Redis delete after successful use.

Security behavior:

- Raw token is never persisted to DB/Redis.
- Token lookup always hashes incoming token before Redis access.
- Setup tokens are single-use and expire automatically.
