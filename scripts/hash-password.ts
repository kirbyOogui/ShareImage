import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("使い方: npx tsx scripts/hash-password.ts <パスワード>");
    process.exit(1);
  }
  const hash = await hashPassword(password);
  console.log(hash);
}

main();
