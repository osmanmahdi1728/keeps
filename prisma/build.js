const { spawnSync } = require("node:child_process");
const path = require("node:path");

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL. In Vercel, connect the Neon store or add DATABASE_URL / POSTGRES_URL.",
  );
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: databaseUrl };
const root = path.join(__dirname, "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env, cwd: root });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(bin("prisma"), ["generate"]);
run(bin("prisma"), ["db", "push"]);
run(process.execPath, [path.join(__dirname, "seed.js")]);
run(bin("next"), ["build"]);
