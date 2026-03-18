# 🕐 店铺计时系统 (Shop Timer)

跨平台扫码计时系统，客户通过扫描二维码即可记录到店时长。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（零构建步骤）
- **数据库**：Supabase (PostgreSQL) + 行级安全策略
- **托管**：Vercel 静态文件托管

## 文件结构

```
shop-timer/
├── index.html          # 主页面
├── style.css           # 暗色主题样式
├── app.js              # 应用逻辑
├── vercel.json         # Vercel 部署配置
├── supabase-init.sql   # 数据库初始化 SQL
└── README.md           # 本文件
```

## 部署步骤

### 1. 设置 Supabase

1. 注册 [Supabase](https://supabase.com) 并创建新项目
2. 进入 **SQL Editor**，粘贴并执行 `supabase-init.sql` 中的全部内容
3. 在 **Settings → API** 中获取：
   - **Project URL**（如 `https://xxxxx.supabase.co`）
   - **anon public Key**

### 2. 配置应用

编辑 `app.js` 文件顶部的配置常量：

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';     // 替换为你的 Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';  // 替换为你的 anon Key
```

### 3. 部署到 Vercel

1. 将此 `shop-timer` 目录作为独立 Git 仓库推送到 GitHub
   ```bash
   cd shop-timer
   git init
   git add .
   git commit -m "init: shop timer app"
   git remote add origin https://github.com/YOUR_USERNAME/shop-timer.git
   git push -u origin main
   ```
2. 登录 [Vercel](https://vercel.com)，导入该 GitHub 仓库
3. Vercel 会自动检测为静态站点并部署
4. 部署完成后获取访问地址（如 `https://shop-timer.vercel.app`）

### 4. 更新博客跳转地址（可选）

如果你的 Vercel 域名不是 `shop-timer.vercel.app`，请更新博客中的 `time.html` 文件，将跳转地址替换为实际的 Vercel 应用 URL。

### 5. 生成二维码

使用任意二维码生成工具（如 [草料二维码](https://cli.im)），将 Vercel 应用的 URL 生成二维码，打印后放置在店内。

## 使用方式

1. 客户用任意 App 扫描二维码
2. 点击「开始计时」按钮
3. 离店时点击「结束计时」
4. 页面显示本次到店总时长

## 注意事项

- 同一设备、同一 App 扫码会被识别为同一客户
- 不同 App 的内置浏览器有独立 localStorage，建议客户使用同一 App 扫码
- 计时中关闭页面不影响计时，重新扫码即可恢复
