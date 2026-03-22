# Recompile and Restart Reminder

## Rule

Whenever code changes require **recompilation** or **server restart** to take effect, you MUST explicitly remind the user to:

1. **Stop the current server** (Ctrl+C)
2. **Rebuild the project** if necessary:
   ```bash
   npm run build:dev  # or npm run build
   ```
3. **Restart the development server**:
   ```bash
   npm start
   ```

## When This Applies

### Requires Restart
- Changes to `server.js`
- Changes to `webpack.config.js`
- Changes to build scripts in `package.json`
- Adding new entry files to `src/`

### Requires Rebuild (`npm run build:dev`)
- Changes to `src/index.html` (SPA entry)
- Changes to `src/_redirects`
- Changes to `src/assets/js/spa-router.js`
- Changes to `src/pages/` HTML files (webpack copies them)
- Adding new files to `src/assets/` that need to be copied to `dist/`

### Hot Reload (No Restart Needed)
- Changes to CSS files (if using hot reload)
- Changes to client-side JS files (if using hot reload)

## Critical Files

Always remind when modifying these files:
- `server.js` - requires restart
- `webpack.config.js` - requires rebuild + restart
- `src/index.html` - requires rebuild only
- `src/_redirects` - requires rebuild only
- `src/assets/js/spa-router.js` - requires rebuild only
- `src/pages/**/*.html` - requires rebuild only (webpack copies them)

## Reminder Template

```
⚠️ 需要重新编译/重启才能生效

请执行以下步骤：

1. 停止当前服务器 (Ctrl+C)
2. 重新构建项目:
   npm run build:dev

3. 重启开发服务器:
   npm start

然后刷新浏览器测试。
```
