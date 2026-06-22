# Eason & Eddie ICRT News for Kids

給 Eason 和 Eddie 練習英文聽讀的 ICRT News for Kids（國小）網站。

## 網站內容

- 最近一年 ICRT News for Kids（國小）
- 可直接播放音檔
- 故事、單字、測驗、答案分段閱讀
- 手機友善、大字模式、月份篩選、關鍵字搜尋

## 本機預覽

```bash
npm run serve
```

打開：

```text
http://localhost:4173
```

## 手動更新資料

```bash
npm run update
```

更新後會改寫：

```text
data/episodes.json
```

## 部署到 GitHub Pages

1. 到 GitHub 建立一個新的 repository。
2. 把這個資料夾推上去，分支名稱使用 `main`。
3. 進到 repository 的 `Settings`。
4. 左側選 `Pages`。
5. `Build and deployment` 的 `Source` 選 `GitHub Actions`。
6. 到 `Actions` 頁籤，執行 `Update and deploy ICRT site`。

之後 GitHub Actions 會每天台灣時間早上 6:30 自動更新並重新部署網站。
