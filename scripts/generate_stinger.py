"""
AISchool Brand Stinger v3 — Orchestral Cinematic
用 triangle wave + detuned voices 模擬弦樂質感，避免純 sine 的電子感
結構：
  0.0-1.3s  低弦樂鋪底（detuned voices, 慢 attack）
  1.28s     Shimmer（撥弦泛音瞬態）
  1.35s     主衝擊（D1=36.7Hz 低音打擊，帶廳堂混響）
  1.35-4.0s 混響尾音自然衰減
"""
import numpy as np
import wave, os

SR  = 44100
DUR = 4.0
N   = int(SR * DUR)
t   = np.linspace(0, DUR, N, endpoint=False)
audio = np.zeros(N)

# ── Helpers ────────────────────────────────────────────────────────────────

def tri(freq, t_arr):
    """Triangle wave — 比 sine 更溫暖，有自然的奇次諧波"""
    return 2 / np.pi * np.arcsin(np.sin(2 * np.pi * freq * t_arr))

def hall_reverb(sig, sr, pre_ms=20, decay=0.65):
    """廳堂混響：多個反射點模擬空間感"""
    out = sig.copy().astype(np.float64)
    taps = [(pre_ms, .58), (pre_ms+40, .44), (pre_ms+78, .33),
            (pre_ms+127, .23), (pre_ms+195, .15), (pre_ms+290, .09),
            (pre_ms+420, .05)]
    for d_ms, amp in taps:
        ds = int(d_ms * sr / 1000)
        if ds < len(sig):
            out[ds:] += sig[:len(sig)-ds] * amp * decay
    return out

def adsr(t_arr, atk, dcy, sus_lvl, rel_start, rel_end):
    e = np.zeros_like(t_arr)
    e[t_arr < atk] = t_arr[t_arr < atk] / atk
    m = (t_arr >= atk) & (t_arr < dcy)
    e[m] = 1 - (1 - sus_lvl) * (t_arr[m] - atk) / (dcy - atk)
    e[(t_arr >= dcy) & (t_arr < rel_start)] = sus_lvl
    m2 = (t_arr >= rel_start) & (t_arr < rel_end)
    e[m2] = sus_lvl * (1 - (t_arr[m2] - rel_start) / (rel_end - rel_start))
    return np.clip(e, 0, 1)

# ── 1. Low String Pad（大提琴音域，detuned ensemble）────────────────────────
pad_s  = int(0.38 * SR)
pad_t  = t[pad_s:]
base   = 65.4  # C2
pad    = np.zeros(len(pad_t))

# 5 個略微失調的聲部模擬弦樂組
for d in [-0.006, -0.002, 0.0, 0.002, 0.006]:
    f = base * (1 + d)
    # triangle + 諧波 (模擬弓弦音色)
    v = (0.50 * tri(f,   pad_t)
       + 0.22 * tri(f*2, pad_t)
       + 0.10 * tri(f*3, pad_t)
       + 0.05 * tri(f*4, pad_t))
    pad += v / 5

pad_env = adsr(pad_t, atk=1.1, dcy=1.5, sus_lvl=0.72,
               rel_start=2.8, rel_end=DUR - pad_s/SR)
pad *= pad_env * 0.20
audio[pad_s:pad_s + len(pad)] += hall_reverb(pad, SR, pre_ms=12, decay=0.72)[:N - pad_s]

# ── 2. Main Impact（D1=36.7Hz，低銅管 + 定音鼓融合）───────────────────────
hit_s = int(1.35 * SR)
hit_t = t[hit_s:]
f0    = 36.7  # D1

impact = (0.80 * np.sin(2*np.pi*f0*hit_t)   * np.exp(-hit_t*1.6)
        + 0.38 * np.sin(2*np.pi*f0*2*hit_t) * np.exp(-hit_t*2.6)
        + 0.18 * np.sin(2*np.pi*f0*3*hit_t) * np.exp(-hit_t*3.8)
        + 0.09 * np.sin(2*np.pi*f0*4*hit_t) * np.exp(-hit_t*5.2)
        + 0.04 * np.sin(2*np.pi*f0*5*hit_t) * np.exp(-hit_t*7.0))

# 鼓膜質感瞬態（定音鼓打擊感，前 20ms）
tl  = int(0.020 * SR)
tt  = np.arange(tl) / SR
burst = np.random.randn(tl) * np.exp(-tt * 130) * np.sin(2*np.pi*90*tt)
impact[:tl] += burst * 0.30

audio[hit_s:hit_s + len(impact)] += hall_reverb(impact * 0.88, SR, pre_ms=18, decay=0.78)[:N - hit_s]

# ── 3. Shimmer（C-E-G 和聲泛音，撥弦質感）─────────────────────────────────
shim_s = int(1.27 * SR)
shim_t = t[shim_s:]
shimmer = (0.09 * np.sin(2*np.pi*523*shim_t) * np.exp(-shim_t*10)   # C5
         + 0.06 * np.sin(2*np.pi*659*shim_t) * np.exp(-shim_t*13)   # E5
         + 0.04 * np.sin(2*np.pi*784*shim_t) * np.exp(-shim_t*17)   # G5
         + 0.03 * np.random.randn(len(shim_t)) * np.exp(-shim_t*22))
audio[shim_s:shim_s + len(shimmer)] += hall_reverb(shimmer, SR, pre_ms=6, decay=0.50)[:N - shim_s]

# ── 4. Sub rumble（貫穿全場，極低頻氛圍）──────────────────────────────────
rumble = 0.038 * np.sin(2*np.pi*22*t) * np.clip(t*2.5, 0, 1) * np.exp(-t*0.35)
audio += rumble

# ── Normalize ────────────────────────────────────────────────────────────
peak = np.max(np.abs(audio))
audio = (audio / peak * 0.90 * 32767).astype(np.int16)

out = os.path.normpath(os.path.join(os.path.dirname(__file__), "../public/audio/intro-stinger.wav"))
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, "w") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(audio.tobytes())
print(f"Generated: {out}  ({DUR}s, orchestral)")
