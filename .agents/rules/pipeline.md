# Vibe Coding Video — Production Pipeline SOP

> 唯一 SOP。所有 Agent 以本文件為準。progress.md 只記錄進度狀態，不包含 SOP。

---

## Phase 順序（嚴格執行，不可跳過、不可重排）

```
━━━ Phase 1 — 並行（互相獨立） ━━━
  Audio Agent        → 只剪開頭空白（`silenceremove=start_periods=1:start_threshold=-50dB`），不做任何其他處理
  Script Agent       → 讀 chapters/{N}/章節{N}_逐字講稿.txt
                        列出所有 **備注** 區塊（使用相關素材 + 呈現方式）

━━━ Phase 2 — Visual Concept Agent（MANDATORY，Phase 1 完成後才可開始） ━━━
  ⚠️ Director 不得跳過此 Phase。跳過是影片品質低落的根本原因。
  輸出：chapters/{N}/visual-spec-{N}.json
  職責（見下方 Visual Concept Agent 規格）

━━━ Phase 3 — VTT（per-segment VTT 已存在於 chapters/{N}/{N} 音檔/*.vtt） ━━━
  ⚠️ 不需要跑 Whisper — 個別 .vtt 已在音檔資料夾中
  對照逐字講稿校正每個 .vtt（繁簡字、的/得/地、專有名詞）

━━━ Phase 4 — Scene Dev（Phase 2 + Phase 3 完成後才可開始） ━━━
  Scene Dev Agent 讀 visual-spec.json + VTT + 講稿，實作 TSX
  所有幀號來自 VTT：global_frame = seconds × 30
  local_frame = global_frame - scene_start_frame

━━━ Phase 5 — Preview + QA（Scene Dev 完成後） ━━━
  Step 1: npm run dev → 開啟 http://localhost:3000
  Step 2: 告知 James 在瀏覽器預覽
  Step 3: 等待明確核准（「ok render」、「通過」、「go ahead」）— 未收到核准絕對不可 render
  Step 4: Director 收到核准後自動啟動 QA Agent
  QA 發 iMessage 報告 → 等待「通過」
  任何 ❌ → Fix Agent → 重做 QA

━━━ Phase 6 — Render + Post-render（QA 通過後） ━━━
  Step 1: Render
    npx remotion render FullVideo04 "out/CH{N}-{章節標題}/CH{N}-{章節標題}.mp4" --codec=h264

  Step 2: 合併 VTT（Render 完立即執行）
    讀取 chapters/{N}/{N} 音檔/*.vtt，加上 SEG_STARTS[i] / 30 的時間偏移
    ⚠️ 音檔資料夾有空格：「chapters/1-1/1-1 音檔/」
    輸出：out/CH{N}-{章節標題}/CH{N}-{章節標題}-subtitles.vtt

  Step 3: 生成 HTML 課程頁（Render 完立即執行）
    對照影片 slide 內容輸出靜態 HTML
    使用相同 design token（C.bg, C.primary, C.surface，字型）
    ⚠️ 無 logo bar、無頂部固定圖片
    輸出：out/CH{N}-{章節標題}/CH{N}-{章節標題}.html

  Step 4: 上傳 Google Drive（三個檔案都存在後）
    使用 rclone（已設定 gdrive: remote，不需另外 auth）
    目標 Folder ID：1jt_nkySWqs_iGBVUARVDW053DA6pOlJY
    ```bash
    cd /Users/jamesshih/Projects/vibe-coding-video/out
    rclone copy "CH{N}-{章節標題}" \
      "gdrive:CH{N}-{章節標題}" \
      --drive-root-folder-id "1jt_nkySWqs_iGBVUARVDW053DA6pOlJY" \
      --progress
    ```
    ✅ rclone 自動跳過已存在且相同的檔案（冪等，可重跑）

  ✅ 章節完成條件（四項都完成才算完成）：
    - CH{N}-{章節標題}.mp4
    - CH{N}-{章節標題}-subtitles.vtt
    - CH{N}-{章節標題}.html
    - Google Drive 已上傳（Drive folder ID 記錄在 progress.md）
```

---

## Visual Concept Agent 規格

### 職責
Phase 1 Script Agent 輸出後，Visual Concept Agent 讀：
1. `chapters/{N}/章節{N}_逐字講稿.txt` — 所有 `**備注**` 區塊
2. `chapters/{N}/{N} 音檔/*.vtt` — 各段落的 VTT 時間軸

為每個段落決定：
1. **Slide 動畫方式** — progressive_append / scroll / table_row / stagger 等
2. **補充視覺動畫** — 在教材旁新增，不遮擋主內容（SVG 線條、圖示、flow diagram）
3. **素材插入點** — 每個 `**備注**` 的 VTT 幀號 + 呈現方式（照講稿字面執行）

### 補充視覺動畫原則
- 觸發詞「舉例來說」「想像一下」「比較看看」「例如」→ 必須配對視覺動畫
- 風格：SVG 線條動畫或幾何圖示，黑底霓虹綠
- 動畫補充教材，不重複 slide 已有文字

### 輸出格式 `visual-spec-{N}.json`
```json
{
  "segments": [
    {
      "id": "3.2",
      "scene": "Scene32Example",
      "slide_animation": "progressive_append",
      "supplemental_animations": [
        {
          "trigger": "手動整理跨部門進度彙報",
          "vtt_sec": 5.12,
          "vtt_frame": 154,
          "type": "flow_diagram",
          "description": "四張部門圖片併排 → 箭頭 → 跨部門彙整（per 備注呈現方式）"
        }
      ],
      "assets": [
        {
          "file": "跨部門彙整.mov",
          "ascii_name": "kuabumen-demo.mp4",
          "trigger_text": "更有感覺",
          "vtt_sec": 41.38,
          "vtt_frame": 1241,
          "presentation": "影片置中 — AbsoluteFill zIndex:999，覆蓋全畫面"
        }
      ]
    }
  ]
}
```

---

## 音檔處理

**只做一件事：剪掉開頭的空白片段。不做任何其他調整。**

James 自行處理音質（音量、清晰度）後再提供檔案。不需要也不可以做 normalize、denoise、EQ、compression。

```bash
# 唯一允許的操作：trim 開頭靜音
ffmpeg -i input.wav \
  -af "silenceremove=start_periods=1:start_threshold=-50dB" \
  output-trimmed.wav -y
```

**音檔位置：** `chapters/{N}/{N} 音檔/`（注意空格與章節前綴）
```bash
# 正確路徑（一定要加引號處理空格）：
ffmpeg -i "chapters/1-1/1-1 音檔/1-1_1.1.wav" ...
# 錯誤：chapters/1-1/1-1音檔/  ← 缺空格
# 錯誤：chapters/1-1/音檔/      ← 缺章節前綴
```

---

## VTT 合併腳本

```python
# SEG_STARTS 與 FPS=30 來自 FullVideo0{X}.tsx
# offset_seconds = SEG_STARTS[i] / 30
# 每個 segment 的 .vtt 時間戳加上 offset
# 輸出到 out/CH{N}-{章節標題}/CH{N}-{章節標題}-subtitles.vtt
```

---

## 視覺品質標準（所有場景強制執行）

Scene Dev Agent 交付前，每個場景必須符合以下 7 項：

1. **SceneFade wrapper** — 每個場景內容包在 SceneFade（12f 淡入、12f 淡出），不可硬切
   ```tsx
   function SceneFade({ children, durationInFrames }) {
     const frame = useCurrentFrame();
     const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
     const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
     return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
   }
   ```

2. **WordReveal 用於關鍵引述** — 任何 quote block 或關鍵陳述用 WordReveal（每字 4f stagger），不用整塊淡入

3. **SectionHeader 動態底線** — 標題淡入後，綠色底線從 width:0 → 全寬，spring `{ damping: 200 }`

4. **Flow diagram staggered** — 多節點流程（A→B→C）分段出現：node1(+0f)→箭頭動畫(+12f)→node2(+24f)→...

5. **ProgressItem 子元素 stagger** — Icon 用 `useFadeUpElastic(start)`，文字用 `useFadeUpItem(start+4)`，不可整列一起動

6. **BgOrbs 脈動** — 背景光球用 `Math.sin(frame/90)` 緩慢呼吸，給慢速場景生命感

7. **Summary item 左邊框** — 條列摘要項目加 `borderLeft: 3px solid rgba(124,255,178,0.4)`，配合入場動畫

---

## Scene Dev 規則

### 幀號計算
```
global_frame = vtt_seconds × 30
local_frame  = global_frame - scene_start_frame（來自 CHAPTERS/SEG_STARTS 陣列）
```

### 字幕安全區
```ts
// 任何元素的底部 ≤ H - SUBTITLE_H = 2160 - 320 = 1840px
// 頂部不可高於 NAV_H = 144px
```

### Scroll 計算（MANDATORY — 每個場景都要算）

```ts
// Step 1: 計算實際內容高度（所有元素高度 + margin 加總）
// totalH = paddingTop(80px) + sum(element heights + margins)
// ⚠️ 圖片用 2×2 grid 後，FlowDiagram 高度 = 2×IMG_H + gap + labels ≈ 2×IMG_H + 70
//    IMG_H = 210*S=420px → FlowDiagram ≈ 910px；不可低估！

// Step 2: 容器可用高度 = H - NAV_H - SUBTITLE_H = 2160 - 144 - 320 = 1696px
// Step 3: maxScroll = max(0, totalH - 1696)

// Step 4: interpolate(frame, [triggerStart, triggerEnd], [0, maxScroll * 1.1], clamp)
// triggerStart = 最後出現的大型 asset 開始 stagger 時的幀號 - 60f（提前滾動，確保 target 進入視窗時已可見）
// triggerEnd = triggerStart + 150f

// ❌ 錯誤：trigger 在內容出現之後才開始滾動 → 觀看者先看到內容被截斷才慢慢出現
// ✅ 正確：trigger 在大型 asset 最後一個項目 stagger 開始時 → 滾動完成時下方內容已進入視野
```

**常見場景高度估算：**
| 元素 | 估算高度（px，S=2） |
|------|-------------------|
| SectionHeader + margin | 90 |
| Card (2行內文) + margin | 180 |
| 2×2 圖片 grid（IMG_H=420, gap=40）| 920 |
| CounterAnim block + margin | 160 |
| TipBox（3行）+ margin | 230 |
| RiskItem | 100 |
| ComparisonChart | 280 |

### 動畫規則
- 所有動畫用 `useCurrentFrame()` — 禁止 CSS `transition:` / `animation:` / Tailwind 動畫 class
- 時長寫成 `seconds * fps`（如 `0.5 * fps`，不寫 `15`）
- 標題用 `useFadeUpHeader`，列項用 `useFadeUpItem`，強調用 `useFadeUpElastic`
- Spring config 來自 timing.md，不猜

### 備注素材（MANDATORY）

Scene Dev 動工前必須讀 `chapters/{N}/章節{N}_逐字講稿.txt`（.txt 不是 .docx）。
找出所有 `**備注**` 區塊，每個都要實作：

規則：
- `使用相關素材` → 使用指定檔名，不換成其他素材
- `呈現方式` → 字面執行（「併排並拉箭頭」= 水平排列 + 箭頭，不是 2×2 grid）
- 素材出現時機 = 講者說完備注前一句話時的 VTT 幀號
- 「影片置中」= **AbsoluteFill zIndex:999，放在 Composition root，不放在 SceneWrap 內**
  - 講者聲音在該 Sequence 期間靜音（volume callback）
  - 用 `.mp4` 不用 `.mov`（browser codec 相容性）
  - 淡入 18f，淡出 18f
  - **Video 放在自己的 Sequence，確保 local frame 從 0 開始，startFrom={0} 才能正常播放**
  - **檔名必須 ASCII**（中文字造成 URL encoding 失敗）
  - **預載 video**：在 Composition root 用 useEffect 建立隱藏 `<video>` 預載
  - **跨段落 Video Overlay 音訊延遲**（CRITICAL）：
    若影片疊加跨越兩個 audio segment（結束時已進入下一個 segment）：
    1. 前一 segment 音訊：`volume={(f) => f >= overlapStart ? 0 : 1}`（靜音到結束）
    2. 後一 segment 音訊：**用 inner Sequence 延遲**，讓音訊從影片結束後才開始播放：
       ```tsx
       <Sequence from={SEG_STARTS[i]} durationInFrames={seg.frames + delayF}>
         <Sequence from={delayF}>
           <Audio src={...} volume={1.0} />
         </Sequence>
       </Sequence>
       ```
    3. 後一 segment 的 Sequence 時長 = 原時長 + delayF（確保音訊不被截斷）
    4. SEG_STARTS[i+1..] 全部 +delayF（連鎖更新）
    5. 後一 scene 所有 animation startFrame 也 +delayF（`const DELAY = delayF;`）
    6. ⚠️ **禁止用 volume mute 替代 delay**：mute 讓音訊在背景靜默播放，unmute 後音訊已前進 N 秒，導致旁白開頭被跳過

### Motion Graphics 時間軸（MANDATORY）

每一個 `startFrame`、callout `from/to`、scroll trigger 必須來自實際 `.vtt` 檔。
絕對不猜、不估算。

```
流程：
1. 開啟該段落的 .vtt
2. 找到講者介紹該視覺概念的確切 cue
3. startFrame = cue_start_seconds × 30
4. callout duration 最短 90f
5. callout from ≥ VTT cue 開始幀（不可早於講者說到該內容）
```

範例：
```
VTT: "00:21.620 --> 00:24.100 但如果你能夠把這件事情自動化"
→ startFrame = Math.round(21.62 * 30) = 649
→ callout: { from: 649, to: 739 }（最短 90f）
```

### 素材尺寸（MANDATORY）

- 圖片最小寬度：**`400 * S`（800px）**，建議 `420–520 * S`
- 4 張以上圖片同時出現 → **2×2 grid**，不用水平並排或垂直堆疊
- 影片嵌入：`width: "100%"` 或至少 `600 * S`

### 字體大小（MANDATORY）

字體大小必須在 4K 畫面（3840×2160）清晰可讀。**所有 `fontSize` 必須帶 `* S` 倍率（S=2）。**

| 用途 | 最小值 | 建議值 |
|------|--------|--------|
| Hero 大標題 | `48 * S` | `60–80 * S` |
| Hero 關鍵詞強調（HighlightPulse standalone） | `48 * S` | `52 * S` |
| Section 標題 | `36 * S` | `44 * S` |
| 內文 / 卡片正文 | `24 * S` | `26–28 * S` |
| 說明 / desc / 副文字 | `22 * S` | `26 * S` |
| 標籤 / 圖片說明 / 小註 | `18 * S` | `20 * S` |
| 絕對底線 | `16 * S` | — 不可再小 |

⚠️ **HighlightPulse 繼承 fontSize**：`HighlightPulse` 本身不設字體大小，完全繼承父容器。
若獨立使用（非在段落文字中 inline），**父容器必須明確設定 `fontSize`**：
```tsx
// ❌ 錯誤：沒有 fontSize → 繼承瀏覽器預設 16px，4K 畫面看不到
<div style={{ display: "flex" }}>
  <HighlightPulse text="投入時間" ... />
</div>

// ✅ 正確：明確設定
<div style={{ display: "flex", fontSize: 52 * S }}>
  <HighlightPulse text="投入時間" ... />
</div>
```

### 字卡（Callout）規則
- **最短顯示時長：90 frames（3秒）**
- 字卡文字不重複 slide 上已有的文字（補充視角、類比、提醒）
- 字卡出現時機 ≥ VTT 中該內容開始的幀號（不可早於講者說到）
- 字卡內容對照逐字講稿確認用詞（勿用「章節」代替「單元」等）

### Progressive Animation（MANDATORY）
- 同一場景有多個項目（列點、卡片、表格列）→ 依旁白順序逐一出現
- 絕對不可一次全部顯示
- 每個項目的 `startFrame` 對應 VTT 中該內容被提到的幀號

### 禁止清單
- 禁止 CSS `transition:`、`animation:`、Tailwind 動畫 class
- 禁止 px 值不乘 `* S`
- 禁止在 QA 通過前 render
- 禁止 scrollY > 0 但內容實際上放得下
- 禁止猜 startFrame — 一律讀 .vtt
- 禁止 callout 早於講者說到該內容（from < VTT cue start）
- 禁止把素材放在不屬於它的場景（依照講稿段落編號）
- 禁止影片用中文/CJK 檔名（URL encoding 失敗）
- 禁止「影片置中」素材放在 SceneWrap 內（用 AbsoluteFill root level）
- **禁止 CalloutCard / CalloutLayer 放在 SceneWrap 內** — SceneWrap 有 `overflow:hidden` + `translateY(scroll)` 導致 callout 被截斷且位置錯誤。必須用 `<CalloutLayer callouts={callouts} />` 放在 SceneWrap **外面**（SceneFade 內的 AbsoluteFill）
- **禁止 HighlightPulse 在獨立容器中不設 fontSize（繼承預設 16px 在 4K 看不見）**
- **禁止圖片 ≤ 300*S（600px）— 4K 畫面無法閱讀內容**
- **禁止 4 張以上圖片水平並排（超出容器寬度）— 必須用 2×2 grid**
- **禁止 scroll trigger 晚於要顯示的內容 startFrame（內容出現時已被截斷）**
- **禁止用 volume mute 替代 audio delay（旁白開頭被靜默跳過）**

---

## QA Checklist（QA Agent 完整清單）

### 檔案
- [ ] 音檔存在且有聲音（ffprobe duration > 0）
- [ ] VTT 字幕存在且非空
- [ ] TSX 元件存在且編譯無錯誤
- [ ] 備注指定的素材檔案存在（`**備注**` → 對應 MP4/PNG 存在）

### 版面（Remotion screenshot 抽查 5 幀）
- [ ] 任何元素底部 ≤ 1840px（H - SUBTITLE_H）
- [ ] 任何元素頂部 ≥ 144px（NAV_H）
- [ ] 字幕保留區下方無重要內容
- [ ] 圖片 / 影片寬度 ≥ 320*S（最小可讀尺寸）
- [ ] 4+ 圖片同時出現 → 確認用 2×2 grid 而非水平並排
- [ ] scroll trigger 幀號 < 最後一張圖開始出現的幀號（scroll 先到位）
- [ ] 每個 HighlightPulse 獨立容器有明確 `fontSize`
- [ ] fontSize 無低於 18*S 的值（grep `fontSize: [0-9]* \* S` 確認）

### 備注實作
- [ ] 逐字講稿 .txt 已讀，每個 `**備注**` 都有對應實作
- [ ] 呈現方式照字面執行（不是「差不多」）
- [ ] 「影片置中」= AbsoluteFill root level，非 SceneWrap 內
- [ ] 備注素材放在對應段落場景（不移到其他場景）

### Motion Graphics 時間軸
- [ ] 所有 startFrame 可追溯至 .vtt cue（不是估算）
- [ ] 所有 callout `from` ≥ VTT cue start（不早於講者說到）
- [ ] 最短 callout 時長 90f

### 動畫品質（視覺品質標準 7 項）
- [ ] 全部場景有 SceneFade wrapper
- [ ] 關鍵引述使用 WordReveal（非整塊淡入）
- [ ] SectionHeader 底線動畫
- [ ] 多項目場景：逐一出現（非同時）
- [ ] ProgressItem / RiskItem：icon 與文字分開 stagger
- [ ] BgOrbs 在 SceneWrap 中
- [ ] Summary item 左邊框

### 音視同步
- [ ] 抽查 3 個場景：視覺元素出現與 VTT 時間點偏差 ≤ 1 秒
- [ ] 無明顯早於或晚於旁白

---

## 影片品質規格卡（所有章節統一規格）

> 這是最終品質標準。每次 Scene Dev 前對照確認，不依賴記憶。

### 技術規格
| 項目 | 規格 |
|------|------|
| 解析度 | 3840 × 2160（4K） |
| FPS | 30 |
| Scale factor | S = 2（所有 px 值乘 S） |
| 輸出格式 | H.264 MP4 |
| 輸出檔名 | **資料夾名稱即檔名**，三個檔案共用同一 base name：<br>`{資料夾名稱}.mp4`<br>`{資料夾名稱}-subtitles.vtt`<br>`{資料夾名稱}.html`<br>例：`CH1-1-價值與風險：問題值得解決嗎？有無資安風險？.mp4` |
| ⚠️ 禁止 | 不加日期後綴、不加 `-complete`、不用短標題 |

### 版面規格
| 項目 | 值 |
|------|-----|
| 容器寬 | `CONTAINER_W = 1500 * S = 3000px`，水平置中 |
| 頂部安全區 | `NAV_H = 72 * S = 144px` |
| 底部安全區 | `SUBTITLE_H = 160 * S = 320px` |
| 可用內容高 | `2160 - 144 - 320 = 1696px` |
| 內容 paddingTop | `40 * S = 80px` |

### 字體規格
| 用途 | 最小值 |
|------|--------|
| Hero 大標題 | `60 * S` |
| Hero 關鍵詞（HighlightPulse standalone） | `48 * S`（父容器必須設） |
| SectionHeader | `36 * S` |
| 內文 / 卡片正文 | `26 * S` |
| 副文字 / desc | `24 * S` |
| 標籤 / 圖片說明 | `20 * S` |
| 絕對底線 | `18 * S` |

### 素材規格
| 項目 | 規格 |
|------|------|
| 圖片最小尺寸 | `320 * S × 210 * S` |
| 4+ 圖片 | 2×2 grid，不水平並排 |
| 影片嵌入 | `width: "100%"` |
| 「影片置中」素材 | AbsoluteFill root，zIndex:999，淡入 18f / 淡出 18f |
| 影片檔名 | ASCII only（中文造成 URL encoding 失敗） |

### Callout 規格
| 項目 | 規格 |
|------|------|
| 位置 | `<CalloutLayer>` 在 SceneWrap 外，AbsoluteFill 層 |
| 錨點 | `top: NAV_H + 12*S`，`right: 20*S` |
| 寬度 | `420 * S` |
| 最短時長 | 90 frames（3 秒） |
| 文字打字效果 | 14f delay 後開始，0.85 char/f |
| 疊加時 | 上方卡片向上推 `NOTIF_SLOT = 200*S` |

### 動畫規格
| 項目 | 規格 |
|------|------|
| 場景進出 | `SceneFade` 12f 淡入 / 12f 淡出（每個場景必須） |
| 動畫引擎 | `useCurrentFrame()` + `spring/interpolate` only |
| 標題入場 | `useFadeUpHeader` |
| 列項入場 | `useFadeUpItem`，icon 用 `useFadeUpElastic` |
| 關鍵詞 | `WordReveal`（每字 4f stagger） |
| 數字動畫 | `CounterAnim`（1.5s counting） |
| 脈動強調 | `HighlightPulse`（需明確 fontSize 在父容器） |
| 進度條圖 | `TimelineBar`（label `20*S`） |

### 音訊規格
| 項目 | 規格 |
|------|------|
| 處理 | 只剪開頭靜音（`silenceremove=start_periods=1:start_threshold=-50dB`） |
| 其他調整 | 完全不做（James 自行處理） |
| 背景音樂 | `course_background_music.wav` volume=0.10，loop |
| 影片素材疊加 | 前 segment 靜音，後 segment 用 inner Sequence delay，**不用 volume mute** |

---

## Chapter Progress Tracking

每個 Phase 完成後更新 `progress.md`：
- 標記 ✅ 或 ⏳
- 記錄任何阻礙
- 記錄任何偏離計劃的地方

Director 開始時讀 `progress.md` — 不從記憶推測狀態。
