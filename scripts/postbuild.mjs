// Copies the assets that `output: "standalone"` does not include by itself.
// Written as a Node script so it runs on Windows too — the previous shell
// version failed there (`cmd` cannot parse `mkdir -p` / `&&` / `||`).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneNext = join(root, ".next", "standalone", ".next");

mkdirSync(standaloneNext, { recursive: true });

const copy = (from, to, label) => {
  if (!existsSync(from)) {
    console.log(`[postbuild] skipped ${label}: source not found`);
    return;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[postbuild] copied ${label}`);
};

copy(join(root, ".next", "static"), join(standaloneNext, "static"), ".next/static");
copy(join(root, "public"), join(root, ".next", "standalone", "public"), "public/");
