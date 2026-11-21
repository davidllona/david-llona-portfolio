# Máquinas, antena, cristales y coral de The Cosmic Lab (mundo 3): convierte los
# modelos descargados (assets-externos/mundo3/, ver docs/CREDITOS.md) en GLB pequeños.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/cosmic.py            # todos
#   … -- mirar        solo imprime qué trae cada uno (mallas, triángulos, medidas, materiales)
#   … -- antena       solo ese
#
# El mismo proceso que tools/assets/twisted.py (mundo 2): de cada modelo sale
# una sola malla, sin materiales ni texturas, con el color en los vértices,
# plano por cara; reducida a su presupuesto de triángulos, apoyada en el suelo,
# centrada en planta y con el lado mayor en planta = 1. Aquí los colores no se
# leen de las texturas: cada modelo se repinta a la paleta del mundo (carcasas
# crema lila, metal violeta, luces lima, turquesa y magenta), cara a cara.
import bpy, os, sys
import numpy as np
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "mundo3")
OUT = os.path.join(ROOT, "public", "models", "cosmic")
LAB = "futuristic-research-lab-equipment-collection/"
# nombre → (archivo, triángulos)
MODELS = {
    "consola": (LAB + "[BLEND] sci_fi_control_panel/sci_fi_control_panel.blend", 2600),
    "consola-doble": (LAB + "[BLEND] sci_fi_control_panel_v2/sci_fi_control_panel_v2.blend", 2600),
    "escaner": (LAB + "[BLEND] sci_fi_medical_scanner/sci_fi_medical_scanner.blend", 3600),
    "capsula": (LAB + "[BLEND] sci_fi_speciman_container_full/sci_fi_speciman_container_full.blend", 3000),
    "antena": ("cartoon-satellite-dish-with-waves/[8] Satellite Dish Icon.obj", 5600),
    "cristal": ("purple-crystal-cluster-resource/Diamond.obj", 900),
    "coral": ("coral-reef/Coral Reef.glb", 1900),
}
TEXTURES = {}
# Piezas que se quitan (por nombre de objeto o de material, en minúsculas). De la cápsula, la figura de
# dentro y el cristal (opaco, taparía el líquido); del coral, las piedras de su peana; de la antena, las ondas.
DROP = {"capsula": ("alien", "glass"), "antena": ("sphere_sphere.004",), "coral": ("cylinder",)}
GLASS = (1.0, 0.82, 0.5)
REPAINT = {}
RETAG = {}


def lin(hex_colour):
    # Color sRGB "#rrggbb" → lineal (los colores de vértice van en lineal).
    out = []
    for i in (1, 3, 5):
        c = int(hex_colour[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


# La paleta del mundo (worlds/cosmic/models.js). Lo que emite luz va en uno de
# estos tres colores vivos: el juego lo reconoce por el color y lo enciende.
SHELL_L, SHELL_M, SHELL_D = lin("#fffaf2"), lin("#e4dcf0"), lin("#b3a6c9")
METAL_D, METAL_M, METAL_L = lin("#33285a"), lin("#55468a"), lin("#7a69b8")
LIME, TURQ, MAGENTA = lin("#d8ff5c"), lin("#62f6e6"), lin("#ff4fb0")
PANE, ROSE, PILLOW = lin("#7fc4cc"), lin("#c13fa6"), lin("#c98ae6")


def shell(polygon, top, foot=0.1):
    # Carcasa: zócalo de metal, caras de arriba claras, el resto crema lila (alguna cara, un tono más oscuro).
    z = polygon.center.z / top
    if z < foot:
        return METAL_M
    if polygon.normal.z > 0.55:
        return SHELL_L
    return SHELL_D if polygon.index % 6 == 0 else SHELL_M


# Cada cara, según su material y la pieza de la que viene («material@pieza», en minúsculas).
def paint_console(polygon, material, top):
    if "emissive" in material:
        return LIME if "button" in material else TURQ
    if "keyboard" in material:
        return METAL_M
    if "monitor" in material or "connector" in material or "stand" in material:
        return METAL_D
    if "button" in material:
        return METAL_L
    return shell(polygon, top)


def paint_scanner(polygon, material, top):
    if "glass_light" in material:
        return TURQ
    if "bay_glass" in material:
        return PANE
    if "mattress" in material:
        return PILLOW
    if "wires" in material or "monitor" in material:
        return METAL_D
    if "track" in material or "wedge" in material or "bed_base" in material:
        return METAL_M
    return shell(polygon, top, 0.04)


def paint_capsule(polygon, material, top):
    if "liquid" in material:
        return LIME
    if "tubes" in material:
        return METAL_M
    if "sides" in material:
        return METAL_L
    if "inside" in material:
        return METAL_D
    return shell(polygon, top, 0.05)


def paint_dish(polygon, material, top):
    if material.startswith("01."):
        return MAGENTA
    if material.startswith("10."):
        return METAL_M
    if material.startswith("04."):
        return ROSE
    return SHELL_L if polygon.normal.z > 0.3 else SHELL_M


def paint_pale(polygon, material, top):
    # En gris claro, más oscuro abajo: cada copia se tiñe en el juego con su color.
    z = max(0.0, min(1.0, polygon.center.z / top))
    tone = 0.3 + 0.62 * z
    if "ungu" in material:
        tone *= 0.8
    return (tone, tone, tone * 1.04)


PAINTERS = {"consola": paint_console, "consola-doble": paint_console, "escaner": paint_scanner, "capsula": paint_capsule, "antena": paint_dish, "cristal": paint_pale, "coral": paint_pale}
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
        for slot in thing.material_slots:
            tagged = bpy.data.materials.new(f"{slot.material.name if slot.material else 'nada'}@{thing.name}".lower())
            slot.material = tagged
        if not thing.material_slots:
            thing.data.materials.append(bpy.data.materials.new(f"nada@{thing.name}".lower()))
        for (model, piece), tag in RETAG.items():
            if model == name and piece in thing.name.lower():
                # (Solo lo que no es cristal: lo emisivo se queda como está.)
                own = bpy.data.materials.get(tag) or bpy.data.materials.new(tag)
                thing.data = thing.data.copy()
                slots = [slot.material.name if slot.material else "" for slot in thing.material_slots]
                thing.data.materials.append(own)
                index = len(thing.data.materials) - 1
                for polygon in thing.data.polygons:
                    if "emmisive" not in slots[min(polygon.material_index, len(slots) - 1)]:
                        polygon.material_index = index
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
    painter = PAINTERS.get(name)
    top = max(v.co.z for v in mesh.vertices) or 1
    names = [slot.material.name if slot.material else "" for slot in whole.material_slots] or [""]
    for polygon in mesh.polygons:
        kind, value = sources[min(polygon.material_index, len(sources) - 1)]
        if painter:
            tone = painter(polygon, names[min(polygon.material_index, len(names) - 1)], top)
        elif kind == "textura" and uv:
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
    print(f"[mundo 3] {name}: {before} → {triangles(whole.data)} triángulos · medidas con el lado mayor = 1: ancho {size[0]:.2f}, fondo {size[1]:.2f}, alto {size[2]:.2f} · lado original {side:.2f} · {os.path.getsize(path) / 1024:.0f} kB")
