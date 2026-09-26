import { readFileSync } from "node:fs";

const OWNER = "a1283088203-ctrl", REPO = "bian", BRANCH = "main";
const TOKEN = process.env.GH_TOKEN;

const files = [
  "index.html", "style.css", "app.js",
  "title.png", "upload-btn.png", "start-btn.png", "save-btn.png", "back-btn.png",
  "ai/u2netp.onnx",
  "ai/ort/ort.min.js", "ai/ort/ort-wasm.wasm", "ai/ort/ort-wasm-simd.wasm",
];

async function api(path, method = "GET", body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return json;
}

// 0. 当前 HEAD（repo 非空，probe.txt 在里面）
const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
const parentSha = ref.object.sha;
console.log(`HEAD ${parentSha.slice(0, 7)}`);
const parentCommit = await api(`/repos/${OWNER}/${REPO}/git/commits/${parentSha}`);

// 1. 逐文件建 blob
const tree = [];
for (const f of files) {
  const b64 = readFileSync(`/workspace/${f}`).toString("base64");
  const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, "POST", {
    content: b64, encoding: "base64",
  });
  tree.push({ path: f, mode: "100644", type: "blob", sha: blob.sha });
  console.log(`blob ok ${f}`);
}
// .nojekyll 防 Pages 按 Jekyll 处理
const noj = await api(`/repos/${OWNER}/${REPO}/git/blobs`, "POST", {
  content: "", encoding: "utf-8",
});
tree.push({ path: ".nojekyll", mode: "100644", type: "blob", sha: noj.sha });
// 删掉探测文件
tree.push({ path: "probe.txt", mode: "100644", type: "blob", sha: null });
console.log("blobs done, tree entries:", tree.length);

// 2. 建树（基于现有树）+ 提交
const t = await api(`/repos/${OWNER}/${REPO}/git/trees`, "POST", {
  base_tree: parentCommit.tree.sha, tree,
});
const c = await api(`/repos/${OWNER}/${REPO}/git/commits`, "POST", {
  message: "SEAM app: seam carving + subject cutout + polygonize",
  tree: t.sha, parents: [parentSha],
});
console.log(`commit ok ${c.sha}`);

// 3. 快进 main
await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, "PATCH", {
  sha: c.sha, force: false,
});
console.log("main updated");

// 4. 开 GitHub Pages
try {
  const pages = await api(`/repos/${OWNER}/${REPO}/pages`, "POST", {
    source: { branch: BRANCH, path: "/" },
  });
  console.log(`pages ok ${pages.html_url}`);
} catch (e) {
  console.log(`pages: ${e.message}`);
}
