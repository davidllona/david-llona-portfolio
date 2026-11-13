"""Pantalla de carga: renderiza los modelos reales del juego (el astronauta
sentado en una roca con las piernas colgando, Woody tumbado a su lado y un
farol) con la luz de la bienvenida: luna fría desde atrás a la izquierda y
farol cálido. Fondo transparente.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/loader.py
    … -- prueba        (solo una vista previa pequeña, en /tmp o en $LOADER_PRUEBA)

Salen tres capas en public/loader/ (WebP con transparencia):
  escena.webp   roca y personajes con la luz de la luna (el farol, apagado);
  farol.webp    lo mismo con el farol encendido: se superpone y su opacidad
                tiembla, así la luz parpadea de verdad sobre ellos;
  planeta.webp  un planeta pequeño para el fondo.
"""
import math
import os
import random
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "loader")
ARGS = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
PREVIEW = "prueba" in ARGS
POSE = next((a.split("=")[1] for a in ARGS if a.startswith("pose=")), "Astro_SofaIdle")
DOG_POSE = next((a.split("=")[1] for a in ARGS if a.startswith("perro=")), "Woody_LieDown")
DOG_AT = float(next((a.split("=")[1] for a in ARGS if a.startswith("perro_t=")), 1.0))
DOG_TURN = float(next((a.split("=")[1] for a in ARGS if a.startswith("perro_giro=")), 25))
SIZE = (720, 534) if PREVIEW else (1080, 800)

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


def flat_material(name, color, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    bsdf = principled(material)
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = 1
    for key in ("Specular IOR Level", "Specular"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = 0
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = strength
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


def load_character(path, clip, frame_at=0.5):
    """Importa un GLB riggeado y lo deja en la pose de `clip`."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objects = [o for o in bpy.data.objects if o not in before]
    armature = next(o for o in objects if o.type == "ARMATURE")
    action = bpy.data.actions.get(clip)
    if action is None:
        raise SystemExit(f"No está el clip {clip}. Hay: {sorted(a.name for a in bpy.data.actions)[:80]}")
    armature.animation_data_create()
    armature.animation_data.action = action
    if hasattr(armature.animation_data, "action_slot") and getattr(action, "slots", None):
        armature.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    bpy.context.scene.frame_set(int(start + (end - start) * frame_at))
    tidy_materials(objects)
    roots = [o for o in objects if o.parent is None]
    holder = bpy.data.objects.new(clip + "_sitio", None)
    bpy.context.scene.collection.objects.link(holder)
    for root in roots:
        root.parent = holder
    return holder, objects


def rock(seed=7):
    """Roca facetada: ancha y llana por arriba, que se afila hacia abajo."""
    random.seed(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
    obj = bpy.context.object
    mesh = obj.data
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        jitter = 1 + (random.random() - 0.5) * 0.22
        # Estratos: la roca baja a escalones, con repisas.
        step = 1 - 0.16 * math.floor(max(0, -z) * 3.2)
        if z > 0.12:  # tapa: casi plana, con algo de relieve
            vertex.co = Vector((x * 1.55 * jitter, y * 1.1 * jitter, 0.12 + (z - 0.12) * 0.1 + (random.random() - 0.5) * 0.04))
        else:  # cuerpo: se estrecha y baja
            taper = max(0.12, (1 + z * 0.5) * step)
            vertex.co = Vector((x * 1.55 * taper * jitter, y * 1.1 * taper * jitter, z * 1.45 + (random.random() - 0.5) * 0.12))
    for polygon in mesh.polygons:
        polygon.use_smooth = False
    # Color por cara: clara arriba, oscura abajo, con un matiz por faceta.
    layer = mesh.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    top, low = srgb("#c9c2b4"), srgb("#6b6562")
    for polygon in mesh.polygons:
        t = max(0, min(1, (polygon.center.z + 1.4) / 1.5))
        shade = 0.82 + random.random() * 0.36
        for index in polygon.loop_indices:
            layer.data[index].color = [(low[i] + (top[i] - low[i]) * t) * shade for i in range(3)] + [1]
    material = bpy.data.materials.new("Roca")
    bsdf = principled(material)
    nodes = material.node_tree.nodes
    bsdf.inputs["Roughness"].default_value = 1
    attribute = nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "Col"
    material.node_tree.links.new(attribute.outputs["Color"], bsdf.inputs["Base Color"])
    mesh.materials.append(material)
    return obj


def planet():
    """Planeta facetado con anillo, para el fondo."""
    random.seed(11)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
    globe = bpy.context.object
    layer = globe.data.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    sea, land = srgb("#2f7fb5"), srgb("#58a64d")
    for polygon in globe.data.polygons:
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
    globe.data.materials.append(material)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.6, minor_radius=0.13, major_segments=28, minor_segments=4, rotation=(math.radians(20), math.radians(16), 0))
    ring = bpy.context.object
    ring.scale = (1, 1, 0.12)
    for polygon in ring.data.polygons:
        polygon.use_smooth = False
    # Su propia luz, de frente a la izquierda: la luna de la escena lo dejaría a oscuras.
    light("SUN", "Sol_planeta", (-4, -6, 3), "#fff1dc", 3.0, aim=(0, 0, 0))
    ring.data.materials.append(flat_material("Anillo", srgb("#f6ead6")))


def box(name, size, location, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = size
    obj.data.materials.append(material)
    return obj


def lantern(at):
    """Farol de pie: base, cuatro varillas, cristal encendido, tapa y asa."""
    x, y, z = at
    wood = flat_material("Farol_madera", srgb("#6b4630"))
    dark = flat_material("Farol_hierro", srgb("#2e2620"))
    glass = flat_material("Farol_cristal", srgb("#000000"), srgb("#ffc878"), 2.2)
    box("farol_base", (0.3, 0.3, 0.05), (x, y, z + 0.025), wood)
    for dx in (-1, 1):
        for dy in (-1, 1):
            box("farol_varilla", (0.03, 0.03, 0.4), (x + dx * 0.115, y + dy * 0.115, z + 0.25), dark).visible_shadow = False
    box("farol_cristal", (0.2, 0.2, 0.36), (x, y, z + 0.25), glass).visible_shadow = False
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.25, depth=0.16, location=(x, y, z + 0.53), rotation=(0, 0, math.pi / 4))
    bpy.context.object.data.materials.append(wood)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.012, major_segments=8, minor_segments=4, location=(x, y, z + 0.66), rotation=(math.pi / 2, 0, 0))
    bpy.context.object.data.materials.append(dark)
    return (x, y, z + 0.27)


def light(kind, name, location, color, energy, aim=None, **extra):
    """`aim`: punto al que mira (soles y focos de área)."""
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


def setup_render(scene):
    engines = [item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 82
    world = bpy.data.worlds.new("Noche")
    world.use_nodes = True
    nodes = world.node_tree.nodes
    background = next((n for n in nodes if n.type == "BACKGROUND"), None) or nodes.new("ShaderNodeBackground")
    output = next((n for n in nodes if n.type == "OUTPUT_WORLD"), None) or nodes.new("ShaderNodeOutputWorld")
    world.node_tree.links.new(background.outputs["Background"], output.inputs["Surface"])
    background.inputs["Color"].default_value = srgb("#2a3270")
    background.inputs["Strength"].default_value = 0.18
    scene.world = world
    if hasattr(scene, "eevee"):
        for key, value in (("taa_render_samples", 64), ("use_shadows", True), ("use_gtao", True)):
            if hasattr(scene.eevee, key):
                setattr(scene.eevee, key, value)


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("render:", path, os.path.getsize(path), "bytes")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    setup_render(scene)
    os.makedirs(OUT, exist_ok=True)

    stone = rock()
    stone.location = (0, 0, 0)
    top = 0.14  # altura de la tapa de la roca

    # (En Blender: +X derecha, -Y hacia la cámara, +Z arriba.)
    astro, _ = load_character(os.path.join(ROOT, "public/models/characters/astronauta.glb"), POSE)
    astro.scale = (1.4, 1.4, 1.4)
    astro.location = (-0.62, -1.06, top - 0.62)
    astro.rotation_euler = (0, 0, math.radians(14))
    dog, _ = load_character(os.path.join(ROOT, "public/models/characters/woody.glb"), DOG_POSE, DOG_AT)
    dog.scale = (1.25, 1.25, 1.25)
    dog.location = (0.78, -0.5, top)
    dog.rotation_euler = (0, 0, math.radians(DOG_TURN))
    lamp_at = lantern((0.1, -0.72, top))
    # Dos piedras sueltas que flotan cerca.
    for (x, y, z, size, seed) in ((-1.5, -0.2, -0.95, 0.17, 3), (1.6, 0.1, -0.6, 0.13, 5)):
        pebble = rock(seed)
        pebble.location = (x, y, z)
        pebble.scale = (size, size, size)

    # Luna: fría, desde atrás a la izquierda y arriba; recorta las siluetas.
    light("SUN", "Luna", (-4.5, 5.5, 7), "#dbe8ff", 4.2, aim=(0, 0, 0), angle=math.radians(3))
    # Relleno azul desde abajo y por delante: dibuja la roca.
    light("AREA", "Relleno", (0.4, -4.5, -3.0), "#a3b8ff", 95, aim=(0, 0, -0.6), size=4)
    # Luz fría suave por delante a la izquierda: el lado de la luna no queda negro.
    light("AREA", "Frente", (-4.0, -5.0, 2.2), "#9db8ff", 85, aim=(0, -0.5, 0.5), size=3)
    warm = light("POINT", "Farol", (lamp_at[0], lamp_at[1], lamp_at[2] + 0.12), "#ffa24e", 125, shadow_soft_size=0.1)

    camera_data = bpy.data.cameras.new("Camara")
    camera_data.lens_unit = "FOV"
    camera_data.sensor_fit = "HORIZONTAL"
    camera_data.angle = math.radians(28)
    camera = bpy.data.objects.new("Camara", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0.2, -8.2, 1.5)
    target = Vector((0.12, 0, -0.2))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera

    if PREVIEW:
        scene.render.image_settings.file_format = "PNG"
        render(os.path.join(os.environ.get("LOADER_PRUEBA", "/tmp"), f"loader-prueba-{POSE}.png"))
        return
    render(os.path.join(OUT, "farol.webp"))
    warm.data.energy = 0
    principled(bpy.data.materials["Farol_cristal"]).inputs["Emission Strength"].default_value = 0.25
    render(os.path.join(OUT, "escena.webp"))

    # El planeta del fondo: se esconde todo lo demás y se saca aparte, pequeño.
    for obj in scene.objects:
        if obj.type in ("MESH", "ARMATURE"):
            obj.hide_render = True
    planet()
    scene.render.resolution_x = scene.render.resolution_y = 300
    camera.location = (0, -9, 0.6)
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.angle = math.radians(24)
    render(os.path.join(OUT, "planeta.webp"))


main()
