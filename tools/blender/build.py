# Genera los edificios del Planeta 1 como GLB (public/models/living/).
#   blender -b -P tools/blender/build.py                 todos
#   blender -b -P tools/blender/build.py -- taller       solo ese
# En Windows, Blender no suele estar en el PATH:
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/blender/build.py
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from kit import Model, shade, tones  # noqa: E402
from parts import (  # noqa: E402
    IRON,
    PLASTER,
    STONE,
    WOOD,
    CurvedRoof,
    Face,
    arched_door,
    barrel,
    beam,
    chimney,
    crate,
    log_pile,
    potted_plant,
    round_window,
    shed_roof,
    shop_window,
    shutter_window,
    sign_board,
    stone_base,
    stone_steps,
    wall_lantern,
)

OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "models", "living"))


def taller(color="#c97a36"):
    """Taller del configurador: casa de hastial al frente con escaparate, y un
    cobertizo de trabajo adosado (banco, herramientas, engranaje)."""
    m = Model(seed=7)
    W, D, PLINTH, WALL = 4.4, 3.6, 0.5, 2.6
    half, front, back = W / 2, D / 2, -D / 2
    eave = PLINTH + WALL
    roof = CurvedRoof(half, eave, 2.0, over=0.5)

    stone_base(m, W, D, PLINTH)
    # Cuerpo con su hastial, de una pieza.
    m.prism(roof.outline(PLINTH - 0.02), D, (0, 0, 0), PLASTER, bevel=0.03, vary=0.035)
    roof.build(m, back - 0.32, front + 0.46, color)
    # Correas que asoman bajo el alero, delante y detrás.
    for x in (0, -half * 0.62, half * 0.62):
        m.box((0.15, 0.16, D + 0.62), (x, roof.y(x) - 0.2, 0.06), (WOOD["dark"], shade(WOOD["dark"], 0.12)), bevel=0.03)

    # ── Fachada ──
    f = Face(m, (0, 0, front), 0)
    for x in (-half + 0.08, half - 0.08):
        beam(f, (0.2, WALL + 0.06, 0.16), (x, PLINTH + WALL / 2, 0.03))
    beam(f, (W + 0.08, 0.2, 0.16), (0, eave - 0.02, 0.03))
    beam(f, (W + 0.08, 0.16, 0.14), (0, PLINTH + 0.08, 0.03))
    # Entramado del hastial: pendolón y dos tornapuntas.
    beam(f, (0.16, 1.5, 0.12), (0, eave + 0.8, 0.02))
    for side in (-1, 1):
        beam(f, (0.13, 1.25, 0.11), (side * 0.95, eave + 0.52, 0.02), rotation=(0, 0, side * 0.95))
        beam(f, (0.13, 0.62, 0.11), (side * (half - 0.36), eave - 0.4, 0.035), rotation=(0, 0, side * -0.78))
    round_window(f, 0, eave + 1.2, 0.27, name="glow_round")

    door_x, shop_x = -1.32, 0.72
    arched_door(f, door_x, PLINTH, 1.0, 2.05)
    stone_steps(f, door_x, 1.5, PLINTH / 2, 2)
    shop_window(f, shop_x, PLINTH + 1.36, 2.3, 1.0, color, seed=1)
    # El rótulo cuelga por delante del alero, de dos brazos de hierro: no lo corta el tejado.
    sign_board(f, 0.15, eave + 0.42, 2.3, tilt=-0.26, z=0.62)
    wall_lantern(f, -half + 0.08, PLINTH + 2.02)

    # ── Costado derecho (el que se ve desde la nave): ventana, leña y barril ──
    r = Face(m, (half, 0, 0), math.pi / 2)
    for x in (-front + 0.08, front - 0.08):
        beam(r, (0.2, WALL + 0.06, 0.16), (x, PLINTH + WALL / 2, 0.03))
    beam(r, (D + 0.08, 0.2, 0.16), (0, eave - 0.05, 0.03))
    beam(r, (D + 0.08, 0.16, 0.14), (0, PLINTH + 0.08, 0.03))
    beam(r, (0.14, WALL, 0.12), (0.95, PLINTH + WALL / 2, 0.02))
    shutter_window(r, -0.35, PLINTH + 1.5, 0.78, 0.95, name="glow_side", seed=2)
    log_pile(m, half + 0.42, -1.15, math.pi / 2)
    barrel(m, half + 0.5, 1.25)
    potted_plant(m, half + 0.38, 0.55, seed=1, scale=0.9)

    # ── Trasera y costado izquierdo: vigas, para que ninguna pared quede lisa ──
    b = Face(m, (0, 0, back), math.pi)
    for x in (-half + 0.08, 0, half - 0.08):
        beam(b, (0.2, WALL + 0.06, 0.16), (x, PLINTH + WALL / 2, 0.03))
    beam(b, (W + 0.08, 0.2, 0.16), (0, eave - 0.02, 0.03))
    shutter_window(b, 1.0, PLINTH + 1.5, 0.7, 0.9, name="glow_back", planter=False)
    round_window(b, 0, eave + 1.2, 0.27)
    left = Face(m, (-half, 0, 0), -math.pi / 2)
    for x in (-front + 0.08, front - 0.08):
        beam(left, (0.2, WALL + 0.06, 0.16), (x, PLINTH + WALL / 2, 0.03))
    beam(left, (D + 0.08, 0.2, 0.16), (0, eave - 0.05, 0.03))

    chimney(m, 1.2, -0.75, roof.y(1.2) - 0.25, roof.ridge_y + 0.45)

    # ── Cobertizo de trabajo, a la izquierda, abierto al frente ──
    sx0, sx1 = -half - 0.02, -half - 2.05
    sz0, sz1 = -0.95, front - 0.1
    m.box((sx0 - sx1 + 0.1, 0.16, sz1 - sz0 + 0.5), ((sx0 + sx1) / 2 - 0.05, 0.08, (sz0 + sz1) / 2 + 0.1), (STONE["mid"], STONE["light"]), bevel=0.05, jitter=0.006)
    shed_roof(m, sx0 + 0.05, sx1 - 0.35, PLINTH + 2.25, PLINTH + 1.55, sz0 - 0.25, sz1 + 0.4, color, rows=4)
    for z in (sz0, sz1):
        m.box((0.17, 1.95, 0.17), (sx1 + 0.1, 1.13, z), (WOOD["dark"], shade(WOOD["dark"], 0.14)), bevel=0.03)
        m.box((0.13, 0.7, 0.13), (sx1 + 0.38, 1.75, z), WOOD["dark"], rotation=(0, 0, -0.85), bevel=0.025)
        m.box((sx0 - sx1, 0.14, 0.14), ((sx0 + sx1) / 2, PLINTH + 1.75, z), WOOD["dark"], rotation=(0, 0, 0.33), bevel=0.025)
    m.box((0.15, 0.15, sz1 - sz0 + 0.5), (sx1 + 0.1, 2.08, (sz0 + sz1) / 2), WOOD["dark"], bevel=0.03)
    # Pared de tablas al fondo del cobertizo, con el tablero de herramientas.
    for i in range(6):
        x = sx1 + 0.22 + i * 0.31
        k = m.random.uniform(-0.08, 0.08)
        m.box((0.29, 1.75 + 0.07 * (i % 2), 0.07), (x, 1.04, sz0), (shade(WOOD["mid"], k), shade(WOOD["light"], k)), bevel=0.02)
    tools = Face(m, ((sx0 + sx1) / 2 + 0.1, 0, sz0 + 0.05), 0)
    tools.box((1.25, 0.7, 0.05), (0, 1.55, 0.02), (WOOD["pale"], "#f0d6a8"), bevel=0.02)
    tools.box((0.07, 0.5, 0.05), (-0.42, 1.55, 0.07), WOOD["dark"], bevel=0.012)  # martillo
    tools.box((0.26, 0.12, 0.09), (-0.42, 1.77, 0.07), "#6a6560", bevel=0.02)
    tools.box((0.05, 0.52, 0.03), (-0.1, 1.55, 0.06), "#8a8580", bevel=0.01)  # sierra
    tools.prism([(0, 0), (0.3, 0.06), (0.3, 0.2), (0, 0.16)], 0.02, (-0.06, 1.34, 0.07), "#b8b3ad", bevel=0.004)
    tools.cyl(0.13, 0.035, (0.36, 1.6, 0.07), "#8a8580", sides=10, rotation=(math.pi / 2, 0, 0), bevel=0.008)  # llave
    tools.box((0.06, 0.34, 0.03), (0.36, 1.38, 0.07), "#8a8580", bevel=0.01)
    # Banco de trabajo con tornillo y un tablón a medias.
    bench = Face(m, ((sx0 + sx1) / 2 + 0.05, 0.16, sz0 + 0.62), 0)
    bench.box((1.45, 0.11, 0.62), (0, 0.84, 0), (WOOD["mid"], WOOD["pale"]), bevel=0.03)
    for dx in (-0.62, 0.62):
        for dz in (-0.22, 0.22):
            bench.box((0.11, 0.8, 0.11), (dx, 0.4, dz), WOOD["dark"], bevel=0.02)
    bench.box((1.3, 0.07, 0.5), (0, 0.22, 0), (WOOD["dark"], WOOD["mid"]), bevel=0.02)
    bench.box((0.2, 0.16, 0.26), (0.52, 0.97, 0.2), "#6a6560", bevel=0.03)
    bench.cyl(0.02, 0.34, (0.52, 0.97, 0.38), IRON, sides=5, rotation=(0, 0, math.pi / 2), bevel=0)
    bench.box((0.85, 0.05, 0.2), (-0.2, 0.92, -0.05), ("#e3bc85", "#f0d6a8"), rotation=(0, 0.25, 0), bevel=0.012)
    # Engranaje apoyado en el poste: la seña del configurador.
    gear = Face(m, (sx1 + 0.45, 0.16, sz1 + 0.22), -0.35)
    cg = tones(color, -0.25, 0.1)
    gear.cyl(0.4, 0.12, (0, 0.5, 0), cg, sides=12, rotation=(math.pi / 2 - 0.22, 0, 0), bevel=0.025)
    gear.cyl(0.16, 0.16, (0, 0.5, 0.01), ("#55504c", "#77716b"), sides=8, rotation=(math.pi / 2 - 0.22, 0, 0), bevel=0.02)
    for i in range(8):
        a = i * math.tau / 8
        gear.box((0.17, 0.17, 0.11), (math.cos(a) * 0.45, 0.5 + math.sin(a) * 0.45 * math.cos(0.22), -math.sin(a) * 0.45 * math.sin(0.22)), cg, rotation=(-0.22, 0, a), bevel=0.025)
    crate(m, sx0 - 0.42, sz1 + 0.05, 0.55, y=0.16, turn=0.25)
    potted_plant(m, -0.4, front + 0.4, seed=2, scale=0.9)

    m.ground_shade(0.14, 0.6)
    return m


BUILDINGS = {"taller": taller}

if __name__ == "__main__":
    wanted = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else list(BUILDINGS)
    os.makedirs(OUT, exist_ok=True)
    for name in wanted:
        BUILDINGS[name]().export(os.path.join(OUT, f"{name}.glb"))
