# Vibe Coding Video — Progress Log

> 本文件只記錄進度。規則、SOP、品質標準一律在 `.agents/rules/pipeline.md`。
> Director 在新 session 開始時讀本文件，確認從哪裡繼續。

---

## 章節狀態總覽

| 章節 | 狀態 | TSX | Drive |
|------|------|-----|-------|
| CH 0-1 | ✅ 完成 | FullVideo.tsx | ✅ 已上傳 |
| CH 0-2 | ✅ 完成 | FullVideo02.tsx | ✅ 已上傳 |
| CH 0-3 | ✅ 完成 | FullVideo03.tsx | ✅ 已上傳 |
| CH 1-1 | ✅ 完成 | FullVideo04.tsx | ✅ 已上傳 |
| CH 1-2 | ✅ 完成 | FullVideo05.tsx | ✅ 已上傳 |
| CH 1-3 | ✅ 完成 | FullVideo06.tsx | ✅ 已上傳 |
| CH 1-4 | ✅ 完成 | FullVideo07.tsx | ✅ 已上傳 |
| CH 2-1 | ✅ 完成 | FullVideo08.tsx | ✅ 已上傳 + 已上線 |

---

## CH 2-1 — ✅ 完成（先別寫程式：思考不同解法，選一條最可行的路）

**TSX：** `src/FullVideo08.tsx`（6 場景，SEG_STARTS_08，TOTAL_FRAMES_08=18774）
**Render：** `out/CH2-1-…/CH2-1-….mp4`（4K 3840×2160 / 30fps / 10:25 / 60.3 MB）2026-05-20
**線上：** https://n8ncourse.zeabur.app/vibecoding/lecture8/

### 已完成
- [x] Phase 1 音檔正規化（6 段：0.1/1.1/2.1/3.1/4.1/5.1）
- [x] Phase 2 VTT + 繁中校正（6 個 .vtt）
- [x] Phase 3 `visual-spec-2-1.json`
- [x] Phase 4 FullVideo08.tsx + Root.tsx 註冊 + 音檔複製 public/audio/2-1/
- [x] **重疊修正**：Scene01Open（badge/title/desc 加 headerFade 淡出）+ Scene11Concept（header/card/pin 套 transportFade 淡出）—— absolute overlay 不再壓在未淡出的 in-flow 內容上
- [x] **iMessage 字卡移除 sender 列**（含資料層 scrub，不再出現 "James"）
- [x] **Premortem QA**：17 幀 settled 取樣全 6 場景目視通過（無重疊 / 安全區內 / 字卡無姓名）
- [x] James 預覽核准 → Render
- [x] VTT 合併（260 cues）+ HTML 課程頁
- [x] Drive 上傳（`1jt...`/CH2-1-…，folder ID `1pbdKR5xOXimJJT5evq7hvF1SRGf-X_bH`）
- [x] n8ncourse 上線（lecture8，courses.json + lecture8/ 都 200 確認）

### n8ncourse 上架方式：手動（不靠自動 sync）
James 2026-05-20 決定：不需要自動 sync，每支新章節用 `n8ncourse/.github/scripts/build_lecture_local.py`
手動產 lecture 頁 + push main（CH2-1 = lecture8 已照此上線）。流程見 pipeline.md Step 7。

### ⚠️ 待 James 決定（非急）
- **CH 1-3 / CH 1-4 已上架影片仍含 "James" 字卡**：FullVideo06 / FullVideo07 的 callout 還是 `sender:"James"`。是否補修重出。

---

## CH 1-1 — 目前狀態

**TSX：** `src/FullVideo04.tsx`
**最新 render：** `out/CH1-1-價值與風險：問題值得解決嗎？有無資安風險？/` (2026-04-07)

### 已完成
- [x] 音檔正規化（11 段）
- [x] VTT 存在（11 個 .vtt 檔）
- [x] 11 個場景基本實作
- [x] 備注素材：kuabumen-demo.mp4（AbsoluteFill root level，global frame 6635，Sequence 獨立）
- [x] 音訊靜音：segment 3.3 (i===4) local frame 0–208 靜音
- [x] Callout 時間軸：全部依 VTT 重新校正（11 個 callout 修正）
- [x] render v1 完成（117 MB, 13m 44.8s）

### v2 修正清單（本次 render）
- [x] Visual Concept Agent 已執行，`visual-spec-1-1.json` 已輸出
- [x] 新增動畫：CounterAnim、HighlightPulse、ComparisonChart、TimelineBar
- [x] BGM 已加入（`course_background_music.wav` vol=0.10）
- [x] kuabumen-demo.mp4：移至 root Sequence，local frame 從 0 開始
- [x] Seg 3.3 音訊 delay 208f（mov 播完才接著旁白）
- [x] Callout 全數移至 CalloutLayer（AbsoluteFill，top-right 正確位置）
- [x] 所有圖片改為 2×2 grid（320*S × 210*S）
- [x] HeroPillarsHighlight：fontSize 52*S
- [x] 所有小字修正（`12*S→18*S`, `16*S→20*S`, `22*S→26*S`）
- [x] Scroll trigger 提前至 440f（在 result card 出現前完成滾動）
- [x] SEG_STARTS + TOTAL_FRAMES 更新（+208f）

### 待完成
- [ ] Render 完成（進行中）
- [ ] VTT 合併
- [ ] HTML 課程頁生成
- [ ] James 驗收

### SEG_STARTS（幀偏移）
```ts
export const SEG_STARTS = [0, 1783, 3745, 5394, 6687, 8411, 9169, 12869, 16703, 20269, 22052];
export const TOTAL_FRAMES_04 = 24950;
```
注意：3.3 Sequence 延長 208f（kuabumen mov 結束後才開始播音檔）

### 音檔段落
| Seg | 檔案 | Frames | Scene |
|-----|------|--------|-------|
| 1.1 | 1-1_1.1-normalized.wav | 1783 | Scene11Hero |
| 2.1 | 1-1_2.1-normalized.wav | 1962 | Scene21Timebox |
| 3.1 | 1-1_3.1-normalized.wav | 1649 | Scene31Value |
| 3.2 | 1-1_3.2-normalized.wav | 1293 | Scene32Example |
| 3.3 | 1-1_3.3-normalized.wav | 1724 | Scene33Search（含 208f delay）|
| 4.0 | 1-1_4.0-normalized.wav |  758 | Scene40Risk |
| 4.1 | 1-1_4.1-normalized.wav | 3700 | Scene41Bill |
| 4.2 | 1-1_4.2-normalized.wav | 3834 | Scene42Privacy |
| 4.3 | 1-1_4.3-normalized.wav | 3566 | Scene43Ops |
| 5.1 | 1-1_5.1-normalized.wav | 1783 | Scene51Summary |
| 6.1 | 1-1_6.1-normalized.wav | 2898 | Scene61Takeaway |

---

## Google Drive
**目標資料夾：** `1jt_nkySWqs_iGBVUARVDW053DA6pOlJY`
**Auth token：** `~/.claude/gdrive_token.json`（需先跑 `python3 ~/.claude/scripts/gdrive_auth.py`）

| 章節 | Drive 上傳狀態 |
|------|--------------|
| CH 0-1 | ✅ 已上傳（已存在） |
| CH 0-2 | ✅ 已上傳 2026-04-07 |
| CH 0-3 | ✅ 已上傳 2026-04-07 |
| CH 1-1 | ✅ 已上傳 2026-04-07（6 files, 223 MB） |

---

## CH 0-1 — 已完成

**最新 render：** `out/CH01-1/CH0-1-complete.mp4` — 60 MB, 14m 27s (2026-03-27)
**字幕：** `out/CH01-1/CH0-1-subtitles.vtt` — 22 KB, 14 段合併
**HTML：** 未確認

---

## CH 0-2 — 已完成

**最新 render：** `out/CH02-2/CH0-2-complete.mp4` — 43.9 MB, 9m 28s (2026-03-27)
**字幕：** `out/CH02-2/CH0-2-subtitles.vtt` — 15 KB, 11 段合併
**HTML：** 未確認
