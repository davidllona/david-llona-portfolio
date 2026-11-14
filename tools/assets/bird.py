# Pájaro del planeta: convierte «Animated Bluebird with Feathery Wings»
# (assets-externos/modelos/, ver docs/CREDITOS.md) en un GLB pequeño.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/bird.py
#
# El original es una malla de 3.642 caras con un esqueleto de 354 huesos y
# texturas de 4K. (Los FBX del paquete solo traen el esqueleto al importarlos
# en Blender 5: se parte del .blend.) Aquí:
#  · se reduce a unos cientos de triángulos;
#  · el color sale de la textura, pero plano: un tono por cara, de una paleta
#    corta (se guarda como color de vértice; no se distribuye ninguna textura);
#  · el aleteo del original se conserva sin esqueleto: se toman cuatro posturas
#    del ciclo de vuelo (`anim_Flight`) y una del pájaro posado (`anim_Idle`) y
#    se guardan como «shape keys». El juego mezcla esas posturas en la GPU, así
#    que una bandada entera es una sola malla con instancias.
import bpy, sys, os
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "modelos", "animated-bluebird-with-feathery-wings")
BLEND = os.path.join(SOURCE, "[BLEND] cartoon_bluebird_animated", "cartoon_bluebird_animated.blend")
TEXTURE = os.path.join(SOURCE, "[OBJ] cartoon_bluebird_animated", "CartoonBluebird_BaseColor.png")
OUT = os.path.join(ROOT, "public", "models", "living", "fauna", "pajaro.glb")
TRIANGLES = 720
LENGTH = 0.36  # metros de pico a cola, ya en el juego
TONES = 7  # colores de la paleta

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
bird = bpy.data.objects["robin.001"]
rig = bpy.data.objects["rig"]

# ── Reducir ──────────────────────────────────────────────────────────────────
for modifier in list(bird.modifiers):
    if modifier.type != "ARMATURE":
        bird.modifiers.remove(modifier)
bpy.context.view_layer.objects.active = bird
bird.select_set(True)
before = sum(len(p.vertices) - 2 for p in bird.data.polygons)
decimate = bird.modifiers.new("reducir", "DECIMATE")
decimate.ratio = TRIANGLES / before
decimate.use_collapse_triangulate = True
while bird.modifiers[0] != decimate:
    bpy.ops.object.modifier_move_up(modifier=decimate.name)
bpy.ops.object.modifier_apply(modifier=decimate.name)
mesh = bird.data
mesh.calc_loop_triangles()
triangles = np.array([t.vertices[:] for t in mesh.loop_triangles], dtype=np.int32)
tri_loops = np.array([t.loops[:] for t in mesh.loop_triangles], dtype=np.int32)
print(f"[pájaro] {before} → {len(triangles)} triángulos, {len(mesh.vertices)} vértices")

# ── Color plano por cara, de la textura ──────────────────────────────────────
image = bpy.data.images.load(TEXTURE)
w, h = image.size
pixels = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, :3]
uv = np.array([l.uv[:] for l in mesh.uv_layers.active.data], dtype=np.float32)
face = []
for loops in tri_loops:
    centre = uv[loops].mean(axis=0)
    # Media de una ventana alrededor del centro de la cara: el tono, sin el grano.
    x, y = int(centre[0] % 1 * (w - 1)), int(centre[1] % 1 * (h - 1))
    r = 14
    face.append(pixels[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].reshape(-1, 3).mean(axis=0))
face = np.array(face)
# Paleta corta por k-medias (semilla fija: sale siempre igual).
rng = np.random.default_rng(7)
centres = face[rng.choice(len(face), TONES, replace=False)]
for _ in range(40):
    nearest = np.argmin(((face[:, None, :] - centres[None, :, :]) ** 2).sum(axis=2), axis=1)
    for k in range(TONES):
        if (nearest == k).any():
            centres[k] = face[nearest == k].mean(axis=0)
# Algo más vivos: se separan del gris.
grey = centres.mean(axis=1, keepdims=True)
palette = np.clip(grey + (centres - grey) * 1.25, 0, 1)
flat = palette[nearest]
print("[pájaro] paleta:", ["#%02x%02x%02x" % tuple(int(round(v ** (1 / 2.2) * 255)) for v in tone) for tone in palette])


# ── Posturas ─────────────────────────────────────────────────────────────────
def pose(action_name, frame):
    action = bpy.data.actions[action_name]
    rig.animation_data.action = action
    # Blender 4.4+: la acción va por «slots».
    if hasattr(rig.animation_data, "action_slot") and getattr(action, "slots", None):
        rig.animation_data.action_slot = action.slots[0]
    scene.frame_set(int(frame), subframe=frame - int(frame))
    evaluated = bird.evaluated_get(bpy.context.evaluated_depsgraph_get())
    data = evaluated.to_mesh()
    assert len(data.vertices) == len(mesh.vertices), "la malla cambia de vértices al deformarse"
    points = np.array([(evaluated.matrix_world @ v.co)[:] for v in data.vertices], dtype=np.float64)
    evaluated.to_mesh_clear()
    return points


start, end = bpy.data.actions["anim_Flight"].frame_range
cycle = end - start
flight = [pose("anim_Flight", start + cycle * k / 4) for k in range(4)]
perch = pose("anim_Idle", 20)

# El cuerpo, al centro; la escala, la del juego. (El eje largo del cuerpo
# posado es el de pico a cola.)
spans = perch.max(axis=0) - perch.min(axis=0)
long_axis = int(np.argmax(spans[:2]))
scale = LENGTH / spans[long_axis]
body = np.mean([p.mean(axis=0) for p in flight], axis=0)
flight = [(p - body) * scale for p in flight]
foot = np.array([perch[:, 0].mean(), perch[:, 1].mean(), perch[:, 2].min()])
perch = (perch - foot) * scale
print("[pájaro] medidas posado (m):", np.round(spans * scale, 3), "· en vuelo:", np.round((flight[0].max(axis=0) - flight[0].min(axis=0)), 3), "· eje largo:", "xy"[long_axis])
# Hacia dónde mira: el pico es lo que más sobresale del centro por el eje largo, arriba.
head = perch[perch[:, 2] > np.percentile(perch[:, 2], 85)]
print("[pájaro] la cabeza cae hacia", "+" if head[:, long_axis].mean() > perch[:, long_axis].mean() else "-", "xy"[long_axis])

# ── Malla nueva, sin esqueleto, con las posturas como shape keys ─────────────
out = bpy.data.meshes.new("pajaro")
out.from_pydata(flight[0].tolist(), [], triangles.tolist())
out.update()
layer = out.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
for polygon in out.polygons:
    for loop in polygon.loop_indices:
        layer.data[loop].color = (*flat[polygon.index], 1)
thing = bpy.data.objects.new("pajaro", out)
scene.collection.objects.link(thing)
thing.shape_key_add(name="vuelo0", from_mix=False)
for name, points in (("vuelo1", flight[1]), ("vuelo2", flight[2]), ("vuelo3", flight[3]), ("posado", perch)):
    key = thing.shape_key_add(name=name, from_mix=False)
    for i, point in enumerate(points):
        key.data[i].co = point

for other in scene.objects:
    other.select_set(other == thing)
bpy.context.view_layer.objects.active = thing
os.makedirs(os.path.dirname(OUT), exist_ok=True)
options = dict(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_apply=False, export_animations=False, export_materials="NONE", export_normals=False, export_texcoords=False, export_morph=True, export_morph_normal=False)
for extra in (dict(export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True), dict(export_vertex_color="ACTIVE"), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(**options, **extra)
        break
    except TypeError:
        continue
print(f"[pájaro] {OUT}: {os.path.getsize(OUT) / 1024:.0f} kB")
