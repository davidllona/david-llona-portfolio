# Edificios y plantas de The Twisted Moon (mundo 2): convierte los modelos
# descargados (assets-externos/mundo2/, ver docs/CREDITOS.md) en GLB pequeños.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/twisted.py            # todos
#   … -- mirar        solo imprime qué trae cada uno (mallas, triángulos, medidas, materiales)
#   … -- torre        solo ese
#
# Igual que tools/assets/buildings.py (mundo 1): de cada modelo sale una sola
# malla, sin materiales ni texturas, con el color en los vértices, plano por
# cara; reducida a su presupuesto de triángulos, apoyada en el suelo (y = 0),
# centrada en planta y con el lado mayor en planta = 1 (el juego le da el
# tamaño). La diferencia: estos modelos vienen con textura, así que el color de
# cada cara se lee de la textura en el centro de la cara (ninguna textura se
# distribuye). El paso a la paleta de noche lo hace el juego.
import bpy, os, sys
import numpy as np
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "mundo2")
OUT = os.path.join(ROOT, "public", "models", "twisted")
# nombre → (archivo, triángulos)
MODELS = {
    "torre": ("big-ben-landmark-clock-tower/1.gltf", 7600),
    "invernadero": ("greenhouse/Green House.glb", 5000),
    "casa-tronco": ("stylized-treehouse-cottage/[FBX] House FBX/House FBX.FBX", 3600),
    # (Los FBX de estos dos vienen en texto, que Blender no lee: se parte del .blend.)
    "casita": ("whimsical-toon-cottage-with-stone-roof/[BLEND] cartoon_house_v2/cartoon_house_v2.blend", 5000),
    "helecho": ("stylized-fern-plant/[BLEND] carton_fern/carton_fern.blend", 1400),
}
# Textura de color que se carga a mano (el .blend la busca donde no está).
TEXTURES = {"casita": "whimsical-toon-cottage-with-stone-roof/[FBX] cartoon_house_v2/cartoon_house_v2_Base_Color.jpg"}
# Piezas que se quitan (por nombre de objeto o de material, en minúsculas): peanas y suelos.
DROP = {"torre": ("plane.004", "cube.009"), "casa-tronco": ("house_base",), "casita": ("_ground",)}
# Lo que es cristal o luz en el original se pinta de este color exacto, y el juego lo enciende.
GLASS = (1.0, 0.82, 0.5)
# Colores que se cambian a mano: (modelo, material) → color.
# La torre viene en naranjas de juguete: aquí es de piedra morada, con el tejado
# oscuro, los remates dorados y la esfera encendida.
REPAINT = {
    ("torre", "1. Orange"): (0.42, 0.36, 0.62),
    ("torre", "2. Brown"): (0.16, 0.13, 0.28),
    ("torre", "3. Light Brown"): (0.3, 0.25, 0.47),
    ("torre", "4. Yellow"): (0.72, 0.5, 0.24),
    ("torre", "5. Black"): (0.05, 0.045, 0.08),
    ("torre", "6. White"): GLASS,
    ("casita", "cartoon_house_v2_emmisive"): GLASS,
}
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
look = "mirar" in args
wanted = [a for a in args if a in MODELS] or list(MODELS)


def load(path):
    lower = path.lower()
    if lower.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=path)
        return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render and o.visible_get()]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if lower.endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=path)
    elif lower.endswith(".obj"):
        bpy.ops.wm.obj_import(filepath=path)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render]


def triangles(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


pixels_of = {}


def image_pixels(image):
    # Los píxeles de una textura, en lineal, como matriz alto × ancho × 3 (o None si no se puede leer).
    if image.name not in pixels_of:
        try:
            w, h = image.size
            if w * h == 0:
                raise ValueError
            # (A 256 de lado sobra: solo se lee un color por cara.)
            if max(w, h) > 256:
                image.scale(256, 256)
                w, h = image.size
            data = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, image.channels)[:, :, :3]
            pixels_of[image.name] = data
        except Exception:
            pixels_of[image.name] = None
    return pixels_of[image.name]


def material_source(material):
    # De dónde sale el color de un material: ("color", rgb) o ("textura", imagen).
    if material is None:
        return ("color", (0.6, 0.6, 0.6))
    if (current, material.name) in REPAINT:
        return ("color", REPAINT[(current, material.name)])
    if material.use_nodes and material.node_tree:
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                socket = node.inputs.get("Base Color")
                if socket.is_linked:
                    source = socket.links[0].from_node
                    if source.type == "TEX_IMAGE" and source.image and image_pixels(source.image) is not None:
                        return ("textura", source.image)
                # (Hay archivos que traen la textura de color sin enchufar al material, o apuntando a donde no está.)
                if current in TEXTURES:
                    image = bpy.data.images.load(os.path.join(SOURCE, TEXTURES[current]), check_existing=True)
                    if image_pixels(image) is not None:
                        return ("textura", image)
                return ("color", tuple(socket.default_value[:3]))
    return ("color", tuple(material.diffuse_color[:3]))


current = None
for name in wanted:
    current = name
    pixels_of.clear()
    file, budget = MODELS[name]
    things = load(os.path.join(SOURCE, file))
    dropped = DROP.get(name, ())
    things = [o for o in things if not any(key in o.name.lower() or any(slot.material and key in slot.material.name.lower() for slot in o.material_slots) for key in dropped)]
    if look:
        total = sum(triangles(o.data) for o in things)
        low = [min((o.matrix_world @ Vector(c))[k] for o in things for c in o.bound_box) for k in range(3)]
        high = [max((o.matrix_world @ Vector(c))[k] for o in things for c in o.bound_box) for k in range(3)]
        print(f"== {name}: {len(things)} mallas, {total} triángulos, medidas {[round(h - l, 2) for l, h in zip(low, high)]} (x, y, alto)")
        for o in things[:60]:
            b = [o.matrix_world @ Vector(c) for c in o.bound_box]
            size = [round(max(p[k] for p in b) - min(p[k] for p in b), 2) for k in range(3)]
            mats = [(slot.material.name, material_source(slot.material)[0], (tuple(round(c, 2) for c in material_source(slot.material)[1]) if material_source(slot.material)[0] == "color" else material_source(slot.material)[1].name)) for slot in o.material_slots if slot.material]
            print(f"     {o.name}: {triangles(o.data)} tri, {size}, z de {round(min(p[2] for p in b), 2)} · {mats[:4]}")
        print(f"     imágenes: {[(i.name, tuple(i.size)) for i in bpy.data.images][:8]}")
        continue

    # ── Unir ──
    for thing in things:
        if thing.data.users > 1:
            thing.data = thing.data.copy()
        bpy.context.view_layer.objects.active = thing
        for modifier in list(thing.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError:
                thing.modifiers.remove(modifier)
    bpy.ops.object.select_all(action="DESELECT")
    for thing in things:
        thing.select_set(True)
    bpy.context.view_layer.objects.active = things[0]
    if len(things) > 1:
        bpy.ops.object.join()
    whole = bpy.context.view_layer.objects.active
    whole.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh = whole.data
    before = triangles(mesh)

    # ── Pintar: el color de cada cara (de su material, o de su textura en el centro de la cara) ──
    sources = [material_source(slot.material) for slot in whole.material_slots] or [("color", (0.6, 0.6, 0.6))]
    uv = mesh.uv_layers.active
    for attribute in list(mesh.color_attributes):
        mesh.color_attributes.remove(attribute)
    layer = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    for polygon in mesh.polygons:
        kind, value = sources[min(polygon.material_index, len(sources) - 1)]
        if kind == "textura" and uv:
            data = image_pixels(value)
            u = sum(uv.data[i].uv[0] for i in polygon.loop_indices) / polygon.loop_total
            v = sum(uv.data[i].uv[1] for i in polygon.loop_indices) / polygon.loop_total
            h, w = data.shape[:2]
            tone = tuple(float(c) for c in data[int((v % 1) * (h - 1)), int((u % 1) * (w - 1))])
        else:
            tone = value if kind == "color" else (0.6, 0.6, 0.6)
        for loop in polygon.loop_indices:
            layer.data[loop].color = (*tone, 1)
    mesh.materials.clear()

    # ── Reducir (con los colores ya en los vértices: la reducción los conserva) ──
    if before > budget:
        import bmesh
        soup = bmesh.new()
        soup.from_mesh(mesh)
        bmesh.ops.remove_doubles(soup, verts=soup.verts, dist=0.0005)
        soup.to_mesh(mesh)
        soup.free()
        tri = whole.modifiers.new("triangular", "TRIANGULATE")
        bpy.ops.object.modifier_apply(modifier=tri.name)
        middle = triangles(mesh)
        modifier = whole.modifiers.new("reducir", "DECIMATE")
        modifier.ratio = budget / middle
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    # ── Al suelo, centrado y con el lado mayor en planta = 1 ──
    points = np.array([v.co[:] for v in whole.data.vertices])
    low, high = points.min(axis=0), points.max(axis=0)
    side = max(high[0] - low[0], high[1] - low[1])
    centre = Vector(((low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]))
    for vertex in whole.data.vertices:
        vertex.co = (vertex.co - centre) / side
    size = (high - low) / side
    bpy.ops.object.select_all(action="DESELECT")
    whole.select_set(True)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".glb")
    options = dict(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True, export_animations=False, export_materials="NONE", export_normals=False, export_texcoords=False)
    for extra in (dict(export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True), dict(export_vertex_color="ACTIVE"), dict(export_colors=True), {}):
        try:
            bpy.ops.export_scene.gltf(**options, **extra)
            break
        except TypeError:
            continue
    print(f"[mundo 2] {name}: {before} → {triangles(whole.data)} triángulos · medidas con el lado mayor = 1: ancho {size[0]:.2f}, fondo {size[1]:.2f}, alto {size[2]:.2f} · lado original {side:.2f} · {os.path.getsize(path) / 1024:.0f} kB")
