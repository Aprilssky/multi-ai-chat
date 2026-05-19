# Multi AI Chat - 多AI群聊机器人

纯前端多 AI 群聊机器人。在浏览器中创建多个 AI 角色，让它们在群聊中自动轮流发言。

## 功能

- 🤖 **多角色管理**：自定义角色名称、头像、系统提示词
- 💬 **多群聊**：从已创建的角色中选择成员组成群聊
- 🔄 **自动轮流发言**：点击「开始」，AI 自动按顺序轮流回答
- ✍️ **用户可插入消息**：随时输入消息打断或引导对话
- 🎨 **Markdown 渲染**：AI 回复支持 Markdown 格式（代码高亮、列表等）
- 🔒 **API Key 加密存储**：使用 AES 加密，仅存在本地 localStorage
- 📦 **数据导入/导出**：一键备份和迁移所有配置

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产构建
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 使用流程

1. **设置 → 添加 API 配置**
   - 支持 OpenAI、DeepSeek、Gemini 等 OpenAI 兼容 API
   - 选择预设，填写 API Key
   - Key 使用 AES 加密存储在浏览器

2. **角色 → 创建角色**
   - 设定角色名称、头像 emoji
   - 编写系统提示词（决定角色的性格和风格）
   - 选择使用哪个 API 配置和模型

3. **群聊 → 创建群聊**
   - 输入群聊名称，从角色列表中勾选成员
   - 点击进入群聊

4. **开始对话**
   - 点击「开始」按钮，AI 角色轮流自动发言
   - 拖动滑块调节发言间隔
   - 随时输入消息插入话题
   - 点击「停止」结束自动对话

## 技术栈

- React 19 + TypeScript
- Vite 6
- Zustand (状态管理)
- crypto-js (AES 加密)
- react-markdown (Markdown 渲染)
- lucide-react (图标)
- Pure CSS (深色主题)

## 部署

### GitHub Pages

1. Fork/Clone 项目到本地
2. 修改 `vite.config.ts` 中的 `base` 为你的仓库名
3. 运行 `npm run build` 构建
4. 推送 `dist` 目录到 `gh-pages` 分支，或在 GitHub 仓库设置中配置 Pages

### 自动部署 (GitHub Actions)

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 隐私说明

- 🔒 所有 API Key 仅存储在浏览器 localStorage（AES 加密）
- 🌐 前端直接请求 AI API，不经过任何中间服务器
- 📁 数据可随时导出为 JSON 文件备份
- 🗑️ 清空浏览器数据即可擦除所有配置

## 许可证

MIT
