import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ID = /^(?!\.)(?!.*\.\.)[a-z0-9._-]{1,64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const REPOSITORY = /^https:\/\/[^\s]+\.git$/;
const API = /^(\d+)\.(\d+)$/;
const APP_API_MAJOR = 1;
const FIELDS = ["id", "name", "description", "repository", "commit", "api", "tags"];
const MAX_TEXT = 200;

const index = JSON.parse(readFileSync(new URL("../index.json", import.meta.url), "utf8"));
const problems = [];
const seen = new Set();

function manifestAt(repository, commit) {
  const folder = mkdtempSync(join(tmpdir(), "krad-index-"));
  try {
    const git = (...args) => execFileSync("git", ["-C", folder, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    git("init", "--quiet");
    git("remote", "add", "origin", repository);
    git("fetch", "--quiet", "--depth", "1", "origin", commit);
    return git("show", `${commit}:extension.toml`);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

function field(toml, name) {
  return new RegExp(`^${name}\\s*=\\s*"([^"]*)"`, "m").exec(toml)?.[1];
}

for (const [position, entry] of (index.extensions ?? []).entries()) {
  const where = `entry ${position} (${entry.id ?? "no id"})`;
  const missing = FIELDS.filter((name) => !(name in entry));
  if (missing.length > 0) {
    problems.push(`${where}: missing ${missing.join(", ")}`);
    continue;
  }
  if (!ID.test(entry.id)) problems.push(`${where}: the id must be lowercase, without "..", not starting with "."`);
  if (seen.has(entry.id)) problems.push(`${where}: the id is listed twice`);
  seen.add(entry.id);
  if (!REPOSITORY.test(entry.repository)) problems.push(`${where}: the repository must be an https git address ending in .git`);
  if (!COMMIT.test(entry.commit)) problems.push(`${where}: the commit must be 40 lowercase hex digits`);
  if (!API.test(entry.api)) problems.push(`${where}: the api must read major.minor`);
  if (entry.name.length > MAX_TEXT || entry.description.length > MAX_TEXT) problems.push(`${where}: name and description stay under ${MAX_TEXT} characters`);
  if (/[\r\n]/.test(entry.name + entry.description)) problems.push(`${where}: name and description fit on one line`);
  if (!Array.isArray(entry.tags) || entry.tags.some((tag) => typeof tag !== "string")) problems.push(`${where}: tags are a list of words`);
  if (problems.length > 0) continue;
  try {
    const manifest = manifestAt(entry.repository, entry.commit);
    if (field(manifest, "id") !== entry.id) problems.push(`${where}: extension.toml at ${entry.commit} declares id "${field(manifest, "id")}"`);
    if (field(manifest, "api") !== entry.api) problems.push(`${where}: extension.toml at ${entry.commit} needs api ${field(manifest, "api")}`);
    if (Number(API.exec(entry.api)?.[1]) !== APP_API_MAJOR) problems.push(`${where}: api ${entry.api} is not offered by Krad ADE`);
  } catch (error) {
    problems.push(`${where}: could not read extension.toml at ${entry.commit}: ${String(error.message ?? error).split("\n")[0]}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  process.exit(1);
}
process.stdout.write(`index.json lists ${seen.size} valid extensions\n`);
