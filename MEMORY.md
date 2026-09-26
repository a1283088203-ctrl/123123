# MEMORY.md

这个文件用于保存跨会话、长期有效且值得被重复加载的记忆。

## SEAM 应用（/workspace，STATIC_SITE）

- 2026-09-27 上线预览：Seam Carving 内容感知缩放单页应用，文件为 `index.html`（壳）+ `style.css` + `app.js`，纯静态，python http.server 3030 + redcowork-preview 注册。
- 2026-09-27 迭代：worker 内 seam carving 完成后对结果统一叠 20% 高斯模糊（可分离卷积 + 预乘 alpha，σ=0.2×max(15,(w+h)/200)），无 UI 开关；改强度改 `blurSigma`。
- 2026-09-27 迭代：点开始先做主体分离再缩放。方案 = 本地 ONNX 推理：`ai/ort/`（onnxruntime-web 1.16.2 UMD + simd/plain wasm）+ `ai/u2netp.onnx`（@rmbg/model-u2netp，显著性检测，任意主体，无类别标签）。输入约定 (v-128)/256、320×320、CHW、取 outputNames[0] 当 alpha。曾试 mediapipe deeplab（floe/backscrub 的 tflite 缺 Tasks 元数据不可用，已删 vision/ 目录）。沙箱 egress：仅 jsdelivr/registry.npmjs/api.github.com 可达，googleapis/raw.githubusercontent 不通；GitHub release 资产与 data.jsdelivr 不可用。
- 2026-09-27 迭代：seam+模糊后对主体 alpha 边界做低边形折角化（worker 内纯 JS）：α>127 二值化 → 最大连通域 → Moore 边界追踪 → Douglas-Peucker 简化（容差 0.015×对角线）→ 扫描线填充硬 alpha（只剩 0/255）。`postMessage` 带 `polygonize` 标志（仅主体识别成功时）。折角强度改 worker 里 `tolerance` 一行。
- 2026-09-27 迭代：标题文字「让图像，重新排列。」换成用户提供的白色 logo `title.png`（透明底白字："如果看扁我/那我就扁扁地走开～～"，1577×355），`#empty` 改为 img，高度 clamp(26px,4vw,50px) 与原字号一致。
- **上线排查（2026-09-27 04:55）**：用户报上线链接 401 unauthorized。已确认：预览接口正常（无鉴权 200）；沙箱无法访问 aicopilot.redcowork.com（egress 封锁，无法验证公开链接）；尝试 POST `/redcowork/api/package`（带/不带 `{"projectPath":"/workspace"}`）→ 均返回 404 Not Found，**未找到正确的 STATIC_SITE 打包接口**。待办：向用户确认其"上线"操作入口（平台 UI 按钮？），或查 /app/docs 找 package API 正确路径。预览链接可用作临时分享。
- **硬约束：`index.html` 必须保持 < 2000 字节**。`redcowork-preview` 的目录列表检查用 `curl … | head -c 2000`，页面超过 2KB 时 curl 报 exit 23、脚本静默退出、注册失败。改版时新增内容一律进 `app.js` / `style.css`，别内联回 index.html。

使用原则：

- 只记录能帮助后续 Agent 做出更好决策的信息。
- 优先写一句话结论，不堆积原始过程。
- 当信息失效、被覆盖或不再重要时，应及时清理或改写。

治理规则：

- 该文件是当前工作区的主长期记忆索引；其他 Skill 或外部记忆系统可以提供辅助信息，但不应无规则覆盖这里的内容。
- 该文件的内容优先来自 `memory/YYYY-MM-DD.md` 的提炼、用户显式确认，以及复盘后确认值得长期保留的结论。
- 当信息发生冲突时，优先级为：当前对话中的最新明确指令 > 较新的记忆记录 > 较旧的历史条目。