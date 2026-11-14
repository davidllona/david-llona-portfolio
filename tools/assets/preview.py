# Vista previa de los GLB ya convertidos (color de vértice, sin materiales):
# una imagen por modelo, desde el sur y desde arriba, como la cámara del juego.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b -P tools/assets/preview.py -- <carpeta de salida> <glb> [<glb> …]
#
# En la imagen, +X queda a la derecha y el frente (+Z del juego) hacia quien mira.
import bpy, os, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out, files = os.path.abspath(args[0]), args[1:]
os.makedirs(out, exist_ok=True)
for path in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    things = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    material = bpy.data.materials.new("color")
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes["Principled BSDF"]
    shader.inputs["Roughness"].default_value = 1
    colour = nodes.new("ShaderNodeVertexColor")
    links.new(colour.outputs["Color"], shader.inputs["Base Color"])
    low = Vector((1e9, 1e9, 1e9)); high = Vector((-1e9, -1e9, -1e9))
    for thing in things:
        thing.data.materials.clear()
        thing.data.materials.append(material)
        for polygon in thing.data.polygons:
            polygon.use_smooth = False
        for corner in thing.bound_box:
            p = thing.matrix_world @ Vector(corner)
            low = Vector(map(min, low, p)); high = Vector(map(max, high, p))
    centre = (low + high) / 2
    size = max(high - low)
    scene = bpy.context.scene
    camera = bpy.data.objects.new("camara", bpy.data.cameras.new("camara"))
    scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = size * 1.5
    # El juego: +Z hacia la cámara = −Y de Blender. Se mira desde el sur, 40° por encima.
    tilt = math.radians(40)
    camera.location = centre + Vector((size * 0.6, -math.cos(tilt) * size * 4, math.sin(tilt) * size * 4))
    direction = centre - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    sun = bpy.data.objects.new("sol", bpy.data.lights.new("sol", "SUN"))
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("cielo")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.72, 0.85, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    scene.world = world
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.render.image_settings.file_format = "JPEG"
    scene.render.filepath = os.path.join(out, os.path.splitext(os.path.basename(path))[0] + ".jpg")
    bpy.ops.render.render(write_still=True)
    print("[vista]", scene.render.filepath)
