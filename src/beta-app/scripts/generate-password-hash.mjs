import argon2 from "argon2";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node generate-password-hash.mjs <password>");
  process.exit(1);
}

const hashPassword = async () => {
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    console.log(hash);
  } catch (err) {
    console.error("Failed to hash password:", err);
    process.exit(1);
  }
};

hashPassword();
