# Sonidos de The Twisted Moon (mundo 2): convierte los originales de Envato
# (assets-externos/mundo2/, ver docs/CREDITOS.md) en los MP3 ligeros que usa
# la web (public/sounds/twisted) y escribe sus datos en
# src/worlds/twisted/soundData.json. Se descargan solo en el mundo 2.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/twisted_sounds.py
#   … -- mirar     solo dice cuánto dura cada original y dónde tiene sus golpes
#
# Se usa el módulo de audio de Blender (`aud`): en el equipo no hay ffmpeg.
# Bucles como en tools/assets/sounds.py: se recorta un tramo, su cola se funde
# con su principio y el archivo lleva un margen repetido a cada lado.
import glob
import json
import os
import sys

import aud
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "mundo2")
OUT = os.path.join(ROOT, "public", "sounds", "twisted")
DATA = os.path.join(ROOT, "src", "worlds", "twisted", "soundData.json")
RATE = 44100
LEAD = 0.25
args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def find(pattern):
    found = sorted(glob.glob(os.path.join(SOURCE, pattern), recursive=True))
    if not found:
        raise SystemExit(f"Falta el original: {pattern}")
    return found[0]


def read(path):
    sound = aud.Sound.file(path)
    if int(sound.specs[0]) != RATE:
        sound = sound.resample(RATE, aud.RESAMPLE_QUALITY_HIGH) if hasattr(aud, "RESAMPLE_QUALITY_HIGH") else sound.resample(RATE, True)
    data = np.array(sound.data(), dtype=np.float32)
    return data if data.ndim == 2 else data[:, None]


def mono(data):
    return data.mean(axis=1, keepdims=True)


def fade(data, fade_in=0.004, fade_out=0.03):
    data = data.copy()
    n = min(len(data), int(fade_in * RATE))
    if n:
        data[:n] *= np.linspace(0, 1, n, dtype=np.float32)[:, None]
    n = min(len(data), int(fade_out * RATE))
    if n:
        data[-n:] *= np.linspace(1, 0, n, dtype=np.float32)[:, None] ** 2
    return data


def limit(data, ceiling=0.94):
    knee = 0.7
    over = np.abs(data) > knee
    out = data.copy()
    out[over] = np.sign(data[over]) * (knee + (ceiling - knee) * np.tanh((np.abs(data[over]) - knee) / (ceiling - knee)))
    return out


def to_peak(data, peak=0.9):
    return data * (peak / max(1e-6, float(np.abs(data).max())))


def to_rms(data, rms):
    now = float(np.sqrt((data.astype(np.float64) ** 2).mean()))
    return limit(data * (rms / max(1e-6, now)))


def seamless(data, period, blend):
    p, b = int(period * RATE), int(blend * RATE)
    body = data[:p].copy()
    tail = data[p : p + b]
    t = np.linspace(0, np.pi / 2, b, dtype=np.float32)[:, None]
    body[:b] = body[:b] * np.sin(t) + tail * np.cos(t)
    lead = int(LEAD * RATE)
    return np.concatenate([body[-lead:], body, body[: lead * 2]])


def onsets(track, gap=0.25, share=0.3):
    # Golpes: máximos de la envolvente separados `gap` s, por encima de `share` del máximo.
    win = int(0.01 * RATE)
    envelope = np.sqrt(np.convolve(track[:, 0] ** 2, np.ones(win) / win, mode="same"))
    threshold = envelope.max() * share
    found, i = [], 0
    while i < len(envelope):
        if envelope[i] > threshold:
            found.append(i)
            i += int(gap * RATE)
        else:
            i += 1
    return found


if "mirar" in args:
    for pattern in ["mysterious-fairy-tale-waltz/*.wav", "curious-mystery-box/*_loop.wav", "quirky-music-box/**/Quirky Music Box.wav", "crickets-night-ambience-loop/**/*.wav", "classic-clock-tower-chime/*.wav", "magic-sparkle-twinkle-shimmer/**/*01.wav", "wooden-bridge-footsteps/*.wav", "owl-hoot-1/*.wav"]:
        data = read(find(pattern))
        marks = onsets(mono(data))
        gaps = np.diff(marks) / RATE if len(marks) > 1 else []
        print(f"{pattern}: {len(data) / RATE:.1f} s, {data.shape[1]} canales, {len(marks)} golpes; entre golpes {np.round(gaps[:12], 2).tolist()}")
    raise SystemExit

manifest = {}
total = 0


def write(name, data, bitrate):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".mp3")
    data = np.ascontiguousarray(np.clip(data, -1, 1), dtype=np.float32)
    channels = aud.CHANNELS_STEREO if data.shape[1] == 2 else aud.CHANNELS_MONO
    aud.Sound.buffer(data, RATE).write(path, aud.RATE_44100, channels, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, bitrate * 1000, 16384)
    return os.path.getsize(path)


def emit(name, data, bitrate, **info):
    global total
    size = write(name, data, bitrate)
    total += size
    manifest[name] = {"file": f"sounds/twisted/{name}.mp3", "bytes": size, "duration": round(len(data) / RATE, 3), **info}
    print(f"{name:16s} {size / 1000:7.1f} kB  {len(data) / RATE:6.2f} s")


# ── Música: tres pistas para elegir de oído (?musica=1, 2 o 3) ─────────────────
# Cada una entera (o su bucle), en bucle sin corte: la cola se funde 3 s con el principio.
def music(name, pattern, rms=0.09, bitrate=96, blend=3.0):
    data = read(find(pattern))
    if data.shape[1] == 1:
        data = np.concatenate([data, data], axis=1)
    period = len(data) / RATE - blend - 0.05
    data = seamless(data, period, blend)
    emit(name, to_rms(data, rms), bitrate, loop=[LEAD, round(LEAD + period, 4)])


music("musica-1", "mysterious-fairy-tale-waltz/*.wav")
music("musica-2", "curious-mystery-box/*_loop.wav")
music("musica-3", "quirky-music-box/**/Quirky Music Box.wav")

# ── Grillos de fondo, en bucle ────────────────────────────────────────────────
data = mono(read(find("crickets-night-ambience-loop/**/*.wav")))
data = seamless(data[int(20 * RATE) : int((20 + 22 + 2.1) * RATE)], 22, 2)
emit("grillos-noche", to_rms(data, 0.07), 64, loop=[LEAD, LEAD + 22])

# ── Campanada de la torre: la primera, con su resonancia ─────────────────────
data = mono(read(find("classic-clock-tower-chime/*.wav")))
marks = onsets(data, gap=0.8, share=0.4)
# (La campana resuena mucho tiempo: la detección de golpes cortaba su propia resonancia. Se toman 4,2 s desde el primer golpe.)
start = max(0, marks[0] - int(0.01 * RATE))
emit("campanada", fade(to_peak(data[start : start + int(4.2 * RATE)], 0.85), 0.003, 1.4), 80)

# ── Destello mágico: los cuatro ───────────────────────────────────────────────
for n, path in enumerate(sorted(glob.glob(os.path.join(SOURCE, "magic-sparkle-twinkle-shimmer", "**", "*.wav"), recursive=True))[:4], 1):
    data = mono(read(path))
    loud = np.nonzero(np.abs(data[:, 0]) > np.abs(data).max() * 0.03)[0]
    data = data[max(0, loud[0] - int(0.004 * RATE)) :][: int(2.0 * RATE)]
    emit(f"destello-{n}", fade(to_peak(data, 0.75), 0.004, 0.5), 80)

# ── Pasos de madera: cada golpe de la grabación, en su casilla (como los de hierba) ──
SLOT = 0.6
data = mono(read(find("wooden-bridge-footsteps/*.wav")))
marks = onsets(data, gap=0.22, share=0.28)[:10]
sheet = np.zeros((int(SLOT * RATE) * len(marks), 1), dtype=np.float32)
for index, at in enumerate(marks):
    step = data[max(0, at - int(0.01 * RATE)) : at + int(0.45 * RATE)]
    step = fade(to_peak(step, 0.8), 0.003, 0.1)
    a = index * int(SLOT * RATE) + int(0.05 * RATE)
    sheet[a : a + len(step)] = step
emit("pasos-madera", sheet, 80, slots=len(marks), slot=SLOT, lead=0.05, length=0.46)

# ── Búho, lejos ───────────────────────────────────────────────────────────────
data = mono(read(find("owl-hoot-1/*.wav")))
loud = np.nonzero(np.abs(data[:, 0]) > np.abs(data).max() * 0.03)[0]
data = data[max(0, loud[0] - int(0.01 * RATE)) : loud[-1] + int(0.4 * RATE)]
emit("buho", fade(to_peak(data, 0.7), 0.01, 0.4), 64)

with open(DATA, "w") as file:
    json.dump(manifest, file, indent=1)
    file.write("\n")
print(f"Total: {total / 1000:.0f} kB en {len(manifest)} archivos")
