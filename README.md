# 🕐 店铺计时系统 (Shop Timer)

跨平台扫码计时系统，客户通过扫描二维码即可记录到店时长。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（零构建步骤）
- **数据库**：Supabase (PostgreSQL) + 行级安全策略
- **托管**：Cloudflare Pages 静态文件托管（国内可直达，无需梯子）

## 文件结构

```
shop-timer/
├── index.html          # 主页面
├── style.css           # 暗色主题样式
├── app.js              # 应用逻辑
├── _headers            # Cloudflare Pages 响应头配置
├── _redirects          # Cloudflare Pages 路由配置（SPA 回退）
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

### 3. 部署到 Cloudflare Pages

1. 将此 `shop-timer` 目录作为独立 Git 仓库推送到 GitHub
   ```bash
   cd shop-timer
   git init
   git add .
   git commit -m "init: shop timer app"
   git remote add origin https://github.com/YOUR_USERNAME/shop-timer.git
   git push -u origin main
   ```
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 **Workers 和 Pages** → 点击 **创建** → 选择 **Pages** → **连接 Git**
4. 选择 GitHub 仓库 `shop-timer`，配置如下：
   - **项目名称**：`shop-timer`
   - **构建命令**：留空（纯静态站点，无需构建）
   - **构建输出目录**：`/`（根目录）
5. 点击 **保存并部署**，等待部署完成

### 4. 绑定自定义域名

1. 在 Cloudflare Pages 项目设置中，进入 **自定义域** → 点击 **设置自定义域**
2. 输入 `timer.deviancer.top`
3. Cloudflare 会自动添加 DNS 记录（如果域名已在 Cloudflare 管理）
4. 等待 DNS 生效后，访问 `https://timer.deviancer.top` 即可

### 5. 更新博客跳转地址（可选）

如果你的域名不是 `timer.deviancer.top`，请更新博客中的 `time.html` 文件，将跳转地址替换为实际的域名。

### 6. 生成二维码

使用任意二维码生成工具（如 [草料二维码](https://cli.im)），将 `https://timer.deviancer.top` 生成二维码，打印后放置在店内。

## 使用方式

1. 客户用任意 App 扫描二维码
2. 点击「开始计时」按钮
3. 离店时点击「结束计时」
4. 页面显示本次到店总时长

## 注意事项

- 同一设备、同一 App 扫码会被识别为同一客户
- 不同 App 的内置浏览器有独立 localStorage，建议客户使用同一 App 扫码
- 计时中关闭页面不影响计时，重新扫码即可恢复
