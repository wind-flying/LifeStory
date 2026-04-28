# LifeStory

本地浏览器版的人生小说生成器原型。当前 UI 只开放现代都市题材，但代码结构已经预留多世界配置接口。玩家主要通过选项推进人生，系统在后台维护结构化状态，用来减少长文本生成时的前后冲突。

## 当前能力

- 在浏览器里填写 OpenAI 兼容接口的 `Base URL`、`模型名`、`API Key`
- 开启一局现代都市人生
- 每回合生成：
  - 局势摘要
  - 长段正文
  - 4 个选项
- 后台保存结构化故事状态
- 本地缓存当前故事
- 导出全文 `.txt`
- 支持少量、动态获得的主动干预机会
- 世界规则从配置层注入，便于后续扩展其他题材

## 运行方式

由于页面使用了 ES Modules，建议通过本地静态服务运行，而不是直接双击 `index.html`。

```bash
python3 -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

## GitHub Pages

这个项目是纯静态页面，没有后端依赖，可以直接发布到 GitHub Pages。

- 把仓库推到 GitHub
- 在仓库的 `Settings > Pages` 中开启 Pages
- 部署分支选 `main`，目录选仓库根目录
- 发布后即可在手机浏览器访问

注意：

- API Key 仍然保存在用户自己的浏览器本地存储中
- 如果直接在 GitHub Pages 上从前端请求第三方模型接口，需要目标接口允许浏览器跨域访问

## 目录

- `index.html`：页面骨架
- `styles.css`：界面样式
- `src/app.js`：页面交互和存档
- `src/engine.js`：故事生成流程
- `src/llm.js`：OpenAI 兼容接口调用
- `src/prompts.js`：提示词职责拆分
- `src/state.js`：结构化状态与导出
- `src/worlds.js`：世界配置注册表

## 说明

- 当前版本要求模型支持 OpenAI 风格的 `/chat/completions` 接口。
- 当前版本使用 `response_format: { type: "json_object" }` 来约束返回 JSON。
- API Key 直接保存在浏览器本地存储中，仅适合本地测试。
