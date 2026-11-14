# Edificios del planeta: convierte los modelos descargados (assets-externos/modelos/,
# ver docs/CREDITOS.md) en GLB pequeños.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/buildings.py            # todos
#   … -- mirar            solo imprime qué trae cada uno (mallas, triángulos, medidas, materiales)
#   … -- casa-campo       solo ese
#
# De cada modelo sale una sola malla, sin materiales ni texturas: el color de
# cada material (o el color medio de su textura) pasa a color de vértice, plano.
# Se reduce al presupuesto de triángulos de su ficha, se apoya en el suelo
# (y = 0), se centra en planta y se escala para que su lado mayor en planta
# mida 1: el juego le da el tamaño. Imprime las medidas finales.
import bpy, os, sys
import numpy as np
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SOURCE = os.path.join(ROOT, "assets-externos", "modelos")
OUT = os.path.join(ROOT, "public", "models", "living", "buildings")
# nombre → (archivo, triángulos)
MODELS = {
    "casa-campo": ("small-country-house-with-green-roof-and-fireplace/cottage house.blend", 5200),
    "casa-bosque": ("small-house-with-blue-roof/forest house.blend", 5200),
    "casa-roja": ("small-house-with-red-roof-and-chimney/red house.blend", 5200),
    "casa-balcones": ("compact-residence-with-dual-contemporary-balconies/red and blue house.blend", 5200),
    "casa-te": ("island-cabin-with-outdoor-seating/japanese house.blend", 5200),
    "casa-arbol": ("cartoon-treehouse-with-ladder-access/Treehouse.glb", 7000),
    "observatorio": ("small-observatory-with-telescope-dome/OBSERVATORY.glb", 6000),
    "trofeo": ("world-cup-trophy-football/World Cup Trophy.glb", 4500),
}
# Las casas vienen como dioramas: una peana de terreno con la casa, árboles y
# piedras encima. La peana y los árboles se quitan (el terreno y los árboles
# son los del planeta).
DIORAMAS = {"casa-campo", "casa-bosque", "casa-roja", "casa-balcones", "casa-te"}
# La casa del árbol trae un plano de suelo: fuera también (el árbol es parte del modelo y se queda).
GROUNDED = DIORAMAS | {"casa-arbol"}
# Formas redondas: sin la pasada de «caras en un mismo plano», que las deja a jirones.
ROUND = {"trofeo"}
TREES = ("daun", "kayu pohon")
# Lo que en el original no es un material de color (emisión, cristal) son las
# ventanas: se pintan de este color exacto, y el juego lo enciende de noche.
GLASS = (1.0, 0.82, 0.5)
# Colores que se cambian a mano: (modelo, material) → color.
REPAINT = {("trofeo", "body"): (0.92, 0.62, 0.12), ("trofeo", "Material.009"): (0.04, 0.3, 0.14), ("observatorio", "kaca.005"): GLASS, ("observatorio", "Material.003"): (0.93, 0.92, 0.88)}
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
look = "mirar" in args
wanted = [a for a in args if a in MODELS] or list(MODELS)


def load(path):
    if path.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=path)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.context.scene.objects if o.type == "MESH" and not o.hide_render and o.visible_get()]


def triangles(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def image_colour(image, cache={}):
    # Color medio de una textura (en lineal).
    if image.name not in cache:
        try:
            w, h = image.size
            if w * h == 0:
                raise ValueError
            pixels = np.array(image.pixels[:], dtype=np.float32).reshape(-1, image.channels)
            cache[image.name] = tuple(float(v) for v in pixels[:: max(1, len(pixels) // 20000), :3].mean(axis=0))
        except Exception:
            cache[image.name] = None
    return cache[image.name]


def material_colour(material):
    # El color de base del material; si viene de una textura, el medio de la textura.
    if material is None:
        return (0.6, 0.6, 0.6), "sin material"
    if (current, material.name) in REPAINT:
        return REPAINT[(current, material.name)], "a mano"
    if material.use_nodes and material.node_tree:
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                socket = node.inputs.get("Base Color")
                if socket.is_linked:
                    source = socket.links[0].from_node
                    if source.type == "TEX_IMAGE" and source.image:
                        return image_colour(source.image), f"textura {source.image.name} {tuple(source.image.size)}"
                    return tuple(socket.default_value[:3]), f"nodo {source.type}"
                return tuple(socket.default_value[:3]), "color"
    return (GLASS if current in DIORAMAS else tuple(material.diffuse_color[:3])), "color de vista"


current = None
for name in wanted:
    current = name
    file, budget = MODELS[name]
    things = load(os.path.join(SOURCE, file))
    if name in GROUNDED:
        # Fuera la peana (lo que ocupa toda la planta y es bajo) y los árboles.
        box = lambda o: [o.matrix_world @ Vector(c) for c in o.bound_box]
        every = [p for o in things for p in box(o)]
        span = [max(p[k] for p in every) - min(p[k] for p in every) for k in range(3)]
        kept = []
        for o in things:
            b = box(o)
            size = [max(p[k] for p in b) - min(p[k] for p in b) for k in range(3)]
            base = size[0] > span[0] * 0.8 and size[1] > span[1] * 0.8 and size[2] < span[2] * 0.3
            # (Árbol: todo él es hoja o tronco. Una pared con hiedra no lo es.)
            names = [slot.material.name for slot in o.material_slots if slot.material]
            tree = name in DIORAMAS and len(names) > 0 and all(one.startswith(TREES) for one in names)
            if not (base or tree):
                kept.append(o)
        print(f"[edificio] {name}: quitadas {len(things) - len(kept)} piezas de peana y árboles de {len(things)}")
        things = kept
    if look:
        total = sum(triangles(o.data) for o in things)
        low = [min((o.matrix_world @ Vector(c))[k] for o in things for c in o.bound_box) for k in range(3)]
        high = [max((o.matrix_world @ Vector(c))[k] for o in things for c in o.bound_box) for k in range(3)]
        used = {}
        for o in things:
            for slot in o.material_slots:
                if slot.material:
                    used[slot.material.name] = material_colour(slot.material)
        print(f"== {name}: {len(things)} mallas, {total} triángulos, medidas {[round(h - l, 2) for l, h in zip(low, high)]} (x, y, alto), de {[round(v, 2) for v in low]} a {[round(v, 2) for v in high]}")
        for key, (colour, kind) in sorted(used.items())[:40]:
            print(f"     {key}: {kind} {None if colour is None else tuple(round(c, 2) for c in colour)}")
        print(f"     … {len(used)} materiales; imágenes: {[(i.name, tuple(i.size)) for i in bpy.data.images][:8]}")
        continue

    # ── Unir y reducir, con los materiales aún puestos (así no se mezclan colores) ──
    for thing in things:
        if thing.data.users > 1:
            thing.data = thing.data.copy()
        bpy.context.view_layer.objects.active = thing
        for modifier in list(thing.modifiers):
            if modifier.type in ("SUBSURF", "MULTIRES"):
                thing.modifiers.remove(modifier)
                continue
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
    before = triangles(whole.data)
    if before > budget and name in ROUND:
        # Viene como triángulos sueltos: se sueldan los vértices que coinciden
        # para que la reducción no abra agujeros.
        import bmesh
        soup = bmesh.new()
        soup.from_mesh(whole.data)
        merged = len(soup.verts)
        bmesh.ops.remove_doubles(soup, verts=soup.verts, dist=0.002)
        print(f"[edificio] {name}: soldados {merged - len(soup.verts)} vértices de {merged}")
        soup.to_mesh(whole.data)
        soup.free()
        modifier = whole.modifiers.new("reducir", "DECIMATE")
        modifier.ratio = budget / before
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    elif before > budget:
        # Primero lo que no se nota: caras que están en un mismo plano (sin cruzar materiales).
        flat = whole.modifiers.new("aplanar", "DECIMATE")
        flat.decimate_type = "DISSOLVE"
        flat.angle_limit = 0.035
        flat.delimit = {"MATERIAL"}
        bpy.ops.object.modifier_apply(modifier=flat.name)
        tri = whole.modifiers.new("triangular", "TRIANGULATE")
        bpy.ops.object.modifier_apply(modifier=tri.name)
        middle = triangles(whole.data)
        if middle > budget:
            modifier = whole.modifiers.new("reducir", "DECIMATE")
            modifier.ratio = budget / middle
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    # ── Pintar: el color de cada material, a color de vértice ──
    mesh = whole.data
    for attribute in list(mesh.color_attributes):
        mesh.color_attributes.remove(attribute)
    layer = mesh.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    tones = [material_colour(slot.material)[0] or (0.6, 0.6, 0.6) for slot in whole.material_slots] or [(0.6, 0.6, 0.6)]
    for polygon in mesh.polygons:
        tone = tones[min(polygon.material_index, len(tones) - 1)]
        for loop in polygon.loop_indices:
            layer.data[loop].color = (*tone, 1)
    mesh.materials.clear()
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
    print(f"[edificio] {name}: {before} → {triangles(whole.data)} triángulos · medidas con el lado mayor = 1: ancho {size[0]:.2f}, fondo {size[1]:.2f}, alto {size[2]:.2f} · lado original {side:.2f} · {os.path.getsize(path) / 1024:.0f} kB")
