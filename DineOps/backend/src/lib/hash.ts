import bcrypt from "bcrypt"

const SALT_ROUNDS = 12

// Password hashing helpers for secure credential storage.
export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string) {
  // Compare a plaintext password against a stored bcrypt hash.
  return bcrypt.compare(password, hash)
}
