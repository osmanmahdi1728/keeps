const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Vercel's Neon store exposes several aliases. Schema changes prefer a direct
// (non-pooled) connection; the app itself is happy on the pooled one.
const RUNTIME_KEYS = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT_KEYS = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
];

const present = [...new Set([...RUNTIME_KEYS, ...DIRECT_KEYS])].filter(
  (key) => process.env[key],
);
console.log(`Database env vars found: ${present.join(", ") || "none"}`);

const pick = (keys) => keys.map((key) => process.env[key]).find(Boolean);
const runtimeUrl = pick(RUNTIME_KEYS);
const directUrl = pick(DIRECT_KEYS) ?? runtimeUrl;

if (!runtimeUrl) {
  console.error(
    "No database URL. In Vercel, attach the Neon store or set DATABASE_URL in Settings > Environment Variables.",
  );
  process.exit(1);
}

const root = path.join(__dirname, "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

function run(command, args, databaseUrl) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(bin("prisma"), ["generate"], runtimeUrl);
run(bin("prisma"), ["db", "push", "--accept-data-loss"], directUrl);
run(process.execPath, [path.join(__dirname, "seed.js")], directUrl);
run(bin("next"), ["build"], runtimeUrl);
