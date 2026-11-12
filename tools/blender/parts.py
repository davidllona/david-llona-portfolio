# Piezas de oficio con las que se arman los edificios: zócalo de sillares,
# tejado curvo de tejas, puerta con arco, ventanas con contraventanas,
# escaparate, rótulo, farol, chimenea… Todas se colocan sobre un «plano de
# fachada» (Face): su origen, hacia dónde mira y, a partir de ahí, coordenadas
# locales (x a lo largo del muro, y arriba, z hacia fuera).
import math

from mathutils import Matrix, Vector

from kit import shade, tones

WOOD = {"dark": "#6b4630", "mid": "#a8713f", "light": "#d19a5f", "pale": "#e3bc85"}
STONE = {"dark": "#84808c", "mid": "#a9a6b3", "light": "#cfccd6"}
STONES = ["#9a96a3", "#aeabb8", "#bfbcc8", "#a39d9c", "#b7b0aa", "#8f8b98"]
PLASTER = ("#e2d3b8", "#f6ead6")
IRON = "#3b3836"
GLASS_BACK = "#2a211b"
LEAVES = [("#3a8a47", "#86c95e"), ("#4a9a4f", "#a3d86a"), ("#357f4b", "#7cc25c")]
FLOWERS = ["#ff8fb5", "#ffd45a", "#ffffff", "#ff9a5a", "#c9a0ff"]


class Face:
    """Plano de fachada: origen en el mundo y giro sobre la vertical (0 = mira a +z)."""

    def __init__(self, model, origin=(0, 0, 0), turn=0.0):
        self.m = model
        self.origin = Vector(origin)
        self.turn = turn
        self.yaw = Matrix.Rotation(turn, 4, "Y")

    def at(self, position):
        return tuple(self.origin + (self.yaw @ Vector(position)))

    def rot(self, rotation=(0, 0, 0)):
        rx, ry, rz = rotation
        return self.yaw @ Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rz, 4, "Z")

    def box(self, size, position, color, rotation=(0, 0, 0), **kw):
        self.m.box(size, self.at(position), color, rotation=self.rot(rotation), **kw)

    def cyl(self, radius, height, position, color, rotation=(0, 0, 0), **kw):
        self.m.cyl(radius, height, self.at(position), color, rotation=self.rot(rotation), **kw)

    def ball(self, radius, position, color, rotation=(0, 0, 0), **kw):
        self.m.ball(radius, self.at(position), color, rotation=self.rot(rotation), **kw)

    def prism(self, outline, depth, position, color, rotation=(0, 0, 0), **kw):
        self.m.prism(outline, depth, self.at(position), color, rotation=self.rot(rotation), **kw)

    def lathe(self, profile, position, color, rotation=(0, 0, 0), **kw):
        self.m.lathe(profile, self.at(position), color, rotation=self.rot(rotation), **kw)

    def anchor(self, name, position, rotation=(0, 0, 0), size=(1, 1, 1)):
        self.m.anchor(name, self.at(position), rotation=self.rot(rotation), size=size)


# ── Zócalo ───────────────────────────────────────────────────────────────────
def stone_base(m, width, depth, height=0.5, out=0.1, courses=2, centre=(0, 0)):
    """Zócalo de sillares irregulares alrededor de un cuerpo de width × depth."""
    rnd = m.random
    cx, cz = centre
    m.box((width + out, height - 0.04, depth + out), (cx, (height - 0.04) / 2, cz), (STONE["dark"], STONE["mid"]), bevel=0.02)
    course = height / courses
    sides = [((cx, cz + depth / 2), 0.0, width), ((cx + width / 2, cz), math.pi / 2, depth), ((cx, cz - depth / 2), math.pi, width), ((cx - width / 2, cz), -math.pi / 2, depth)]
    for (ox, oz), turn, length in sides:
        f = Face(m, (ox, 0, oz), turn)
        for row in range(courses):
            x = -length / 2 - out
            end = length / 2 + out
            first = True
            while x < end - 0.05:
                w = rnd.uniform(0.36, 0.72) * (0.6 if first and row % 2 else 1)
                w = min(w, end - x)
                if end - (x + w) < 0.2:
                    w = end - x
                tone = rnd.choice(STONES)
                f.box((w - 0.015, course - 0.015, 0.26 + rnd.uniform(0, 0.05)), (x + w / 2, row * course + course / 2, out - 0.06 + rnd.uniform(-0.012, 0.02)), (shade(tone, -0.12), shade(tone, 0.06)), bevel=0.045, vary=0.06, jitter=0.008)
                x += w
                first = False


def stone_steps(f, x, width=1.5, rise=0.25, steps=2, tread=0.42, z=0.0):
    """Escalones de piedra delante de una puerta: el de arriba, a ras de zócalo."""
    for i in range(steps):
        grow = (steps - 1 - i) * 0.34
        f.box((width + grow, rise, tread + (0 if i < steps - 1 else 0.12)), (x, rise * (i + 0.5), z + 0.2 + tread * (steps - 1 - i) + tread / 2), (STONE["mid"], STONE["light"]), bevel=0.05, vary=0.05, jitter=0.006)


# ── Tejado ───────────────────────────────────────────────────────────────────
class CurvedRoof:
    """Tejado a dos aguas con la cumbrera a lo largo de z y faldones que se curvan
    hacia el alero (más empinados arriba, tendidos abajo)."""

    def __init__(self, half, eave_y, rise, over=0.5):
        self.half, self.eave_y, self.rise, self.over = half, eave_y, rise, over
        self.reach = half + over
        tw = half / self.reach
        self.h = rise / self._f(tw)
        self.ridge_y = eave_y + rise

    @staticmethod
    def _f(t):
        return 0.5 * t + 0.5 * (1 - (1 - t) ** 2)

    def y(self, x):
        """Altura de la cara de arriba de la cubierta a |x| del eje."""
        return self.ridge_y - self.h * self._f(min(1, abs(x) / self.reach))

    def outline(self, bottom, drop=0.1, steps=7):
        """Contorno del muro con su hastial, siguiendo la curva por debajo de las tejas."""
        pts = [(-self.half, bottom), (self.half, bottom)]
        for i in range(steps + 1):
            x = self.half * (1 - i / steps)
            pts.append((x, self.y(x) - drop))
        for i in range(1, steps + 1):
            x = -self.half * (i / steps)
            pts.append((x, self.y(x) - drop))
        return pts

    def build(self, m, z0, z1, color, rows=7, tile=0.46, centre_x=0.0):
        """Tejas entre z0 (atrás) y z1 (delante), cumbrera, remates y tablas de hastial."""
        rnd = m.random
        dark, light = tones(color, -0.3, 0.12)
        length = z1 - z0
        for side in (1, -1):
            for row in range(rows):
                xa, xb = self.reach * row / rows, self.reach * (row + 1) / rows
                ya, yb = self.y(xa), self.y(xb)
                angle = math.atan2(yb - ya, xb - xa)
                chord = math.hypot(xb - xa, yb - ya)
                nx, ny = -math.sin(angle), math.cos(angle)
                mx, my = (xa + xb) / 2 + math.cos(angle) * 0.045, (ya + yb) / 2 + math.sin(angle) * 0.045
                # Tablero bajo las tejas: cierra las juntas.
                m.box((chord + 0.02, 0.06, length - 0.04), (centre_x + side * (mx - nx * 0.03), my - ny * 0.03, (z0 + z1) / 2), shade(WOOD["dark"], -0.15), rotation=(0, 0, side * angle), bevel=0.0, vary=0)
                # Tejas de la hilada, al tresbolillo.
                z = z0 - (tile / 2 if row % 2 else 0)
                while z < z1 - 1e-4:
                    a, b = max(z, z0), min(z + tile, z1)
                    z += tile
                    if b - a < 0.08:
                        continue
                    k = rnd.uniform(-0.1, 0.1)
                    lift = rnd.uniform(0.0, 0.022)
                    extra = rnd.uniform(0.0, 0.05)
                    m.box(
                        (chord + 0.09 + extra, 0.085, b - a - 0.012),
                        (centre_x + side * (mx + math.cos(angle) * extra / 2 + nx * (0.045 + lift)), my + math.sin(angle) * extra / 2 + ny * (0.045 + lift), (a + b) / 2),
                        (shade(dark, k), shade(light, k)),
                        rotation=(0, 0, side * (angle + 0.035)),
                        bevel=0.022,
                        vary=0.05,
                    )
                # Tabla de hastial (delante y detrás), bajo el borde de las tejas.
                for zb in (z1 - 0.07, z0 + 0.07):
                    m.box((chord + 0.04, 0.2, 0.08), (centre_x + side * (mx - nx * 0.1), my - ny * 0.1, zb), (WOOD["dark"], shade(WOOD["dark"], 0.12)), rotation=(0, 0, side * angle), bevel=0.02)
        # Cumbrera: piezas redondeadas a caballo, alternando tono.
        z, i = z0 - 0.04, 0
        while z < z1 + 0.04 - 1e-4:
            b = min(z + 0.52, z1 + 0.04)
            m.cyl(0.15, b - z - 0.01, (centre_x, self.ridge_y + 0.02, (z + b) / 2), (shade(dark, 0.05 * (i % 2)), shade(light, 0.05 * (i % 2))), sides=7, rotation=(math.pi / 2, 0, 0), bevel=0.025, scale=(1.15, 1, 0.8))
            z, i = b, i + 1
        for zf in (z1 + 0.02, z0 - 0.02):
            m.ball(0.13, (centre_x, self.ridge_y + 0.2, zf), ("#e0a23c", "#ffd98a"), detail=1, scale=(1, 1.25, 1))
            m.cyl(0.06, 0.2, (centre_x, self.ridge_y + 0.08, zf), WOOD["dark"], sides=6)


def shed_roof(m, x0, x1, y0, y1, z0, z1, color, rows=3, tile=0.46):
    """Tejadillo a un agua: baja de (x0, y0) a (x1, y1) y va de z0 a z1."""
    rnd = m.random
    dark, light = tones(color, -0.3, 0.12)
    side = 1 if x1 > x0 else -1
    for row in range(rows):
        xa, xb = x0 + (x1 - x0) * row / rows, x0 + (x1 - x0) * (row + 1) / rows
        ya, yb = y0 + (y1 - y0) * row / rows, y0 + (y1 - y0) * (row + 1) / rows
        angle = math.atan2(yb - ya, abs(xb - xa))
        chord = math.hypot(xb - xa, yb - ya)
        nx, ny = -math.sin(angle) * side, math.cos(angle)
        mx, my = (xa + xb) / 2, (ya + yb) / 2
        m.box((chord + 0.02, 0.06, z1 - z0 - 0.04), (mx - nx * 0.03, my - ny * 0.03, (z0 + z1) / 2), shade(WOOD["dark"], -0.15), rotation=(0, 0, side * angle), bevel=0, vary=0)
        z = z0 - (tile / 2 if row % 2 else 0)
        while z < z1 - 1e-4:
            a, b = max(z, z0), min(z + tile, z1)
            z += tile
            if b - a < 0.08:
                continue
            k = rnd.uniform(-0.1, 0.1)
            m.box((chord + 0.1, 0.085, b - a - 0.012), (mx + side * 0.04 + nx * 0.05, my + ny * 0.05, (a + b) / 2), (shade(dark, k), shade(light, k)), rotation=(0, 0, side * (angle + 0.035)), bevel=0.022, vary=0.05)


# ── Madera vista ─────────────────────────────────────────────────────────────
def beam(f, size, position, rotation=(0, 0, 0), color=None):
    f.box(size, position, color or (WOOD["dark"], shade(WOOD["dark"], 0.14)), rotation=rotation, bevel=0.025, vary=0.07)


# ── Puerta ───────────────────────────────────────────────────────────────────
def arched_door(f, x, sill, width=1.0, height=2.05, color=None):
    """Puerta de tablas con arco de dovelas de piedra, herrajes y pomo. `sill`: altura del umbral."""
    wood = color or ("#8f5a36", "#c08a52")
    r = width / 2
    spring = sill + height - r
    arc = [(math.cos(a) * r, spring + math.sin(a) * r) for a in [math.pi * i / 8 for i in range(9)]]
    # Hueco oscuro y hoja.
    f.prism([(r + 0.05, sill), *[(px * 1.1, spring + (py - spring) * 1.1) for px, py in arc], (-r - 0.05, sill)], 0.1, (x, 0, 0.0), GLASS_BACK, bevel=0.0, vary=0)
    f.prism([(r, sill + 0.02), *arc, (-r, sill + 0.02)], 0.1, (x, 0, 0.07), wood, bevel=0.025, vary=0.04)
    # Juntas entre tablas.
    for dx in (-r / 2, 0, r / 2):
        f.box((0.025, height - r * 0.45 - abs(dx) * 0.25, 0.03), (x + dx, sill + (height - r * 0.45 - abs(dx) * 0.25) / 2 + 0.03, 0.115), shade(wood[0], -0.25), bevel=0.0, vary=0)
    # Herrajes y pomo.
    for y in (sill + 0.42, sill + 1.32):
        f.box((width * 0.78, 0.09, 0.03), (x - width * 0.07, y, 0.13), IRON, bevel=0.012)
        f.ball(0.035, (x - width * 0.4, y, 0.15), "#55504c", detail=1)
    f.ball(0.06, (x + r * 0.62, sill + 0.95, 0.16), ("#c98f2e", "#ffd98a"), detail=1)
    f.cyl(0.085, 0.02, (x + r * 0.62, sill + 0.95, 0.125), "#8a6a2a", sides=8, rotation=(math.pi / 2, 0, 0), bevel=0.005)
    # Jambas y arco de dovelas.
    for side in (-1, 1):
        for i, y in enumerate((sill + 0.24, sill + 0.72, sill + 1.2)):
            if y + 0.24 > spring + 0.05:
                continue
            tone = STONES[(i + (side > 0)) % len(STONES)]
            f.box((0.24 + 0.05 * (i % 2), 0.46, 0.2), (x + side * (r + 0.13), y, 0.05), (shade(tone, -0.1), shade(tone, 0.08)), bevel=0.04, vary=0.05, jitter=0.006)
        rest = spring - (sill + 1.44)
        if rest > 0.08:
            f.box((0.26, rest, 0.2), (x + side * (r + 0.13), sill + 1.44 + rest / 2, 0.05), (STONE["mid"], STONE["light"]), bevel=0.04, vary=0.05)
    count = 7
    for i in range(count):
        a = math.pi * (i + 0.5) / count
        tone = STONES[i % len(STONES)]
        big = 1.25 if i == count // 2 else 1
        f.box((0.3 * big, (math.pi * (r + 0.14) / count) - 0.01, 0.2 + 0.03 * (big > 1)), (x + math.cos(a) * (r + 0.14), spring + math.sin(a) * (r + 0.14), 0.05), (shade(tone, -0.08), shade(tone, 0.1)), rotation=(0, 0, a), bevel=0.04, vary=0.05)


# ── Ventanas ─────────────────────────────────────────────────────────────────
def flower_box(f, x, y, width, z=0.2, seed=0):
    rnd = f.m.random
    f.box((width, 0.2, 0.26), (x, y, z), (WOOD["dark"], WOOD["mid"]), bevel=0.035, taper=1.08)
    for side in (-1, 1):
        f.box((0.06, 0.2, 0.14), (x + side * (width / 2 - 0.12), y - 0.14, z - 0.07), WOOD["dark"], rotation=(0.5, 0, 0), bevel=0.015)
    n = max(3, round(width / 0.22))
    for i in range(n):
        px = x - width / 2 + 0.12 + (width - 0.24) * i / (n - 1)
        leaf = LEAVES[(i + seed) % len(LEAVES)]
        f.ball(0.13, (px, y + 0.14 + rnd.uniform(0, 0.04), z + rnd.uniform(-0.02, 0.03)), leaf, detail=1, scale=(1.0, 0.8, 0.85), jitter=0.16)
        if i % 2 == seed % 2:
            f.ball(0.055, (px + rnd.uniform(-0.04, 0.04), y + 0.27, z + 0.05), FLOWERS[(i + seed) % len(FLOWERS)], detail=1, vary=0.04)


def shutter_window(f, x, y, w=0.7, h=0.9, name=None, shutters="#3f8a82", planter=True, seed=0):
    """Ventana con marco, cruceta, alféizar, contraventanas de lamas y jardinera.
    El cristal lo pone el juego en el ancla `name`."""
    f.box((w + 0.04, h + 0.04, 0.05), (x, y, 0.0), GLASS_BACK, bevel=0, vary=0)
    for dx in (-(w / 2 + 0.05), w / 2 + 0.05):
        beam(f, (0.11, h + 0.24, 0.14), (x + dx, y, 0.05))
    beam(f, (w + 0.34, 0.12, 0.16), (x, y + h / 2 + 0.07, 0.06))
    f.box((w + 0.42, 0.09, 0.24), (x, y - h / 2 - 0.06, 0.1), (WOOD["mid"], WOOD["light"]), bevel=0.03)
    f.box((0.045, h, 0.05), (x, y, 0.07), WOOD["dark"], bevel=0.01)
    f.box((w, 0.045, 0.05), (x, y + h * 0.12, 0.07), WOOD["dark"], bevel=0.01)
    dark, light = tones(shutters, -0.22, 0.1)
    sw = w / 2 + 0.04
    for side in (-1, 1):
        cx = x + side * (w / 2 + 0.12 + sw / 2)
        f.box((sw, h + 0.08, 0.05), (cx, y, 0.04), (dark, light), rotation=(0, side * -0.16, 0), bevel=0.018)
        lamas = 5
        for i in range(lamas):
            f.box((sw - 0.1, 0.05, 0.035), (cx, y - h / 2 + 0.14 + (h - 0.2) * i / (lamas - 1), 0.075), shade(light, 0.1), rotation=(0.5, side * -0.16, 0), bevel=0.012, vary=0.03)
        for dy in (-h * 0.3, h * 0.3):
            f.box((0.1, 0.035, 0.03), (x + side * (w / 2 + 0.13), y + dy, 0.09), IRON, bevel=0.008)
    if planter:
        flower_box(f, x, y - h / 2 - 0.24, w + 0.3, 0.22, seed)
    if name:
        f.anchor(name, (x, y, 0.045), size=(w, h, 1))


def round_window(f, x, y, radius=0.32, name=None):
    f.cyl(radius + 0.1, 0.12, (x, y, 0.03), (WOOD["dark"], shade(WOOD["dark"], 0.14)), sides=12, rotation=(math.pi / 2, 0, 0), bevel=0.03)
    f.cyl(radius, 0.04, (x, y, 0.085), GLASS_BACK, sides=12, rotation=(math.pi / 2, 0, 0), bevel=0)
    if name:
        f.anchor(name, (x, y, 0.112), size=(radius, radius, 1))
    f.box((radius * 2, 0.04, 0.04), (x, y, 0.125), WOOD["dark"], bevel=0.008)
    f.box((0.04, radius * 2, 0.04), (x, y, 0.125), WOOD["dark"], bevel=0.008)


def shop_window(f, x, y, w, h, color, name="screen", awning=True, seed=0):
    """Escaparate: hueco con marco grueso, repisa con ménsulas, toldo a rayas y
    jardinera. La captura del proyecto va dentro, en el ancla `name`."""
    f.box((w + 0.1, h + 0.1, 0.06), (x, y, 0.0), GLASS_BACK, bevel=0, vary=0)
    f.anchor(name, (x, y, 0.045), size=(w, h, 1))
    for dx in (-(w / 2 + 0.09), w / 2 + 0.09):
        beam(f, (0.18, h + 0.36, 0.22), (x + dx, y, 0.06))
    beam(f, (w + 0.5, 0.18, 0.24), (x, y + h / 2 + 0.11, 0.07))
    f.box((w + 0.62, 0.1, 0.36), (x, y - h / 2 - 0.08, 0.15), (WOOD["mid"], WOOD["pale"]), bevel=0.035)
    for dx in (-(w / 2 + 0.05), 0, w / 2 + 0.05):
        f.prism([(0, 0), (0.26, 0), (0, -0.28)], 0.09, (x + dx, y - h / 2 - 0.13, 0.03), WOOD["dark"], rotation=(0, -math.pi / 2, 0), bevel=0.015)
    if awning:
        # Toldo corto y alto: no tapa la captura vista desde arriba.
        strips = max(5, round((w + 0.5) / 0.36) | 1)
        sw = (w + 0.5) / strips
        cream = ("#e8dcc4", "#fbf3e2")
        top = y + h / 2 + 0.5
        for i in range(strips):
            tone = tones(color, -0.18, 0.12) if i % 2 == 0 else cream
            px = x - (w + 0.5) / 2 + sw * (i + 0.5)
            f.box((sw - 0.008, 0.045, 0.4), (px, top - 0.1, 0.21), tone, rotation=(0.52, 0, 0), bevel=0.012, vary=0.03)
            f.cyl(sw / 2 - 0.006, 0.04, (px, top - 0.215, 0.385), tone, sides=8, rotation=(math.pi / 2, 0, 0), bevel=0.008, scale=(1, 0.55, 1))
        f.cyl(0.03, w + 0.56, (x, top, 0.05), IRON, sides=6, rotation=(0, 0, math.pi / 2), bevel=0.005)
        for dx in (-(w + 0.5) / 2, (w + 0.5) / 2):
            f.cyl(0.018, 0.4, (x + dx, top - 0.14, 0.21), IRON, sides=5, rotation=(0.52 + math.pi / 2, 0, 0), bevel=0)
    flower_box(f, x, y - h / 2 - 0.36, w * 0.72, 0.36, seed)


# ── Rótulo y farol ───────────────────────────────────────────────────────────
def sign_board(f, x, y, w, name="sign", tilt=-0.2, z=0.24):
    """Tabla de rótulo colgada de dos pletinas, algo inclinada hacia quien mira desde arriba.
    El texto lo pone el juego en el ancla (proporción 4:1)."""
    h = w / 4
    rot = (tilt, 0, 0)
    f.box((w + 0.24, h + 0.2, 0.1), (x, y, z), (WOOD["mid"], WOOD["pale"]), rotation=rot, bevel=0.045, vary=0.04)
    for dy in (-(h / 2 + 0.07), h / 2 + 0.07):
        f.box((w + 0.32, 0.075, 0.13), (x, y + dy * math.cos(tilt), z + dy * math.sin(tilt)), (WOOD["dark"], shade(WOOD["dark"], 0.12)), rotation=rot, bevel=0.025)
    for dx in (-(w / 2 + 0.16), w / 2 + 0.16):
        f.box((0.075, h + 0.27, 0.13), (x + dx, y, z), (WOOD["dark"], shade(WOOD["dark"], 0.12)), rotation=rot, bevel=0.025)
        f.ball(0.04, (x + dx, y, z + 0.075), "#55504c")
    for dx in (-w * 0.32, w * 0.32):
        f.box((0.055, 0.055, z + 0.08), (x + dx, y + h / 2 + 0.3, z / 2 - 0.02), IRON, bevel=0.01)
        f.box((0.04, 0.04, z * 0.7), (x + dx, y + h / 2 + 0.12, z * 0.3), IRON, rotation=(-0.6, 0, 0), bevel=0.008)
        f.box((0.035, 0.3, 0.035), (x + dx, y + h / 2 + 0.17, z - 0.03), IRON, bevel=0.008)
    f.anchor(name, (x, y - math.sin(tilt) * 0.056, z + math.cos(tilt) * 0.056), rotation=rot, size=(w, h, 1))


def wall_lantern(f, x, y, name="lantern", reach=0.46):
    """Farol colgado de un brazo de hierro. El cristal lo pone el juego en el ancla."""
    f.box((0.07, 0.34, 0.05), (x, y + 0.02, 0.03), IRON, bevel=0.012)
    f.box((0.045, 0.045, reach), (x, y + 0.16, reach / 2), IRON, bevel=0.01)
    f.box((0.035, 0.035, reach * 0.75), (x, y + 0.02, reach * 0.34), IRON, rotation=(-0.62, 0, 0), bevel=0.008)
    f.cyl(0.012, 0.12, (x, y + 0.08, reach - 0.04), IRON, sides=4, bevel=0)
    top = y + 0.02
    f.cyl(0.17, 0.12, (x, top - 0.04, reach - 0.04), ("#4a4541", "#6a635d"), top=0.04, sides=4, rotation=(0, math.pi / 4, 0), bevel=0.01)
    f.box((0.24, 0.035, 0.24), (x, top - 0.11, reach - 0.04), IRON, bevel=0.01)
    for dx in (-0.095, 0.095):
        for dz in (-0.095, 0.095):
            f.box((0.025, 0.3, 0.025), (x + dx, top - 0.27, reach - 0.04 + dz), IRON, bevel=0)
    f.box((0.24, 0.04, 0.24), (x, top - 0.43, reach - 0.04), IRON, bevel=0.01)
    f.ball(0.03, (x, top - 0.47, reach - 0.04), IRON)
    f.anchor(name, (x, top - 0.27, reach - 0.04), size=(0.17, 0.27, 0.17))


# ── Chimenea ─────────────────────────────────────────────────────────────────
def chimney(m, x, z, base_y, top_y, name="smoke"):
    rnd = m.random
    courses = max(3, round((top_y - base_y) / 0.34))
    step = (top_y - base_y) / courses
    for i in range(courses):
        w = 0.62 - 0.035 * i
        for side, (dx, dz, sw, sd) in enumerate(((0, 0, w, w),)):
            tone = STONES[(i * 2 + side) % len(STONES)]
            m.box((sw, step - 0.012, sd), (x + dx, base_y + step * (i + 0.5), z + dz), (shade(tone, -0.1), shade(tone, 0.08)), rotation=(0, rnd.uniform(-0.05, 0.05), 0), bevel=0.05, vary=0.07, jitter=0.008)
    m.box((0.74, 0.11, 0.74), (x, top_y + 0.05, z), (STONE["dark"], STONE["mid"]), bevel=0.035)
    m.cyl(0.15, 0.3, (x, top_y + 0.25, z), ("#a85a3a", "#cf7f55"), top=0.12, sides=8, bevel=0.025)
    m.cyl(0.165, 0.05, (x, top_y + 0.4, z), "#8f4a30", sides=8, bevel=0.015)
    m.anchor(name, (x, top_y + 0.5, z))


# ── Atrezo ───────────────────────────────────────────────────────────────────
def barrel(m, x, z, y=0.0, scale=1.0):
    s = scale
    m.lathe([(0.0, 0.0), (0.27 * s, 0.0), (0.33 * s, 0.22 * s), (0.35 * s, 0.42 * s), (0.33 * s, 0.62 * s), (0.27 * s, 0.84 * s), (0.22 * s, 0.84 * s), (0.22 * s, 0.8 * s), (0.0, 0.8 * s)], (x, y, z), (WOOD["mid"], WOOD["light"]), sides=10, vary=0.09)
    for h in (0.16, 0.68):
        m.cyl(0.325 * s, 0.05 * s, (x, y + h * s, z), "#55504c", sides=10, bevel=0.01)


def crate(m, x, z, size=0.6, y=0.0, turn=0.2):
    f = Face(m, (x, y, z), turn)
    f.box((size, size, size), (0, size / 2, 0), (WOOD["mid"], WOOD["pale"]), bevel=0.02, vary=0.08)
    e = size / 2
    for dx in (-e, e):
        for dz in (-e, e):
            f.box((0.08, size + 0.03, 0.08), (dx * 0.96, size / 2, dz * 0.96), WOOD["dark"], bevel=0.015)
    for dy in (0.05, size - 0.05):
        f.box((size + 0.03, 0.07, 0.05), (0, dy, e), WOOD["dark"], bevel=0.012)


def log_pile(m, x, z, turn=0.0, rows=3):
    f = Face(m, (x, 0, z), turn)
    rnd = m.random
    for row in range(rows):
        n = rows - row
        for i in range(n + 1):
            f.cyl(0.11, 0.62 + rnd.uniform(-0.05, 0.05), ((i - n / 2) * 0.225, 0.11 + row * 0.195, rnd.uniform(-0.03, 0.03)), (WOOD["mid"], WOOD["pale"]), sides=7, rotation=(math.pi / 2, 0, 0), bevel=0.02, vary=0.1)


def potted_plant(m, x, z, y=0.0, scale=1.0, seed=0):
    s = scale
    m.cyl(0.17 * s, 0.26 * s, (x, y + 0.13 * s, z), ("#a85a3a", "#cf7f55"), top=0.21 * s, sides=8, bevel=0.02)
    m.cyl(0.225 * s, 0.05 * s, (x, y + 0.26 * s, z), "#b9694a", sides=8, bevel=0.012)
    leaf = LEAVES[seed % len(LEAVES)]
    for i in range(4):
        a = i * 1.7 + seed
        m.ball(0.15 * s, (x + math.cos(a) * 0.07 * s, y + (0.4 + 0.08 * (i % 2)) * s, z + math.sin(a) * 0.07 * s), leaf, detail=1, scale=(1, 0.85, 1), jitter=0.18)
    m.ball(0.06 * s, (x + 0.05 * s, y + 0.58 * s, z + 0.05 * s), FLOWERS[seed % len(FLOWERS)])
