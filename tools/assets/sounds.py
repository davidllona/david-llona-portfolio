# Convierte los sonidos de Envato (assets-externos/sonidos) en los MP3 ligeros
# que usa la web (public/sounds) y escribe sus datos en src/audio/sampleData.json.
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/assets/sounds.py
#
# Se usa el módulo de audio de Blender (`aud`) porque en el equipo no hay ffmpeg.
#
# Bucles: se recorta un tramo y se funde su cola con su principio, de modo que
# el contenido es periódico. El archivo lleva además un margen repetido antes y
# después del periodo: así el bucle (loopStart → loopStart + periodo) no depende
# del silencio que el codificador MP3 añade al principio y al final.

import glob
import json
import os

import aud
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "sonidos")
OUT = os.path.join(ROOT, "public", "sounds")
DATA = os.path.join(ROOT, "src", "audio", "sampleData.json")
RATE = 44100
LEAD = 0.25  # margen repetido a cada lado del periodo de un bucle, en segundos


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


def cut(data, start, length):
    a = int(start * RATE)
    return data[a : a + int(length * RATE)].copy()


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
    # Limitador suave: por debajo de 0,7 no toca nada.
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
    # `data` dura al menos periodo + mezcla. La cola se funde con el principio
    # (potencia constante) y queda un tramo de `period` s que se repite sin corte.
    p, b = int(period * RATE), int(blend * RATE)
    body = data[:p].copy()
    tail = data[p : p + b]
    t = np.linspace(0, np.pi / 2, b, dtype=np.float32)[:, None]
    body[:b] = body[:b] * np.sin(t) + tail * np.cos(t)
    lead = int(LEAD * RATE)
    return np.concatenate([body[-lead:], body, body[: lead * 2]])


def onsets(track, gap=0.3):
    # Golpes de una pista de pasos: máximos de la envolvente separados `gap` s.
    win = int(0.01 * RATE)
    envelope = np.sqrt(np.convolve(track[:, 0] ** 2, np.ones(win) / win, mode="same"))
    threshold = envelope.max() * 0.35
    found, i = [], 0
    while i < len(envelope):
        if envelope[i] > threshold:
            end = min(len(envelope), i + int(gap * RATE))
            found.append(i)
            i = end
        else:
            i += 1
    return found


def write(name, data, bitrate):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".mp3")
    data = np.ascontiguousarray(np.clip(data, -1, 1), dtype=np.float32)
    channels = aud.CHANNELS_STEREO if data.shape[1] == 2 else aud.CHANNELS_MONO
    aud.Sound.buffer(data, RATE).write(path, aud.RATE_44100, channels, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, bitrate * 1000, 16384)
    return os.path.getsize(path)


manifest = {}
total = 0


def emit(name, data, bitrate, **info):
    global total
    size = write(name, data, bitrate)
    total += size
    manifest[name] = {"file": f"sounds/{name}.mp3", "bytes": size, "duration": round(len(data) / RATE, 3), **info}
    print(f"{name:16s} {size / 1000:7.1f} kB  {len(data) / RATE:6.2f} s")


def loop(name, pattern, start, period, blend, rms, bitrate, stereo=False):
    data = read(find(pattern))
    if not stereo:
        data = mono(data)
    data = seamless(cut(data, start, period + blend + 0.1), period, blend)
    emit(name, to_rms(data, rms), bitrate, loop=[LEAD, round(LEAD + period, 4)])


# ── Bucles ────────────────────────────────────────────────────────────────────
loop("cascada", "small-waterfall-loop/*.wav", 20, 11, 1.5, 0.11, 80)
loop("arroyo", "stream-water-gentle-flowing-loop/*.wav", 3, 13, 1.5, 0.085, 80)
loop("mar", "calm-sea-waves-loop/*.wav", 44, 34, 3, 0.085, 64)
loop("pajaros", "forest-spring-birds-ambience-loop/*.wav", 6, 36, 3, 0.07, 96, stereo=True)
loop("grillos", "crickets-at-night-loop/**/*.wav", 30, 15, 2, 0.075, 64)

# ── Pasos sobre hierba: 16 muestras en un solo archivo, una por casilla ──────
SLOT = 0.7
steps = [mono(read(path)) for path in sorted(glob.glob(os.path.join(SOURCE, "footsteps-grass", "Footsteps Grass [0-9]*.wav")), key=lambda p: int(p.split(" ")[-1][:-4]))]
for path in sorted(glob.glob(os.path.join(SOURCE, "footsteps-grass", "Footsteps Grass Loop *.wav"))):
    # De cada pista continua, un paso suelto: el segundo golpe que se detecta.
    track = mono(read(path))
    marks = onsets(track)
    at = marks[1] if len(marks) > 1 else marks[0]
    steps.append(track[max(0, at - int(0.015 * RATE)) : at + int(0.5 * RATE)])
if len(steps) != 16:
    raise SystemExit(f"Se esperaban 16 pasos y hay {len(steps)}")
sheet = np.zeros((int(SLOT * RATE) * len(steps), 1), dtype=np.float32)
for index, step in enumerate(steps):
    # Cada paso empieza en su golpe (se quita el silencio inicial) y se apaga a los 0,55 s.
    loud = np.nonzero(np.abs(step[:, 0]) > np.abs(step).max() * 0.06)[0]
    step = step[max(0, loud[0] - int(0.004 * RATE)) :][: int(0.55 * RATE)]
    step = fade(to_peak(step, 0.8), 0.003, 0.12)
    a = index * int(SLOT * RATE) + int(0.06 * RATE)
    sheet[a : a + len(step)] = step
emit("pasos-hierba", sheet, 96, slots=len(steps), slot=SLOT, lead=0.06, length=0.56)

# ── Golpes sueltos ────────────────────────────────────────────────────────────
def shot(name, pattern, bitrate=80, start=0, length=None, peak=0.9, fade_in=0.003, fade_out=0.05, keep_stereo=False, trim=True):
    data = read(find(pattern))
    if not keep_stereo:
        data = mono(data)
    if trim:
        loud = np.nonzero(np.abs(data).max(axis=1) > np.abs(data).max() * 0.03)[0]
        data = data[max(0, loud[0] - int(0.004 * RATE)) :]
    data = data[int(start * RATE) :]
    if length:
        data = data[: int(length * RATE)]
    emit(name, fade(to_peak(data, peak), fade_in, fade_out), bitrate)


shot("chapuzon", "small-water-splash/*.wav")
shot("poste", "soccer-ball-hits-goal-post/*.wav", length=1.2, fade_out=0.4)
for n in (1, 2, 3):
    shot(f"red-{n}", f"football-ball-hit-net/Football Ball Hit Net 0{n}.wav", length=0.9, fade_out=0.25)
shot("pop", "puzzle-game-ui-pop-04/*.wav", length=0.4, fade_out=0.15)
shot("cohete-rugido", "huge-rocket-launch-ignition-rumble/**/*.wav", length=13, peak=0.92, fade_in=0.9, fade_out=4.5, trim=False)
shot("cohete-silbido", "rocket-launch-whoosh/*.wav", length=4.2, fade_out=1.2, trim=False)

with open(DATA, "w") as file:
    json.dump(manifest, file, indent=1)
    file.write("\n")
print(f"Total: {total / 1000:.0f} kB en {len(manifest)} archivos")
