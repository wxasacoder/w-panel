# W-Panel

局域网可用的个人导航页：分组书签、毛玻璃视觉、天气动效与本地持久化。无登录，默认展示模式，通过右下角开关进入编辑模式。

---

## 产品定位与信息架构

- **展示 / 编辑**：进入页面始终为展示模式；右下角切换为编辑模式后，增删改分组与卡片、拖动排序均会自动保存；再次切换回展示模式。
- **内容模型**：**分组（Group）** 包含多条 **书签卡片（Card）**。卡片字段包括标题、URL、打开方式（当前标签 / 新标签）、图标来源（站点 favicon / 上传图片 / 首字母 + 背景色）。
- **数据**：后端使用 **SQLite**，数据目录可配置，适合单机或 Docker 挂载。

---

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3、TypeScript、Vite、Sass |
| 后端 | Go、Gin |
| 存储 | SQLite（`mattn/go-sqlite3`） |
| 部署 | 单二进制内嵌 `frontend/dist`，Docker 多阶段构建 |

前端构建产物由 Go 通过 `embed` 打包，对外只需一个 HTTP 服务；`/api/*` 为 JSON API，其余路径回退到单页应用的 `index.html`。

---

## 视觉与交互设计

### Liquid Glass（液态玻璃）

当前主视觉为 **苹果风格的 Liquid Glass**：圆角卡片、左侧图标 + 右侧标题与域名、浅色描边与内阴影、高光与反射渐变（由主题 CSS 变量驱动）。

书签卡片在实现上采用分层结构：

- **玻璃扭曲层**：`backdrop-filter` 采集背后壁纸，再配合 **全局共享的 SVG 滤镜**（`feDisplacementMap` 等）做边缘折射与色差感。
- **着色层**：与滤镜分离，避免位移产生的色块伪影。
- **悬停**：桌面端支持透视倾斜与动态阴影；玻璃相关特效在 **全局性能预设** 下 **仅在悬停时挂载重型 SVG 滤镜**（详见下文「前端性能优化」）。

### 全局 UI 毛玻璃

导航栏、分组标题条等使用 `--ui-blur` 等变量控制模糊强度，与卡片区域的毛玻璃参数可在设置中联动调节。

### 壁纸与蒙层

支持自定义背景图、壁纸模糊、叠加蒙层；卡片透明度、文字颜色与透明度可在设置中覆盖主题默认值。

### 天气效果

开启 **雨天** 后，在毛玻璃视觉之上叠加 **雨滴沿玻璃滑落** 的 Canvas 动效（强度可调）。

### 主题系统

主题通过 **CSS 自定义属性** 作用于 `:root`，组件读取变量渲染。内置主题以 **Liquid Glass** 为主；扩展主题可新增 `ThemeVars` 并在 `useTheme` 与后端主题列表中注册（详见 [`docs/theme-development.md`](docs/theme-development.md)）。

主要变量包括：`--card-bg`、`--card-border`、`--card-shadow`、`--card-radius`、`--card-backdrop-blur`、`--card-hover-transform`、`--text-primary`、`--text-secondary`、`--accent-color`、`--glass-reflection` 等；用户侧还有 `--user-card-opacity`、壁纸模糊等与主题叠加。

---

## 前端性能优化（Linux 预设 → 全平台）

Liquid Glass 依赖 **`backdrop-filter`** 与 **复杂 SVG 滤镜链**（多张 `feDisplacementMap`、色差合成、`feGaussianBlur` 等），在高分屏、多卡片同时可见时，GPU 与合成成本很高。早期仅在 **Linux + Chrome** 下通过 UA 判断启用一套更轻的参数，实测 **滚动与交互明显更顺滑**；在 **iPhone** 等设备上体感也很好。随后在桌面 **macOS** 等环境上，完整特效路径仍容易成为瓶颈。

因此将这套 **已验证有效的「Linux 性能预设」** 改为 **全平台默认启用**：在 [`frontend/src/composables/usePerformance.ts`](frontend/src/composables/usePerformance.ts) 中不再依赖真实 UA，**始终走原 Linux 分支**（代码里仍沿用 `isLinuxChrome` 命名，语义上表示「高性能预设」）。这样 **所有浏览器** 使用同一套优化策略，避免维护多套平台分支。

### 优化具体做了什么

| 环节 | 原「非 Linux」行为（更重） | Linux 预设（现全局） |
|------|---------------------------|----------------------|
| 全局 UI 毛玻璃 `--ui-blur` | 约 `blur(20px)` | `blur(8px)`，减少大面积采样 |
| 卡片 `backdrop-filter` 模糊系数 | `blurCoefficient = 32` | `16`，降低每张卡片的模糊运算量 |
| 书签卡 `filter: url(#glass-filter-shared)` | 常驻，每张卡持续跑 SVG 滤镜链 | **仅鼠标悬停时** 叠加；非悬停只保留 `backdrop-filter` |
| 共享滤镜内 `feGaussianBlur`（`filterStdDeviation`） | 使用完整 `base` | `base × 0.7`（下限 0.1），减轻色差通道后的高斯模糊 |

实现位置对应关系：

- **`usePerformance`**：初始化时设置 `blurCoefficient`、根节点 `--ui-blur`，并令 `isLinuxChrome === true` 以统一分支。
- **[`BookmarkCard.vue`](frontend/src/components/BookmarkCard.vue)**：根据 `isLinuxChrome` 决定 `warpStyle` 是否在悬停时才附加 `url(#glass-filter-shared)`。
- **[`App.vue`](frontend/src/App.vue)**：`filterStdDeviation` 在 `isLinuxChrome` 为真时使用 `base * 0.7`。

### 体验与维护说明

- **视觉效果**：非悬停时玻璃折射略「安静」一些，悬停时仍完整呈现 Liquid 质感；全局 UI 与卡片毛玻璃略轻，与「流畅优先」一致。
- **若需恢复更重画质**：可将 `usePerformance.ts` 中的强制逻辑改回真实 UA 检测，或改为用户设置项（例如「高质量 / 流畅」两档）——当前仓库选择 **默认流畅**。

---

## 功能清单

- 分组：新增（弹窗输入名称）、重命名、删除；**拖动排序**后自动保存顺序。
- 卡片：新增 / 编辑 / 删除；**拖动排序**（组内）；图标支持 favicon 拉取、上传、首字母。
- 设置：主题、背景、壁纸库、毛玻璃与 Liquid 参数、天气、快捷键搜索等。
- **搜索**：`Ctrl + K`（或 `Cmd + K`）打开搜索，按标题或 URL 匹配书签。

---

## 后端 API 概览

基础路径：`/api`（JSON）。

| 领域 | 说明 |
|------|------|
| `/api/groups` | 分组 CRUD、`PUT /groups/reorder` 排序 |
| `/api/cards` | 卡片 CRUD、`PUT /cards/reorder` 组内排序 |
| `/api/search` | 书签搜索 |
| `/api/settings` | 读写用户设置 |
| `/api/upload`、`/api/uploads/...` | 上传与访问用户图标等 |
| `/api/wallpapers` | 壁纸管理 |
| `/api/favicon` | 从 URL 获取 favicon |
| `/api/themes` | 主题列表与安装 |

上传体积限制在服务端配置（例如 10MB 级别 multipart）。

---

## 项目使用方式

### 环境要求

- **本地开发**：Go（与 `go.mod` 一致）、Node.js 20+（用于前端构建）。
- **Docker**：Docker 与 Docker Compose；Compose 示例依赖名为 `wx` 的外部网络（见下文）。

### 方式一：本地运行（前后端分离开发）

1. **启动后端**（在项目根目录）：

   ```bash
   cd /path/to/w-panel
   go run .
   ```

   - 默认监听端口：**8080**（可用环境变量 `PORT` 覆盖）。
   - 数据目录：默认 `./data`，可用 **`DATA_DIR`** 指定绝对或相对路径。

2. **构建并嵌入前端**（修改 UI 后需要执行）：

   ```bash
   cd frontend
   npm ci
   npm run build
   cd ..
   go run .
   ```

   **开发联调（热更新）**：终端 A 在项目根目录 `go run .`；终端 B 在 `frontend` 执行 `npm run dev`。Vite 已将 `/api` 代理到 `http://localhost:8080`（见 `frontend/vite.config.ts`）。**生产形态**为构建 `frontend/dist` 后由 Go 嵌入，只起一个进程即可。

### 方式二：Docker Compose

1. 创建外部网络（若尚未存在）：

   ```bash
   docker network create wx
   ```

2. 在项目根目录：

   ```bash
   docker compose up -d --build
   ```

   - 映射端口：**8080:8080**
   - 数据卷：`./data` → 容器内 `/app/data`
   - 环境变量：`DATA_DIR=/app/data`，`PORT=8080`

镜像通过根目录 `Dockerfile` 多阶段构建：Node 构建前端 → Go 编译 CGO + SQLite → 最终 Alpine 镜像。

### 访问

浏览器打开：`http://localhost:8080`（或你映射的端口）。

### 常用命令小结

| 场景 | 命令 |
|------|------|
| 仅构建前端 | `cd frontend && npm ci && npm run build` |
| 前端类型检查 + 生产构建 | `cd frontend && npm run build` |
| 运行后端（需已存在 `frontend/dist`） | 项目根目录 `go run .` 或运行编译出的 `./w-panel` |

---

## 相关文档

- 原始需求摘要：[`design_doc.md`](design_doc.md)
- 主题开发指南：[`docs/theme-development.md`](docs/theme-development.md)
