# Canasta de la pista: convierte «Basketball 3D Icons» (assets-externos/modelos/,
# ver docs/CREDITOS.md) en un GLB pequeño.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/hoop.py
#
# El original es un icono: una peana con un trozo de pista, el poste, el
# tablero, el aro, la red y un balón (107.000 triángulos; el balón solo, 80.000).
# Aquí se quitan el balón y la peana (la pista y el balón ya son los del juego),
# se reduce lo demás y se pasa el color de cada material a color de vértice, con
# la gama del planeta. Salen dos mallas:
#  · «aro»: poste, soporte, tablero y aro;
#  · «red»: la red, aparte, para que el juego pueda moverla.
# Todo queda medido desde el centro del aro, con el aro de radio 1 y el poste
# alargado hasta el suelo: el juego lo escala al radio de su aro y lo cuelga a
# su altura.
import bpy, os, sys
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "modelos", "basketball-3d-icons", "05_Basketball.glb")
OUT = os.path.join(ROOT, "public", "models", "living", "court", "canasta.glb")
RIM_HEIGHT = 3.0 / 0.37  # altura del aro en el juego, en radios de aro
BUDGET = {"red": 700, "aro": 1500}
# Color de cada material del original → gama del planeta.
PAINT = {
    "white": (0.93, 0.92, 0.88),
    "black": (0.09, 0.09, 0.11),
    "abutua": (0.11, 0.11, 0.13),
    "abumuda": (0.42, 0.45, 0.5),
    "Material.007": (0.86, 0.2, 0.05),
    "silver": (0.5, 0.52, 0.56),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SOURCE)
meshes = {o.name: o for o in bpy.context.scene.objects if o.type == "MESH"}
keep = {"red": ["Cylinder.022"], "aro": ["Cylinder.021", "Cube.030", "Cube.029", "Cube.028", "Cube.027", "Cube.026", "Cylinder", "Cylinder.002"]}
for name, thing in meshes.items():
    if not any(name in names for names in keep.values()):
        bpy.data.objects.remove(thing, do_unlink=True)

rim = meshes["Cylinder.021"]
box = [rim.matrix_world @ Vector(corner) for corner in rim.bound_box]
centre = sum(box, Vector()) / 8
radius = (max(v.x for v in box) - min(v.x for v in box)) / 2
print(f"[canasta] aro del original: centro {tuple(round(v, 3) for v in centre)}, radio {radius:.3f}")


def paint(thing):
    mesh = thing.data
    layer = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for polygon in mesh.polygons:
        slot = thing.material_slots[polygon.material_index].material if thing.material_slots else None
        name = slot.name if slot else ""
        tone = next((value for key, value in PAINT.items() if name.startswith(key)), (0.6, 0.6, 0.6))
        for loop in polygon.loop_indices:
            layer.data[loop].color = (*tone, 1)
    mesh.materials.clear()


results = []
for part, names in keep.items():
    things = [meshes[name] for name in names]
    for thing in things:
        paint(thing)
    bpy.ops.object.select_all(action="DESELECT")
    for thing in things:
        thing.select_set(True)
    bpy.context.view_layer.objects.active = things[0]
    if len(things) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = part
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # Al centro del aro y con el aro de radio 1.
    for vertex in joined.data.vertices:
        vertex.co = (vertex.co - centre) / radius
    if part == "aro":
        # El poste, hasta el suelo: lo más bajo del conjunto se estira hacia abajo.
        low = min(v.co.z for v in joined.data.vertices)
        for vertex in joined.data.vertices:
            if vertex.co.z < low + 0.05:
                vertex.co.z = -RIM_HEIGHT
    before = sum(len(p.vertices) - 2 for p in joined.data.polygons)
    if before > BUDGET[part]:
        modifier = joined.modifiers.new("reducir", "DECIMATE")
        modifier.ratio = BUDGET[part] / before
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = sum(len(p.vertices) - 2 for p in joined.data.polygons)
    xs = [v.co.x for v in joined.data.vertices]; ys = [v.co.y for v in joined.data.vertices]; zs = [v.co.z for v in joined.data.vertices]
    print(f"[canasta] {part}: {before} → {after} triángulos · x {min(xs):.2f}…{max(xs):.2f} · y {min(ys):.2f}…{max(ys):.2f} · alto {min(zs):.2f}…{max(zs):.2f} (en radios de aro; Blender: z arriba)")
    results.append(joined)

bpy.ops.object.select_all(action="DESELECT")
for thing in results:
    thing.select_set(True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
options = dict(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_apply=True, export_animations=False, export_materials="NONE", export_normals=False, export_texcoords=False)
for extra in (dict(export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True), dict(export_vertex_color="ACTIVE"), dict(export_colors=True), {}):
    try:
        bpy.ops.export_scene.gltf(**options, **extra)
        break
    except TypeError:
        continue
print(f"[canasta] {OUT}: {os.path.getsize(OUT) / 1024:.0f} kB")
