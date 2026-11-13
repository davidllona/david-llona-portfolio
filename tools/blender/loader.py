"""Pantalla de carga: el astronauta y Woody caminando de perfil sobre un planeta
pequeño que gira bajo sus pies. Se renderizan los modelos reales del juego con
sus clips (`Astro_Walk`, `Woody_Trot`) y salen estas capas en public/loader/
(WebP con transparencia), que index.html compone y anima con CSS:

  astronauta.webp  tira de fotogramas del ciclo de andar, de perfil;
  woody.webp       tira de fotogramas del trote, de perfil;
  mundo.webp       el planeta visto de frente, con su senda, árboles, matas y
                   rocas en el borde. La página lo gira alrededor de su centro:
                   como la cámara es ortográfica y el giro es sobre el eje de la
                   vista, girar la imagen equivale a girar el planeta. Por eso
                   su luz no puede venir de un lado: cada cara se aclara según
                   mire hacia fuera del planeta (la luz «cae del cielo» en todo
                   el contorno) y el sol del atardecer lo pone la página encima;
  planeta.webp     un planeta pequeño con anillo, para el fondo.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/loader.py
    … -- prueba      (deja además los fotogramas sueltos en $LOADER_PRUEBA o /tmp)
    … -- solo=mundo  (solo esa capa: astronauta, woody, mundo o planeta)

Al acabar imprime las medidas (en metros) que usa el CSS de index.html.
Los árboles salen de los originales de slabdsgn (assets-externos/, fuera de git).
"""
import math
import os
import random
import sys
import tempfile

import bpy
import numpy as np
from mathutils import Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "loader")
ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
PREVIEW = "prueba" in ARGS
ONLY = next((a.split("=")[1] for a in ARGS if a.startswith("solo=")), None)
TMP = os.environ.get("LOADER_PRUEBA") or tempfile.mkdtemp(prefix="loader-")

R = 3.6  # radio del planeta, en metros (el astronauta mide algo más de uno)
PPM = 250  # píxeles por metro en las tiras de los personajes
WORLD_PPM = 150  # y en la imagen del planeta (es grande y se ve más suave)
RIM = 2.15  # lo que sobresale del planeta el árbol más alto, con margen

# Colores del juego (src/characters/looks.js); el resto viene del GLB.
PALETTE = {
    "Astro_Visor": "#15131f", "Astro_Teal": "#1fb3a4", "Astro_Yellow": "#ffb21f",
    "Woody_Fur": "#3a3943", "Woody_FurSoft": "#4b4a56", "Woody_Chest": "#f2efe6", "Woody_Nose": "#0d0d10", "Woody_Eye": "#6b4a26",
}


def srgb(hex_color):
    h = hex_color.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [1]


def principled(material):
    """El nodo Principled del material; lo crea si el material nace vacío."""
    material.use_nodes = True
    nodes = material.node_tree.nodes
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        output = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
        material.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return bsdf


def flat_material(name, color):
    material = bpy.data.materials.new(name)
    bsdf = principled(material)
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 1
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0
    return material


def tidy_materials(objects):
    """Mate y sin brillos, con los colores del juego; caras planas."""
    for obj in objects:
        if obj.type != "MESH":
            continue
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
        for slot in obj.material_slots:
            material = slot.material
            if not material or not material.use_nodes:
                continue
            bsdf = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not bsdf:
                continue
            base = material.name.split(".")[0]
            if base in PALETTE:
                bsdf.inputs["Base Color"].default_value = srgb(PALETTE[base])
            bsdf.inputs["Roughness"].default_value = 1
            bsdf.inputs["Metallic"].default_value = 0
            for key in ("Specular IOR Level", "Specular"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0
            if base in ("Astro_Teal", "Astro_Yellow"):
                bsdf.inputs["Emission Color"].default_value = srgb(PALETTE[base])
                bsdf.inputs["Emission Strength"].default_value = 0.3


def light(kind, name, location, color, energy, aim=None, **extra):
    data = bpy.data.lights.new(name, kind)
    data.color = srgb(color)[:3]
    data.energy = energy
    for key, value in extra.items():
        setattr(data, key, value)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    if aim is not None:
        obj.rotation_euler = (Vector(aim) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(obj)
    return obj


def new_scene(ambient="#2a3270", strength=0.18):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    engines = [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_percentage = 100
    scene.render.fps = 30  # los clips están hechos a 30
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    world = bpy.data.worlds.new("Cielo")
    world.use_nodes = True
    nodes = world.node_tree.nodes
    background = next((n for n in nodes if n.type == "BACKGROUND"), None) or nodes.new("ShaderNodeBackground")
    output = next((n for n in nodes if n.type == "OUTPUT_WORLD"), None) or nodes.new("ShaderNodeOutputWorld")
    world.node_tree.links.new(background.outputs["Background"], output.inputs["Surface"])
    background.inputs["Color"].default_value = srgb(ambient)
    background.inputs["Strength"].default_value = strength
    scene.world = world
    if hasattr(scene, "eevee"):
        for key, value in (("taa_render_samples", 48), ("use_shadows", True), ("use_gtao", True)):
            if hasattr(scene.eevee, key):
                setattr(scene.eevee, key, value)
    return scene


def ortho_camera(scene, centre, width, height, pixels_per_metre):
    """Cámara ortográfica de perfil (mira hacia +Y) que encuadra width × height metros."""
    data = bpy.data.cameras.new("Camara")
    data.type = "ORTHO"
    scene.render.resolution_x = round(width * pixels_per_metre)
    scene.render.resolution_y = round(height * pixels_per_metre)
    data.sensor_fit = "HORIZONTAL"
    data.ortho_scale = width
    data.clip_end = 200
    camera = bpy.data.objects.new("Camara", data)
    camera.location = (centre[0], -40, centre[1])
    camera.rotation_euler = (math.radians(90), 0, 0)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def read_pixels(path):
    image = bpy.data.images.load(path)
    w, h = image.size
    data = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(data)
    bpy.data.images.remove(image)
    return data.reshape(h, w, 4)


def save_webp(name, pixels, quality):
    h, w, _ = pixels.shape
    image = bpy.data.images.new(name, w, h, alpha=True)
    image.pixels.foreach_set(np.ascontiguousarray(pixels, dtype=np.float32).ravel())
    path = os.path.join(OUT, name + ".webp")
    image.filepath_raw = path
    image.file_format = "WEBP"
    image.save(quality=quality)
    bpy.data.images.remove(image)
    print(f"capa: {name}.webp {w}×{h} px, {os.path.getsize(path) / 1000:.1f} kB")
    return os.path.getsize(path)


# ── Personajes: tira de fotogramas de un clip, de perfil ─────────────────────
def walker(name, glb, clip, frames, quality, fill=1.0, rim=1.0):
    scene = new_scene("#5a4a8c", 0.55)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "public/models/characters", glb))
    objects = [o for o in bpy.data.objects if o not in before]
    armature = next(o for o in objects if o.type == "ARMATURE")
    action = bpy.data.actions.get(clip)
    if action is None:
        raise SystemExit(f"No está el clip {clip}")
    armature.animation_data_create()
    armature.animation_data.action = action
    if hasattr(armature.animation_data, "action_slot") and getattr(action, "slots", None):
        armature.animation_data.action_slot = action.slots[0]
    tidy_materials(objects)
    holder = bpy.data.objects.new("sitio", None)
    scene.collection.objects.link(holder)
    for obj in objects:
        if obj.parent is None:
            obj.parent = holder
    holder.rotation_euler = (0, 0, math.radians(90))  # de perfil, andando hacia la derecha (+X)

    start, end = action.frame_range
    times = [start + (end - start) * i / frames for i in range(frames)]

    def pose(time):
        scene.frame_set(int(time), subframe=time - int(time))
        bpy.context.view_layer.update()

    # Encuadre holgado y fijo; después se recorta a lo que ocupa el personaje en todo el ciclo.
    width, height, bottom = 2.4, 1.9, -0.15
    ortho_camera(scene, (0, bottom + height / 2), width, height, PPM)

    # Atardecer: el sol, cálido, viene de delante (hacia donde andan) y de detrás
    # de la escena, y les perfila el contorno; por el lado de la cámara, un relleno frío.
    light("SUN", "Sol", (6, 5, 3.2), "#ffb46e", 5.5, aim=(0, 0, 0.6), angle=math.radians(4))
    light("SUN", "Borde", (-2, 6, 5), "#ff9a6a", 1.6 * rim, aim=(0, 0, 0.6))
    light("SUN", "Filo", (1.5, 7, 7), "#ffc890", 2.4 * rim, aim=(0, 0, 0.5))
    light("SUN", "Relleno", (-3, -6, 2.5), "#93a6ff", 1.5 * fill, aim=(0, 0, 0.6))
    light("SUN", "Frente", (3, -6, 1.5), "#ffd2b0", 0.9 * fill, aim=(0, 0, 0.6))

    cells = []
    for index, time in enumerate(times):
        pose(time)
        path = os.path.join(TMP, f"{name}-{index:02d}.png")
        render(path)
        cells.append(read_pixels(path))
    # Recorte común a todos los fotogramas (las filas van de abajo arriba), con un
    # margen transparente para que una casilla no se manche con la vecina.
    solid = np.max(np.stack([cell[:, :, 3] for cell in cells]), axis=0) > 0.02
    rows, columns = np.nonzero(solid.any(axis=1))[0], np.nonzero(solid.any(axis=0))[0]
    margin = 8
    y0, y1 = max(0, rows[0] - margin), min(solid.shape[0], rows[-1] + 1 + margin)
    x0, x1 = max(0, columns[0] - margin), min(solid.shape[1], columns[-1] + 1 + margin)
    size = save_webp(name, np.concatenate([cell[y0:y1, x0:x1] for cell in cells], axis=1), quality)
    return {
        "frames": frames,
        "cell_px": (int(x1 - x0), int(y1 - y0)),
        "cell_m": (round((x1 - x0) / PPM, 3), round((y1 - y0) / PPM, 3)),
        "feet_m": round((-bottom * PPM - y0) / PPM, 3),  # altura del suelo sobre el borde inferior de la casilla
        "middle_m": round((width / 2 * PPM - x0) / PPM, 3),  # dónde cae el origen del personaje, desde la izquierda
        "cycle_s": round((end - start) / scene.render.fps, 3),
        "bytes": size,
    }


# ── El planeta ───────────────────────────────────────────────────────────────
DUSK = (0.2, 0.2, 0.44)  # penumbra azulada del atardecer (el sol está detrás del planeta)


def sky_lit(name, base=None, attribute=None, low=0.42, high=1.0, grade=DUSK):
    """Material sin luces: el color se aclara en las caras que miran hacia fuera
    del planeta y se oscurece en las que miran hacia él. `grade` lo tiñe (por
    defecto, la penumbra del atardecer; None deja el color tal cual)."""
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    geometry = nodes.new("ShaderNodeNewGeometry")
    outward = nodes.new("ShaderNodeVectorMath")
    outward.operation = "NORMALIZE"
    links.new(geometry.outputs["Position"], outward.inputs[0])
    facing = nodes.new("ShaderNodeVectorMath")
    facing.operation = "DOT_PRODUCT"
    links.new(geometry.outputs["True Normal"], facing.inputs[0])
    links.new(outward.outputs["Vector"], facing.inputs[1])
    ramp = nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = -0.55
    ramp.inputs["From Max"].default_value = 1
    ramp.inputs["To Min"].default_value = low
    ramp.inputs["To Max"].default_value = high
    links.new(facing.outputs["Value"], ramp.inputs["Value"])
    shade = nodes.new("ShaderNodeVectorMath")
    shade.operation = "SCALE"
    if attribute:
        colour = nodes.new("ShaderNodeVertexColor")
        colour.layer_name = attribute
        links.new(colour.outputs["Color"], shade.inputs[0])
    else:
        shade.inputs[0].default_value = base[:3]
    links.new(ramp.outputs["Result"], shade.inputs["Scale"])
    tinted = nodes.new("ShaderNodeVectorMath")
    tinted.operation = "MULTIPLY"
    links.new(shade.outputs["Vector"], tinted.inputs[0])
    tinted.inputs[1].default_value = grade or (1, 1, 1)
    emission = nodes.new("ShaderNodeEmission")
    links.new(tinted.outputs["Vector"], emission.inputs["Color"])
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def wobble(p, scale, seed=0.0):
    """Ruido suave y repetible (sumas de senos), de −1 a 1."""
    x, y, z = p.x * scale + seed, p.y * scale + seed * 1.7, p.z * scale - seed
    return (math.sin(x * 1.3 + y * 0.7) + math.sin(y * 1.9 - z * 1.1 + 1.3) + math.sin(z * 1.6 + x * 0.9 + 2.1) + math.sin((x + y + z) * 0.8)) / 4


def mix(a, b, t):
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def smooth(a, b, x):
    t = max(0, min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def globe():
    """Esfera facetada con prados de dos verdes y una senda de tierra por donde caminan."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=5, radius=R)
    obj = bpy.context.object
    mesh = obj.data
    for vertex in mesh.vertices:
        p = vertex.co
        # Relieve suave, pero ninguno en la franja de la senda (y ≈ 0): ahí pisan.
        relief = smooth(0.45, 1.5, abs(p.y)) * (wobble(p, 1.1) * 0.13 + wobble(p, 2.6, 4) * 0.05)
        vertex.co = p.normalized() * (R + relief)
    layer = mesh.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    meadow, lush, dry = srgb("#4f9a52"), srgb("#3b8250"), srgb("#86a64e")
    trail, edge = srgb("#c8a878"), srgb("#8d9a58")
    random.seed(3)
    for polygon in mesh.polygons:
        c = polygon.center
        colour = mix(meadow, lush, smooth(-0.2, 0.5, wobble(c, 0.9, 2)))
        colour = mix(colour, dry, smooth(0.35, 0.8, wobble(c, 0.55, 9)))
        # Senda de borde irregular a lo largo del círculo por el que caminan.
        half = 0.3 + wobble(c, 2.2, 6) * 0.09
        side = abs(c.y + wobble(c, 1.4, 11) * 0.08)
        colour = mix(colour, edge, 1 - smooth(half, half + 0.22, side))
        colour = mix(colour, trail, 1 - smooth(half - 0.1, half, side))
        tint = 0.84 + random.random() * 0.32
        for index in polygon.loop_indices:
            layer.data[index].color = [v * tint for v in colour] + [1]
        polygon.use_smooth = False
    mesh.materials.append(sky_lit("Suelo", attribute="Col", low=0.9, high=1.0))
    return obj


def stand(obj, angle, y, spin=0.0, sink=0.0, scale=1.0):
    """Planta `obj` (con su base en el origen) sobre el planeta: `angle` es por
    dónde del contorno (0 = arriba, positivo hacia la derecha) e `y` cuánto se
    separa de la senda (positivo: detrás; negativo: delante)."""
    ring = math.sqrt(R * R - y * y)
    up = Vector((math.sin(angle) * ring, y, math.cos(angle) * ring)).normalized()
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(up) @ Quaternion((0, 0, 1), spin)
    obj.location = up * (R - sink)
    obj.scale = (scale, scale, scale)


def copy_of(obj):
    copy = obj.copy()
    bpy.context.scene.collection.objects.link(copy)
    return copy


def tree(folder, number, materials):
    """Un árbol de slabdsgn, unido en una malla, con la base en el origen y los materiales del planeta."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "assets-externos/modelos", folder, f"{number}.gltf"))
    meshes = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    low = min(zs)
    # El pie del tronco: el centro de los vértices más bajos.
    foot = [v.co for v in obj.data.vertices if v.co.z < low + (max(zs) - low) * 0.06]
    cx, cy = sum(p.x for p in foot) / len(foot), sum(p.y for p in foot) / len(foot)
    height = max(zs) - low
    for vertex in obj.data.vertices:
        vertex.co = Vector(((vertex.co.x - cx) / height, (vertex.co.y - cy) / height, (vertex.co.z - low) / height))  # 1 m de alto
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    for slot in obj.material_slots:
        key = next((k for k in materials if slot.material.name.startswith(k)), None)
        slot.material = materials[key] if key else materials["hijau"]
    for other in [o for o in bpy.data.objects if o not in before and o is not obj]:
        bpy.data.objects.remove(other)
    del xs, ys
    return obj


def boulder(seed, material):
    random.seed(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
    obj = bpy.context.object
    for vertex in obj.data.vertices:
        x, y, z = vertex.co
        j = 0.75 + random.random() * 0.5
        vertex.co = Vector((x * j * 1.2, y * j, max(-0.25, z * j * 0.75) + 0.25))
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    obj.data.materials.append(material)
    return obj


def tuft(material):
    """Mata de hierba: tres briznas en abanico."""
    verts, faces = [], []
    for i, (lean, turn) in enumerate(((-0.35, 0.0), (0.05, 2.1), (0.4, 4.2))):
        dx, dy = math.cos(turn) * 0.05, math.sin(turn) * 0.05
        verts += [(-dx, -dy, 0), (dx, dy, 0), (lean * 0.5 + dy, lean * 0.3 - dx, 1)]
        faces.append((i * 3, i * 3 + 1, i * 3 + 2))
    mesh = bpy.data.meshes.new("mata")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material)
    obj = bpy.data.objects.new("mata", mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def flower(stem, petal):
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.02, radius2=0.012, depth=0.8, location=(0, 0, 0.4))
    obj = bpy.context.object
    obj.data.materials.append(stem)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.2, location=(0, 0, 0.86))
    head = bpy.context.object
    head.scale = (1, 1, 0.6)
    head.data.materials.append(petal)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def world():
    scene = new_scene()
    span = (R + RIM) * 2
    ortho_camera(scene, (0, 0), span, span, WORLD_PPM)
    globe()

    # Los árboles pasan por detrás de los caminantes: van en un verde salvia de
    # valor medio (ya con la luz del atardecer, sin la penumbra del suelo) para que
    # Woody, que es negro, y el astronauta, que es claro, se recorten siempre.
    leaf = sky_lit("Hoja", base=srgb("#5f9482"), low=0.62, high=1.06, grade=None)
    leaf_dark = sky_lit("Hoja_oscura", base=srgb("#528676"), low=0.62, high=1.06, grade=None)
    bark = sky_lit("Tronco", base=srgb("#7a6270"), low=0.7, high=1.0, grade=None)
    leaf_warm = sky_lit("Hoja_clara", base=srgb("#6aa650"), low=0.5, high=1.08)
    stone = sky_lit("Piedra", base=srgb("#9a968f"), low=0.55, high=1.1)
    blade = sky_lit("Brizna", base=srgb("#5aa856"), low=0.8, high=1.05)
    stem = sky_lit("Tallo", base=srgb("#4c8f4e"), low=0.8, high=1.0)
    petals = [sky_lit(f"Petalo_{i}", base=srgb(c), low=0.75, high=1.05) for i, c in enumerate(("#ffd166", "#ff8fa3", "#f4f1e8", "#ff9f5a"))]

    # Árboles: detrás de la senda (y > 0), repartidos por todo el contorno y de
    # tamaños distintos, con hueco de cielo entre ellos. Ninguno a menos de 0,9 m
    # de la senda: no se cruzan con los caminantes más que por detrás.
    leafy = tree("low-poly-green-tree-asset", 15, {"hijau": leaf, "coklat": bark})
    round_tree = tree("low-poly-green-tree-object", 13, {"hijau": leaf_dark, "coklat": bark})
    bush = tree("low-poly-bush-cluster", 10, {"hijau_4": leaf_warm, "hijau_3": sky_lit("Mata", base=srgb("#3f8f58"), low=0.5, high=1.08)})
    random.seed(21)
    trees = [  # (ángulo en grados, separación, altura en m, modelo)
        (30, 1.45, 1.7, leafy), (84, 1.2, 1.2, round_tree), (133, 1.5, 1.85, round_tree), (187, 1.25, 1.35, leafy),
        (238, 1.5, 1.75, leafy), (289, 1.2, 1.25, round_tree), (338, 1.45, 1.6, round_tree),
    ]
    for degrees, y, height, model in trees:
        stand(copy_of(model), math.radians(degrees + random.uniform(-4, 4)), y, spin=random.uniform(0, 6.28), sink=0.05, scale=height)
    for i in range(16):  # matas bajas, detrás y delante
        behind = i % 3 != 0
        y = random.uniform(0.75, 1.5) if behind else -random.uniform(1.0, 1.9)
        stand(copy_of(bush), math.radians(i * 22.5 + random.uniform(-7, 7)), y, spin=random.uniform(0, 6.28), sink=0.03, scale=random.uniform(0.3, 0.5) if behind else random.uniform(0.2, 0.3))
    for i in range(18):  # rocas
        behind = i % 2 == 0
        rock = boulder(40 + i, stone)
        y = random.uniform(0.6, 1.3) if behind else -random.uniform(0.7, 2.2)
        stand(rock, math.radians(i * 20 + random.uniform(-8, 8)), y, spin=random.uniform(0, 6.28), sink=0.02, scale=random.uniform(0.1, 0.24) if behind else random.uniform(0.08, 0.16))
    grass = tuft(blade)
    for i in range(150):  # briznas a los lados de la senda
        y = random.choice((1, -1)) * random.uniform(0.42, 1.7)
        stand(copy_of(grass), random.uniform(0, 6.283), y, spin=random.uniform(0, 6.28), scale=random.uniform(0.1, 0.2) if y > 0 else random.uniform(0.07, 0.12))
    for i in range(44):  # flores
        y = random.choice((1, -1, -1)) * random.uniform(0.5, 2.0)
        bloom = flower(stem, petals[i % len(petals)])
        stand(bloom, random.uniform(0, 6.283), y, spin=random.uniform(0, 6.28), scale=random.uniform(0.2, 0.3) if y > 0 else random.uniform(0.1, 0.16))
    for model in (leafy, round_tree, bush, grass):
        model.hide_render = True

    path = os.path.join(TMP, "mundo.png")
    render(path)
    size = save_webp("mundo", read_pixels(path), 78)
    return {"radius_m": R, "span_m": round(span, 3), "bytes": size}


def planet():
    """Planeta facetado con anillo, para el fondo."""
    scene = new_scene()
    random.seed(11)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    globe_obj = bpy.context.object
    layer = globe_obj.data.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    sea, land = srgb("#b56a8f"), srgb("#e8a26a")
    for polygon in globe_obj.data.polygons:
        polygon.use_smooth = False
        base = land if math.sin(polygon.center.x * 3.1 + polygon.center.z * 4.3) + math.cos(polygon.center.y * 3.7) > 0.5 else sea
        shade = 0.85 + random.random() * 0.3
        for index in polygon.loop_indices:
            layer.data[index].color = [base[i] * shade for i in range(3)] + [1]
    material = bpy.data.materials.new("Planeta")
    bsdf = principled(material)
    bsdf.inputs["Roughness"].default_value = 1
    attribute = material.node_tree.nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "Col"
    material.node_tree.links.new(attribute.outputs["Color"], bsdf.inputs["Base Color"])
    globe_obj.data.materials.append(material)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.6, minor_radius=0.13, major_segments=28, minor_segments=4, rotation=(math.radians(20), math.radians(16), 0))
    ring = bpy.context.object
    ring.scale = (1, 1, 0.12)
    for polygon in ring.data.polygons:
        polygon.use_smooth = False
    ring.data.materials.append(flat_material("Anillo", srgb("#f6dcc0")))
    # El sol del atardecer le da desde abajo a la derecha, como en la página.
    light("SUN", "Sol_planeta", (5, -5, -2.5), "#ffd9a8", 3.4, aim=(0, 0, 0))
    scene.render.resolution_x = scene.render.resolution_y = 240
    data = bpy.data.cameras.new("Camara")
    data.lens_unit = "FOV"
    data.angle = math.radians(24)
    camera = bpy.data.objects.new("Camara", data)
    scene.collection.objects.link(camera)
    camera.location = (0, -9, 0.6)
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    path = os.path.join(TMP, "planeta.png")
    render(path)
    return {"bytes": save_webp("planeta", read_pixels(path), 80)}


def main():
    os.makedirs(OUT, exist_ok=True)
    layers = {
        "astronauta": lambda: walker("astronauta", "astronauta.glb", "Astro_Walk", 12, 78),
        "woody": lambda: walker("woody", "woody.glb", "Woody_Trot", 12, 78, fill=2.0, rim=2.6),
        "mundo": world,
        "planeta": planet,
    }
    measures = {}
    for name, make in layers.items():
        if ONLY and ONLY != name:
            continue
        measures[name] = make()
    print("MEDIDAS", measures)
    print("TOTAL kB", round(sum(m["bytes"] for m in measures.values()) / 1000, 1))
    if PREVIEW:
        print("fotogramas sueltos en", TMP)


main()
