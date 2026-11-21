# Sonidos de The Cosmic Lab (mundo 3): convierte los originales de Envato
# (assets-externos/mundo3/, ver docs/CREDITOS.md) en los MP3 ligeros que usa
# la web (public/sounds/cosmic) y escribe sus datos en
# src/worlds/cosmic/soundData.json. Se descargan solo en el mundo 3.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/cosmic_sounds.py
#   … -- mirar     solo dice cuánto dura cada original
#
# El mismo proceso que tools/assets/twisted_sounds.py (módulo de audio de
# Blender: en el equipo no hay ffmpeg).
import glob
import json
import os
import sys

import aud
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "mundo3")
OUT = os.path.join(ROOT, "public", "sounds", "cosmic")
DATA = os.path.join(ROOT, "src", "worlds", "cosmic", "soundData.json")
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
    for pattern in ["pixels-of-solar-energy/*main-full.wav", "pixels-of-solar-energy/loops/*.wav", "chill-ambient-space/*.wav", "space-ambient/*.wav", "cartoon-sci-fi-power-up/*.wav", "futuristic-sci-fi-energy-beams/*.wav", "futuristic-sci-fi-machine-hum/*.wav", "sci-fi-lava-planet-background-ambience-loop-1/*.wav", "cartoon-jump-boing/**/*.wav", "telemetry-radio-transmission-type-beeps/*.wav"]:
        for path in sorted(glob.glob(os.path.join(SOURCE, pattern), recursive=True)):
            data = read(path)
            marks = onsets(mono(data))
            print(f"{os.path.basename(path)}: {len(data) / RATE:.1f} s, {data.shape[1]} canales, {len(marks)} golpes, pico {float(np.abs(data).max()):.2f}")
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
    manifest[name] = {"file": f"sounds/cosmic/{name}.mp3", "bytes": size, "duration": round(len(data) / RATE, 3), **info}
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


# ── Música: tres pistas para elegir de oído (?musica=1, 2 o 3) ─────────────────
# Cada una entera, en bucle sin corte: la cola se funde 3 s con el principio.
def music(name, pattern, rms=0.085, bitrate=96, blend=3.0, most=None):
    data = read(find(pattern))
    if data.shape[1] == 1:
        data = np.concatenate([data, data], axis=1)
    if most:
        data = data[: int(most * RATE)]
    period = len(data) / RATE - blend - 0.05
    data = seamless(data, period, blend)
    emit(name, to_rms(data, rms), bitrate, loop=[LEAD, round(LEAD + period, 4)])


music("musica-1", "pixels-of-solar-energy/*main-full.wav")
music("musica-2", "chill-ambient-space/*.wav")
music("musica-3", "space-ambient/*.wav")


def trimmed(pattern, most, lead=0.006, floor=0.03):
    # Desde donde empieza a sonar, como mucho `most` segundos.
    data = mono(read(find(pattern)))
    loud = np.nonzero(np.abs(data[:, 0]) > np.abs(data).max() * floor)[0]
    return data[max(0, loud[0] - int(lead * RATE)) :][: int(most * RATE)]


# ── Encendido de una máquina ──────────────────────────────────────────────────
emit("encendido", fade(to_peak(trimmed("cartoon-sci-fi-power-up/*.wav", 2.4), 0.8), 0.004, 0.5), 80)
# ── El rayo de energía ───────────────────────────────────────────────────────�
emit("rayo", fade(to_peak(trimmed("futuristic-sci-fi-energy-beams/*.wav", 2.6), 0.8), 0.004, 0.9), 80)
# ── Zumbido de máquina encendida, en bucle ─────────────────────────────────────
data = mono(read(find("futuristic-sci-fi-machine-hum/*.wav")))
span = min(9.0, len(data) / RATE - 2.6)
emit("zumbido", to_rms(seamless(data[int(0.5 * RATE) :], span, 2), 0.08), 64, loop=[LEAD, LEAD + round(span, 4)])
# ── Ambiente del planeta, en bucle (va muy bajo) ───────────────────────────────
data = mono(read(find("sci-fi-lava-planet-background-ambience-loop-1/*.wav")))
span = min(20.0, len(data) / RATE - 2.6)
emit("ambiente", to_rms(seamless(data, span, 2), 0.07), 64, loop=[LEAD, LEAD + round(span, 4)])
# ── Salto (va muy bajo) ──────────────────────────────────────────────────────�
emit("salto", fade(to_peak(trimmed("cartoon-jump-boing/**/*.wav", 0.9), 0.75), 0.003, 0.2), 64)
# ── Pitidos de telemetría: la antena ─────────────────────────────────────────�
emit("antena", fade(to_peak(trimmed("telemetry-radio-transmission-type-beeps/*.wav", 3.2), 0.7), 0.004, 0.6), 64)

with open(DATA, "w") as file:
    json.dump(manifest, file, indent=1)
    file.write("\n")
print(f"Total: {total / 1000:.0f} kB en {len(manifest)} archivos")
