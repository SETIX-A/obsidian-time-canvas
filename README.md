# Time Canvas

An Obsidian plugin that surfaces notes written on this day in previous years, displayed as collapsible cards in the sidebar.

## Features

- **On This Day** — Automatically finds notes from the same month and day across all previous years
- **Active Note Pinned to Top** — The currently open note always appears first in its year group, doubling as a quick outline
- **Dual View Modes** — Switch between outline view (headings only) and snippet view (content preview)
- **Collapsible Cards** — Expand or collapse individual notes and year groups
- **Date Source Priority** — Choose between `created`, `date`, or custom frontmatter fields, with fallback to file creation time
- **Follow Active Note** — Dynamically updates based on the currently opened note's date
- **Display Properties** — Show frontmatter properties (title, tags, custom fields) on each card
- **Exclude Folders** — Filter out folders you don't want included in the history search
- **Customizable Appearance** — Font sizes, colors, card backgrounds, and hover effects
- **Bilingual UI** — Full Chinese and English support

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Settings → Community Plugins
2. Search for "Time Canvas"
3. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/SETIX-A/time-canvas/releases)
2. Create a folder named `time-canvas` in your vault's `.obsidian/plugins/` directory
3. Copy the three files into that folder
4. Enable the plugin in Settings → Community Plugins

## Usage

### Opening the Sidebar

- Click the **calendar-clock** ribbon icon on the left sidebar
- Or run the command **"Time canvas: Open sidebar"** from the command palette

### View Modes

- **Outline mode** — Shows heading links for each note
- **Snippet mode** — Shows a text preview of each note's content

Use the view mode toggle button in the sidebar header to switch between them.

### Date Detection

Time Canvas detects note dates in this priority order (configurable in settings):

1. Frontmatter field (e.g., `date`, `created`, or a custom field)
2. Date pattern in the filename (e.g., `2024-01-15 Daily Note.md`)
3. File system creation time (fallback)

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Follow Active Note Date | Update sidebar based on active note's date | On |
| Show Active Note | Include the current note in results (pinned to top) | On |
| Date Field Priority | Which frontmatter field to read first | `date` first |
| Display Properties | Frontmatter fields to show on cards | `title, tags` |
| Max Heading Level | Maximum heading level to display | H1–h3 |
| Heading Spacing | Vertical gap between heading items | 2px |
| Snippet Lines | Lines shown in snippet mode | 3 |
| Collapse Year Groups | Also collapse year groups when folding | Off |
| Show Time Span | Display "X years ago" next to year | On |
| Exclude Folders | Folders excluded from search | None |
| Card Hover Glow | Highlight card borders on hover | Off |
| Font Sizes | Adjustable offsets for all text elements | Follow theme |
| Colors | Customizable colors for titles, tags, headings | Follow theme |

## Development

```bash
# Install dependencies
npm i

# Development build with watch mode
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

## License

0-BSD

---

# Time Canvas（时间画卷）

一款 Obsidian 插件，在侧边栏以可折叠卡片的形式展示往年同日写下的笔记。

## 功能特性

- **同日回顾** — 自动查找历史上同月同日的所有笔记
- **当前笔记置顶** — 正在编辑的笔记始终排在年份组首位，同时充当快速大纲
- **双视图模式** — 在大纲视图（仅标题）和摘要视图（内容预览）之间切换
- **可折叠卡片** — 展开或折叠单条笔记及年份分组
- **日期来源优先级** — 可选 `created`、`date` 或自定义 frontmatter 字段，找不到则回退到文件创建时间
- **跟随活跃笔记** — 根据当前打开的笔记日期动态更新侧边栏
- **显示笔记属性** — 在卡片上展示 frontmatter 属性（title、tags、自定义字段）
- **排除文件夹** — 过滤不想纳入历史搜索的文件夹
- **外观自定义** — 字号、颜色、卡片背景、悬停特效均可调整
- **中英双语界面** — 完整的中文和英文支持

## 安装

### 从 Obsidian 社区插件安装（推荐）

1. 打开 设置 → 社区插件
2. 搜索 "Time Canvas"
3. 点击安装，然后启用

### 手动安装

1. 从 [最新发布](https://github.com/SETIX-A/time-canvas/releases) 下载 `main.js`、`styles.css` 和 `manifest.json`
2. 在仓库的 `.obsidian/plugins/` 目录下创建 `time-canvas` 文件夹
3. 将三个文件复制到该文件夹
4. 在 设置 → 社区插件 中启用插件

## 使用方法

### 打开侧边栏

- 点击左侧栏的 **日历时钟** 图标
- 或在命令面板中运行 **"Time canvas: Open sidebar"**

### 视图模式

- **大纲模式** — 显示每条笔记的标题链接
- **摘要模式** — 显示每条笔记的内容预览

点击侧边栏顶部的视图切换按钮即可切换。

### 日期识别

Time Canvas 按以下优先级识别笔记日期（可在设置中配置）：

1. Frontmatter 字段（如 `date`、`created` 或自定义字段）
2. 文件名中的日期模式（如 `2024-01-15 每日笔记.md`）
3. 文件系统创建时间（兜底）

## 设置

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 跟随活跃笔记日期 | 根据当前笔记日期更新侧边栏 | 开启 |
| 显示当前笔记 | 在结果中显示当前笔记（置顶） | 开启 |
| 日期字段优先级 | 优先读取哪个 frontmatter 字段 | 优先 `date` |
| 显示的笔记属性 | 在卡片上显示的 frontmatter 属性 | `title, tags` |
| 大纲最大层级 | 最多显示到几级标题 | H1–h3 |
| 大纲条目间距 | 标题条目之间的垂直间距 | 2px |
| 摘要行数 | 摘要模式显示的行数 | 3 |
| 折叠时同时折叠年份组 | 点击折叠按钮时同时折叠所有年份组 | 关闭 |
| 显示时间跨度 | 在年份旁显示"X年前" | 开启 |
| 排除文件夹 | 不纳入搜索的文件夹 | 无 |
| 卡片悬停发光特效 | 鼠标悬停时高亮卡片边框 | 关闭 |
| 字体大小 | 各文字元素的可调偏移量 | 跟随主题 |
| 颜色 | 标题、标签、大纲的可自定义颜色 | 跟随主题 |