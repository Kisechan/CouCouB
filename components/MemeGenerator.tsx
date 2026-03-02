"use client";

import { useRef, useEffect, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Style = 2 | 3 | 4 | "环形多头";

interface Imgs {
  left: HTMLImageElement;
  right: HTMLImageElement;
  middle: HTMLImageElement;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif';
const PAD = 14;

const CANVAS_SIZE: Record<Style, [number, number]> = {
  2: [900, 400],
  3: [1080, 700],
  4: [1200, 640],
  "环形多头": [900, 1000],
};

const DEFAULT_TEXTS: Record<Style, string[]> = {
  2: ["原神牛逼", "鸣潮牛逼", "！？逼逼？！"],
  3: ["Gemini 牛逼", "Kimi 牛逼", "Deepseek 牛逼", "！？NKD？！"],
  4: ["Blender 牛逼", "Unity3D 牛逼", "Python 牛逼", "TypeScript 牛逼", "！？BUPT？！"],
  "环形多头": [],
};

const INPUT_LABELS: Record<Style, string[]> = {
  2: ["文案 1", "文案 2", "！？？！"],
  3: ["文案 1", "文案 2", "文案 3", "！？？！"],
  4: ["文案 1", "文案 2", "文案 3", "文案 4", "！？？！"],
  "环形多头": [],
};
 
// 生成环形模式的输入标签
function getRingLabels(count: number): string[] {
  const labels = [];
  for (let i = 0; i < count; i++) {
    labels.push(`文案 ${i + 1}`);
  }
  labels.push("！？？！");
  return labels;
}

// ─── Canvas Helpers ──────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxW: number,
  initialSize: number
): number {
  if (!text.trim()) return 0;

  // Auto-shrink logic: reduce font size until text fits or hits minimum size
  let size = initialSize;
  const minSize = 12; // Don't go smaller than this
  
  ctx.font = `bold ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxW && size > minSize) {
    size -= 1;
    ctx.font = `bold ${size}px ${FONT}`;
  }

  // Common settings
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Even after shrinking, if it's still too wide (at minSize), we wrap it.
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lh = size * 1.45;
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
  return lines.length * lh;
}

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, y: number, len = 30): void {
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + len - 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 7, y + len - 9);
  ctx.lineTo(cx + 7, y + len - 9);
  ctx.lineTo(cx, y + len);
  ctx.closePath();
  ctx.fill();
}

function drawImg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  alignBottom: boolean = false
): void {
  if (!img.complete || img.naturalWidth === 0) return;
  const r = img.naturalWidth / img.naturalHeight;
  const br = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (r > br) {
    dw = w; dh = w / r; dx = x; dy = y + (h - dh) / 2;
  } else {
    dh = h; dw = h * r; dx = x + (w - dw) / 2; dy = y;
  }
  
  if (alignBottom) {
    dy = y + h - dh;
  }
  
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ─── Style Drawing Functions ─────────────────────────────────────────────────

/**
 * Style 2: [Right | Left | Middle]
 * Classic "yelling woman" style but with 3 horizontal panels.
 */
function drawStyle2(ctx: CanvasRenderingContext2D, w: number, h: number, imgs: Imgs, texts: string[]) {
  const colW = w / 3;
  const textH = 60;
  const arrowH = 26;
  const imgY = textH + arrowH;
  const imgH = h - imgY - 6;

  ([imgs.right, imgs.left, imgs.middle] as HTMLImageElement[]).forEach((img, i) => {
    const cx = colW * i + colW / 2;
    const txt = texts[i] || DEFAULT_TEXTS[2][i];
    wrapText(ctx, txt, cx, 12, colW - PAD * 2, 30);
    drawArrow(ctx, cx, textH + 2, 20);
    drawImg(ctx, img, colW * i + PAD, imgY + 4, colW - PAD * 2, imgH, true);
  });
}

/**
 * Style 3: [Left (30%) | Mid (30%) | Right (40%)]
 * Left: Two stacked "Right" profiles
 * Mid: One centered "Left" profile
 * Right: One punchline "Middle" face
 */
function drawStyle3(ctx: CanvasRenderingContext2D, w: number, h: number, imgs: Imgs, texts: string[]) {
  const lW = w * 0.36;
  const mW = w * 0.24;
  const rW = w * 0.4;

  const cellH = h / 2;
  const sTxt = 40, sArrow = 20;
  const sImgH = cellH - sTxt - sArrow + 10;

  // Left column: 2 stacked cells
  for (let i = 0; i < 2; i++) {
    const y0 = i * cellH;
    const cx = lW / 2;
    const txt = texts[i] || DEFAULT_TEXTS[3][i];
    wrapText(ctx, txt, cx, y0 + 15, lW - PAD * 2, 30);
    drawArrow(ctx, cx, y0 + sTxt + 10, 20);
    drawImg(ctx, imgs.right, PAD, y0 + sTxt + sArrow + 10, lW - PAD * 2, sImgH - 50, true);
  }

  // Mid column: Centered "Left"
  const mTxt = 40, mArrow = 20, mX = lW;
  const mCx = mX + mW / 2;
  const mImgH = sImgH;
  const mImgY = (h - mImgH) / 2;

  const mText = texts[2] || DEFAULT_TEXTS[3][2];
  wrapText(ctx, mText, mCx, mImgY - mArrow - mTxt, mW - PAD * 2, 40);
  drawArrow(ctx, mCx, mImgY - mArrow, 20);
  drawImg(ctx, imgs.left, mX + PAD, mImgY, mW - PAD * 2, mImgH - 30, true);

  // Right column: Punchline
  const rX = lW + mW, rCx = rX + rW / 2;
  const rTxt = 120, rArrow = 36;
  const rImgH = Math.min(h - rTxt - rArrow - 6, 280);

  const rText = texts[3] || DEFAULT_TEXTS[3][3];
  wrapText(ctx, rText, rCx, 150, rW - PAD * 2, 40);
  drawArrow(ctx, rCx, rTxt + 80, 30);
  const rImgY = rTxt + rArrow + (h - rTxt - rArrow - rImgH) / 2 - 20;
  drawImg(ctx, imgs.middle, rX + PAD, rImgY - 30, rW - PAD * 2, rImgH - 20, false);
}

/**
 * Style 4:
 * Top: 4 equal columns [Left x 4]
 * Bottom: 1 wide punchline [Middle]
 */
function drawStyle4(ctx: CanvasRenderingContext2D, w: number, h: number, imgs: Imgs, texts: string[]) {
  const topH = Math.round(h * 0.53);
  const colW = w / 4;
  const tTxt = 58; 
  const tArrow = 24;
  const tImgH = topH - tTxt - tArrow - 4;

  const headImgs = [imgs.right, imgs.left, imgs.right, imgs.left];
  for (let i = 0; i < 4; i++) {
    const cx = colW * i + colW / 2;
    const txt = texts[i] || DEFAULT_TEXTS[4][i];
    wrapText(ctx, txt, cx, 10, colW - PAD, 30);
    drawArrow(ctx, cx, tTxt + 2, 20);
    drawImg(ctx, headImgs[i], colW * i + PAD, tTxt + tArrow + 4, colW - PAD * 2, tImgH, true);
  }

  // Punchline
  const pW = 380, pX = (w - pW) / 2, pCx = w / 2;
  const pY = topH;
  const pTxt = 68;
  const pArrow = 24;
  const pImgH = h - pY - pTxt - pArrow - 6;
  
  const pText = texts[4] || DEFAULT_TEXTS[4][4];
  wrapText(ctx, pText, pCx, pY + 20, pW - PAD, 40);
  drawArrow(ctx, pCx, pY + pTxt + 2, 20);
  drawImg(ctx, imgs.middle, pX, pY + pTxt + pArrow + 4, pW, pImgH, true);
}

/**
 * 环形多头模式:
 * 外圈: left 和 right 图片交替排列，带旋转
 * 中心: middle 图片 + 最后一个文本
 */
function drawStyleRing(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  imgs: Imgs,
  texts: string[],
  headCount: number
) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.33; // 外圈半径
  const imgSize = Math.min(200, radius * 0.6); // 每个头像的大小
  const textOffset = imgSize * 0.7 + 10; // 文字到图像中心的距离

  // 绘制外圈的头像和文字
  for (let i = 0; i < headCount; i++) {
    const angle = (i / headCount) * Math.PI * 2 - Math.PI / 2; // 从顶部开始
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    // 选择图片：交替使用 left 和 right
    const img = i % 2 === 0 ? imgs.right : imgs.left;

    // 保存上下文状态
    ctx.save();
    ctx.translate(x, y);
    
    // 计算旋转角度：让头像朝向中心
    const rotationAngle = angle + Math.PI / 2;
    ctx.rotate(rotationAngle);

    // 绘制图像（以当前点为中心）
    drawImg(ctx, img, -imgSize / 2, -imgSize / 2, imgSize, imgSize, false);

    ctx.restore();

    // 绘制文字（在图像外侧）
    const textRadius = radius + textOffset;
    const textX = cx + Math.cos(angle) * textRadius;
    const textY = cy + Math.sin(angle) * textRadius;

    ctx.save();
    ctx.translate(textX, textY);
    
    // 文字旋转，使其可读（底部的文字需要翻转）
    let textRotation = angle + Math.PI / 2;
    if (angle > 0 && angle < Math.PI) {
      textRotation += Math.PI;
    }
    ctx.rotate(textRotation);

    // 绘制文字
    const txt = texts[i] || "";
    
    // 使用 wrapText 自动处理字号缩小和换行
    // 预估高度约为 40px，所以在 -20px 处开始绘制以大致垂直居中
    const maxWidth = imgSize * 1.5;
    wrapText(ctx, txt, 0, -20, maxWidth, 24);

    ctx.restore();

    // 绘制箭头（从文字指向图像）
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + Math.PI / 2);

    const arrowDistStart = radius + textOffset - 20;
    const arrowDistEnd = radius + imgSize / 2 + 10;
    const arrowLen = Math.max(20, arrowDistStart - arrowDistEnd);

    drawArrow(ctx, 0, -arrowDistStart, arrowLen);

    ctx.restore();
  }

  // 绘制中心的 middle 图片
  const centerImgSize = imgSize * 1.45;
  drawImg(ctx, imgs.middle, cx - centerImgSize / 2, cy - centerImgSize / 2, centerImgSize, centerImgSize, false);

  // 绘制中心文字（最后一个文本，在 middle 图片上方）
  const centerText = texts[headCount] || "";
  if (centerText) {
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    wrapText(ctx, centerText, cx, cy - centerImgSize / 2 - 30, centerImgSize * 2, 40);
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgsRef = useRef<Imgs | null>(null);
  const [style, setStyle] = useState<Style>(2);
  const [texts, setTexts] = useState<string[]>(new Array(DEFAULT_TEXTS[2].length).fill(""));
  const [ready, setReady] = useState(false);
  const [ringCount, setRingCount] = useState(6); // 环形模式的头数量

  // Load images once
  useEffect(() => {
    let loaded = 0;
    const left = new Image(), right = new Image(), middle = new Image();
    left.crossOrigin = right.crossOrigin = middle.crossOrigin = "anonymous";
    const onLoad = () => {
      loaded++;
      if (loaded === 3) {
        imgsRef.current = { left, right, middle };
        setReady(true);
      }
    };
    left.onload = right.onload = middle.onload = onLoad;
    left.src = "/Left.png";
    right.src = "/Right.png";
    middle.src = "/Middle.png";
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const imgs = imgsRef.current;
    if (!canvas || !imgs) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (style === 2) drawStyle2(ctx, canvas.width, canvas.height, imgs, texts);
    else if (style === 3) drawStyle3(ctx, canvas.width, canvas.height, imgs, texts);
    else if (style === 4) drawStyle4(ctx, canvas.width, canvas.height, imgs, texts);
    else if (style === "环形多头") drawStyleRing(ctx, canvas.width, canvas.height, imgs, texts, ringCount);
  }, [style, texts, ringCount]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  // When style changes, reset texts
  const changeStyle = (s: Style) => {
    setStyle(s);
    if (s === "环形多头") {
      setTexts(new Array(ringCount + 1).fill("")); // ringCount 个外圈 + 1 个中心
    } else {
      setTexts(new Array(DEFAULT_TEXTS[s].length).fill(""));
    }
  };

  // 更新环形模式的头数量
  const updateRingCount = (count: number) => {
    const newCount = Math.max(3, count); // 最少3个
    
    if (style === "环形多头") {
      setTexts(prev => {
        const prevCount = prev.length - 1; // 之前的头数 = 数组长度 - 1
        const next = new Array(newCount + 1).fill("");
        
        // 1. 搬运普通文案 (0 到 min(prevCount, newCount) - 1)
        const commonCount = Math.min(prevCount, newCount);
        for (let i = 0; i < commonCount; i++) {
          next[i] = prev[i];
        }
        
        // 2. 搬运中心文案 (prev 的最后一个 -> next 的最后一个)
        if (prev.length > 0) {
          next[newCount] = prev[prevCount];
        }
        
        return next;
      });
    }
    setRingCount(newCount);
  };

  const updateText = (i: number, val: string) => {
    setTexts(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "coucou-meme.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const [cw, ch] = CANVAS_SIZE[style];
  const labels = style === "环形多头" ? getRingLabels(ringCount) : INPUT_LABELS[style];

  return (
    <div style={styles.page}>
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>凑凑！？逼？！</h1>
          <p style={styles.subtitle}>籽岷梗图生成器</p>
        </header>

        {/* Card */}
        <div style={styles.card}>
          {/* Style selector */}
          <section style={styles.section}>
            <span style={styles.sectionTitle}>模式</span>
            <div style={styles.segmentedControl}>
              {([2, 3, 4] as Style[]).map(s => (
                <button
                  key={s}
                  onClick={() => changeStyle(s)}
                  style={{
                    ...styles.segment,
                    ...(style === s ? styles.segmentActive : {}),
                  }}
                >
                  {s} 头
                </button>
              ))}
              <button
                onClick={() => changeStyle("环形多头")}
                style={{
                  ...styles.segment,
                  ...(style === "环形多头" ? styles.segmentActive : {}),
                }}
              >
                环形多头
              </button>
            </div>
          </section>

          {/* Ring count input (only for 环形多头 mode) */}
          {style === "环形多头" && (
            <section style={styles.section}>
              <span style={styles.sectionTitle}>外圈头数</span>
              <div style={styles.ringCountWrap}>
                <input
                  type="number"
                  min={3}
                  value={ringCount}
                  onChange={e => updateRingCount(parseInt(e.target.value) || 3)}
                  style={styles.ringCountInput}
                />
                <span style={styles.ringCountHint}>（最少 3 个）</span>
              </div>
            </section>
          )}

          {/* Text inputs */}
          <section style={styles.section}>
            <span style={styles.sectionTitle}>文案</span>
            <div style={styles.inputsGrid}>
              {labels.map((lbl, i) => (
                <div key={i} style={styles.inputGroup}>
                  <label style={styles.inputLabel}>{lbl}</label>
                  <input
                    style={{
                      ...styles.input,
                      ...(i === labels.length - 1 ? styles.inputFinal : {}),
                    }}
                    value={texts[i] ?? ""}
                    onChange={e => updateText(i, e.target.value)}
                    placeholder={DEFAULT_TEXTS[style][i]}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Export button */}
          <div style={styles.actions}>
            <button onClick={exportPng} style={styles.exportBtn}>
              导出 PNG
            </button>
          </div>
        </div>

        {/* Canvas preview */}
        <div style={styles.canvasCard}>
          <span style={styles.previewLabel}>预览</span>
          <div style={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={cw}
              height={ch}
              style={styles.canvas}
            />
            {!ready && (
              <div style={styles.loading}>加载素材中…</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Ant Design Style Minimal Styles ──────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
  },
  main: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 24px 60px",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 600,
    color: "rgba(0, 0, 0, 0.88)",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(0, 0, 0, 0.45)",
    fontWeight: 400,
  },
  card: {
    background: "#ffffff",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    marginBottom: 24,
    border: "1px solid #f0f0f0",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(0, 0, 0, 0.88)",
    marginBottom: 16,
  },
  segmentedControl: {
    display: "inline-flex",
    background: "rgba(0, 0, 0, 0.04)",
    borderRadius: 6,
    padding: 2,
    gap: 0,
  },
  segment: {
    padding: "6px 24px",
    fontSize: 14,
    fontWeight: 400,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: "rgba(0, 0, 0, 0.65)",
    transition: "all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
    cursor: "pointer",
  },
  segmentActive: {
    background: "#ffffff",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    color: "rgba(0, 0, 0, 0.88)",
    fontWeight: 500,
  },
  inputsGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    minWidth: 160,
    flex: "1 1 160px",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 400,
    color: "rgba(0, 0, 0, 0.88)",
  },
  input: {
    padding: "7px 11px",
    fontSize: 14,
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    background: "#ffffff",
    color: "rgba(0, 0, 0, 0.88)",
    outline: "none",
    width: "100%",
    transition: "all 0.2s",
  },
  inputFinal: {
    borderColor: "#1677ff",
    boxShadow: "0 0 0 2px rgba(5, 145, 255, 0.1)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    paddingTop: 8,
    borderTop: "1px solid #f0f0f0",
    marginTop: 24,
  },
  exportBtn: {
    padding: "8px 24px",
    fontSize: 14,
    fontWeight: 400,
    background: "#1677ff",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
    boxShadow: "0 2px 0 rgba(5, 145, 255, 0.1)",
    marginTop: 16,
  },
  canvasCard: {
    background: "#ffffff",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    border: "1px solid #f0f0f0",
  },
  previewLabel: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(0, 0, 0, 0.88)",
    marginBottom: 16,
  },
  canvasWrap: {
    position: "relative" as const,
    background: "#fafafa",
    borderRadius: 6,
    overflow: "hidden",
    lineHeight: 0,
    border: "1px solid #f0f0f0",
  },
  canvas: {
    display: "block",
    maxWidth: "100%",
    height: "auto",
  },
  loading: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.45)",
  },
  ringCountWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  ringCountInput: {
    width: 80,
    padding: "7px 11px",
    fontSize: 14,
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    background: "#ffffff",
    color: "rgba(0, 0, 0, 0.88)",
    outline: "none",
    textAlign: "center" as const,
  },
  ringCountHint: {
    fontSize: 13,
    color: "rgba(0, 0, 0, 0.45)",
  },
};
