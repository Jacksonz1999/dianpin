import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const { Pool } = pg;
const sourceUrl = process.env.DATABASE_URL;
const restoreUrl = process.env.BACKUP_RESTORE_DATABASE_URL;
const skipUpload = process.env.BACKUP_SKIP_UPLOAD === "1";
const pgDumpBin = process.env.PG_DUMP_BIN ?? "pg_dump";
const pgRestoreBin = process.env.PG_RESTORE_BIN ?? "pg_restore";
const dockerToolContainer = process.env.BACKUP_DOCKER_CONTAINER;

const EXPECTED_TABLES = [
  "cities",
  "job_types",
  "users",
  "seeker_profiles",
  "stores",
  "jobs",
  "applications",
  "reviews",
  "reports",
  "job_alerts",
  "seeker_posts",
  "auth_challenges",
  "auth_sessions",
];
const EXPECTED_CONSTRAINTS = [
  "applications_job_id_seeker_user_id_key",
  "reviews_store_id_seeker_user_id_key",
  "auth_sessions_token_hash_key",
];
const ORPHAN_CHECKS = [
  `SELECT count(*)::int AS count FROM jobs j
   LEFT JOIN stores s ON s.id = j.store_id WHERE s.id IS NULL`,
  `SELECT count(*)::int AS count FROM applications a
   LEFT JOIN jobs j ON j.id = a.job_id WHERE j.id IS NULL`,
  `SELECT count(*)::int AS count FROM applications a
   LEFT JOIN users u ON u.id = a.seeker_user_id WHERE u.id IS NULL`,
  `SELECT count(*)::int AS count FROM reviews r
   LEFT JOIN stores s ON s.id = r.store_id WHERE s.id IS NULL`,
  `SELECT count(*)::int AS count FROM reviews r
   LEFT JOIN users u ON u.id = r.seeker_user_id WHERE u.id IS NULL`,
  `SELECT count(*)::int AS count FROM auth_sessions s
   LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL`,
];

function redact(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgresql://[redacted]")
    .slice(0, 2000);
}

function databaseIdentity(value) {
  const url = new URL(value);
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

function assertConfiguration() {
  if (!sourceUrl) throw new Error("DATABASE_URL is required");
  if (!restoreUrl) throw new Error("BACKUP_RESTORE_DATABASE_URL is required");
  if (databaseIdentity(sourceUrl) === databaseIdentity(restoreUrl)) {
    throw new Error("Restore database must be different from the source database");
  }
  if (!/(test|restore|e2e)/i.test(new URL(restoreUrl).pathname)) {
    throw new Error(
      "Refusing to reset a restore database whose name lacks test/restore/e2e"
    );
  }
  if (!skipUpload) {
    for (const key of [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY",
      "R2_SECRET_KEY",
      "R2_BUCKET",
    ]) {
      if (!process.env[key]) throw new Error(`${key} is required for upload`);
    }
  }
}

function runTool(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      reject(new Error(`Could not start ${command}: ${error.message}`));
    });
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${code}): ${redact(stderr)}`));
    });
  });
}

async function resetRestoreDatabase() {
  const pool = new Pool({ connectionString: restoreUrl, max: 1 });
  try {
    await pool.query("DROP SCHEMA public CASCADE");
    await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await pool.query("CREATE SCHEMA public");
  } finally {
    await pool.end();
  }
}

async function verifyRestoredDatabase() {
  const pool = new Pool({ connectionString: restoreUrl, max: 1 });
  try {
    const tableResult = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)",
      [EXPECTED_TABLES]
    );
    const presentTables = new Set(tableResult.rows.map((row) => row.tablename));
    const missingTables = EXPECTED_TABLES.filter((table) => !presentTables.has(table));
    if (missingTables.length > 0) {
      throw new Error(`Restore is missing tables: ${missingTables.join(", ")}`);
    }

    const constraintResult = await pool.query(
      "SELECT conname FROM pg_constraint WHERE conname = ANY($1)",
      [EXPECTED_CONSTRAINTS]
    );
    const presentConstraints = new Set(
      constraintResult.rows.map((row) => row.conname)
    );
    const missingConstraints = EXPECTED_CONSTRAINTS.filter(
      (constraint) => !presentConstraints.has(constraint)
    );
    if (missingConstraints.length > 0) {
      throw new Error(
        `Restore is missing constraints: ${missingConstraints.join(", ")}`
      );
    }

    for (const [index, query] of ORPHAN_CHECKS.entries()) {
      const result = await pool.query(query);
      if (result.rows[0].count !== 0) {
        throw new Error(`Restore orphan check ${index + 1} failed`);
      }
    }

    const counts = {};
    for (const table of EXPECTED_TABLES) {
      // table comes exclusively from the constant allowlist above.
      const result = await pool.query(
        `SELECT count(*)::int AS count FROM "${table}"`
      );
      counts[table] = result.rows[0].count;
    }
    return counts;
  } finally {
    await pool.end();
  }
}

async function uploadBackup(filePath, key, size, sha256) {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: createReadStream(filePath),
      ContentLength: size,
      ContentType: "application/octet-stream",
      Metadata: { sha256 },
    })
  );
  const head = await client.send(
    new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
  );
  if (Number(head.ContentLength) !== size) {
    throw new Error("R2 upload size verification failed");
  }
  if (head.Metadata?.sha256 !== sha256) {
    throw new Error("R2 upload checksum metadata verification failed");
  }
}

async function dumpToFile(filePath, fileName) {
  if (dockerToolContainer) {
    const containerPath = `/tmp/${fileName}`;
    await runTool("docker", [
      "exec",
      dockerToolContainer,
      pgDumpBin,
      "--format=custom",
      "--compress=9",
      "--no-owner",
      "--no-privileges",
      `--file=${containerPath}`,
      sourceUrl,
    ]);
    await runTool("docker", [
      "cp",
      `${dockerToolContainer}:${containerPath}`,
      filePath,
    ]);
    return;
  }
  await runTool(pgDumpBin, [
    "--format=custom",
    "--compress=9",
    "--no-owner",
    "--no-privileges",
    `--file=${filePath}`,
    sourceUrl,
  ]);
}

async function restoreFromFile(filePath, fileName) {
  if (dockerToolContainer) {
    const containerPath = `/tmp/${fileName}`;
    await runTool("docker", [
      "cp",
      filePath,
      `${dockerToolContainer}:${containerPath}`,
    ]);
    await runTool("docker", [
      "exec",
      dockerToolContainer,
      pgRestoreBin,
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      `--dbname=${restoreUrl}`,
      containerPath,
    ]);
    return;
  }
  await runTool(pgRestoreBin, [
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    `--dbname=${restoreUrl}`,
    filePath,
  ]);
}

let tempDirectory;
try {
  assertConfiguration();
  tempDirectory = await mkdtemp(path.join(tmpdir(), "dianpin-backup-"));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `dianpin-${timestamp}.dump`;
  const filePath = path.join(tempDirectory, fileName);

  await dumpToFile(filePath, fileName);
  const fileStat = await stat(filePath);
  if (fileStat.size === 0) throw new Error("pg_dump produced an empty file");
  const sha256 = createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");

  await resetRestoreDatabase();
  await restoreFromFile(filePath, fileName);
  const counts = await verifyRestoredDatabase();
  console.log(`[backup] restore verified: ${JSON.stringify(counts)}`);

  if (skipUpload) {
    console.log("[backup] rehearsal passed; R2 upload skipped");
  } else {
    const prefix = (process.env.BACKUP_PREFIX ?? "dianpin")
      .replace(/\.\./g, "")
      .replace(/^\/+|\/+$/g, "");
    const key = `${prefix}/${timestamp.slice(0, 4)}/${timestamp.slice(5, 7)}/${fileName}`;
    await uploadBackup(filePath, key, fileStat.size, sha256);
    console.log(
      `[backup] uploaded and verified: ${key} (${fileStat.size} bytes, sha256=${sha256})`
    );
  }
} catch (error) {
  console.error(`[backup] failed: ${redact(error?.message ?? error)}`);
  process.exitCode = 1;
} finally {
  if (tempDirectory) {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
