# 太吾百晓册

《太吾绘卷》游戏百科导出项目,包含网页版百科及 Android 客户端 APK。

## 在线浏览

直接打开 [`index.html`](./index.html) 即可浏览本地百科页面。

## 下载 Android 客户端

Android 客户端 APK 提供两种下载方式:

### 方式一:GitHub Releases(推荐)

从 [Releases 页面](https://github.com/cyxil/taiwuEncyclopedia/releases/latest) 下载,文件位于 Assets 区域:

- **直接下载链接**:[太吾百晓册.apk](https://github.com/cyxil/taiwuEncyclopedia/releases/download/v1.0/taiwu.apk)(约 5.1 MB)

> 说明:由于 GitHub Releases 的 asset 文件名不支持非 ASCII 字符,APK 在 Release 中以 `taiwu.apk` 命名,下载后可自行重命名为 `太吾百晓册.apk`。文件内容与方式二完全一致(md5 校验相同)。

### 方式二:仓库源文件

APK 也直接存放在仓库根目录:

- **[太吾百晓册.apk](./太吾百晓册.apk)**(约 5.1 MB)

在 GitHub 仓库页面点击文件名,然后点击右上角 "Download" 按钮即可下载完整 APK 文件。

> 注:由于 GitHub 不允许在网页中直接渲染二进制 APK 文件,需通过 "Download" 按钮获取原始文件。

## 目录结构

```
.
├── index.html        # 百科首页
├── app.js            # 应用脚本
├── styles.css        # 样式
├── fonts.css         # 字体样式
├── data/             # 百科数据 (JS)
├── md/               # 百科 Markdown 源文件
└── 太吾百晓册.apk    # Android 客户端
```
