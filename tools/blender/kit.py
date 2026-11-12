# Kit de modelado de los edificios del Planeta 1, para Blender en modo consola.
#
# Todo se escribe en las coordenadas del juego (x a la derecha, y arriba, z hacia
# quien mira la fachada) y en metros. Cada pieza es una primitiva con sus aristas
# biseladas, pintada en los colores de vértice (degradado vertical y un matiz
# por cara) y añadida a una única malla. El resultado se exporta a GLB sin
# materiales ni normales: el juego le pone su material facetado.
#
# Además de la malla se exportan «anclas» (vacíos con nombre): dónde van las
# piezas que el juego monta aparte (cristales con luz, captura, rótulo, humo).
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

# Juego (x, y, z) -> Blender (x, -z, y).
TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
TO_GAME = TO_BLENDER.inverted()


def srgb(hex_color):
    """'#rrggbb' -> color lineal (el que guardan los colores de vértice)."""
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return Vector(out)


def shade(hex_color, amount):
    """Oscurece (amount < 0) o aclara (amount > 0) un color: devuelve '#rrggbb'."""
    hex_color = hex_color.lstrip("#")
    out = ""
    for i in (0, 2, 4):
        c = int(hex_color[i : i + 2], 16)
        c = c + (255 - c) * amount if amount > 0 else c * (1 + amount)
        out += f"{max(0, min(255, round(c))):02x}"
    return "#" + out


def tones(hex_color, dark=-0.28, light=0.14):
    return (shade(hex_color, dark), shade(hex_color, light))


class Model:
    def __init__(self, seed=1):
        self.bm = bmesh.new()
        self.layer = self.bm.loops.layers.float_color.new("Color")
        self.anchors = []
        self.random = random.Random(seed)
        self.count = 0

    # ── Colocación ────────────────────────────────────────────────────────
    @staticmethod
    def _rotation(rotation):
        """Giro como (rx, ry, rz) en radianes o como matriz ya compuesta."""
        if isinstance(rotation, Matrix):
            return rotation.to_4x4()
        rx, ry, rz = rotation
        return Matrix.Rotation(rx, 4, "X") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rz, 4, "Z")

    @staticmethod
    def _matrix(position=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1)):
        rot = Model._rotation(rotation)
        if isinstance(scale, (int, float)):
            scale = (scale, scale, scale)
        size = Matrix.Diagonal((*scale, 1))
        return TO_BLENDER @ Matrix.Translation(position) @ rot @ size @ TO_GAME

    def _add(self, part, color, vary, position, rotation, scale, jitter=0, gradient=True):
        """Pinta la pieza (hecha en coordenadas nativas, z arriba), la coloca y la une."""
        rnd = self.random
        if jitter:
            for v in part.verts:
                v.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * jitter
        bottom, top = (color, color) if isinstance(color, str) else color
        a, b = srgb(bottom), srgb(top)
        zs = [v.co.z for v in part.verts]
        low, span = min(zs), max(max(zs) - min(zs), 1e-5)
        layer = part.loops.layers.float_color.new("Color")
        for face in part.faces:
            k = 1 + rnd.uniform(-vary, vary) if vary else 1
            for loop in face.loops:
                t = (loop.vert.co.z - low) / span if gradient else 0.5
                c = a.lerp(b, t) * k
                loop[layer] = (c.x, c.y, c.z, 1)
        bmesh.ops.transform(part, matrix=self._matrix(position, rotation, scale), verts=part.verts)
        mesh = bpy.data.meshes.new("parte")
        part.to_mesh(mesh)
        part.free()
        self.bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        self.count += 1

    @staticmethod
    def _bevel(part, width, segments=1):
        if width > 0:
            bmesh.ops.bevel(part, geom=list(part.edges), offset=width, offset_type="OFFSET", segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)

    # ── Primitivas (tamaños en coordenadas del juego: ancho x, alto y, fondo z) ──
    def box(self, size, position, color, *, rotation=(0, 0, 0), bevel=0.03, vary=0.05, taper=1.0, jitter=0, segments=1):
        """Caja biselada. `taper`: cuánto se estrecha arriba (1 = nada)."""
        w, h, d = size
        part = bmesh.new()
        bmesh.ops.create_cube(part, size=1)
        for v in part.verts:
            k = taper if v.co.z > 0 else 1
            v.co = Vector((v.co.x * w * k, v.co.y * d * k, v.co.z * h))
        self._bevel(part, min(bevel, w * 0.45, h * 0.45, d * 0.45), segments)
        self._add(part, color, vary, position, rotation, 1, jitter)

    def cyl(self, radius, height, position, color, *, top=None, sides=10, rotation=(0, 0, 0), bevel=0.02, vary=0.05, scale=(1, 1, 1), jitter=0, caps=True):
        """Cilindro o cono truncado de eje vertical, centrado. `top`: radio de arriba."""
        part = bmesh.new()
        bmesh.ops.create_cone(part, cap_ends=caps, cap_tris=False, segments=sides, radius1=radius, radius2=radius if top is None else top, depth=height)
        if caps:
            self._bevel(part, min(bevel, radius * 0.4, height * 0.4))
        self._add(part, color, vary, position, rotation, scale, jitter)

    def ball(self, radius, position, color, *, detail=1, scale=(1, 1, 1), rotation=(0, 0, 0), vary=0.08, jitter=0.0):
        """Bola facetada (icosfera), para plantas, pomos y piedras."""
        part = bmesh.new()
        bmesh.ops.create_icosphere(part, subdivisions=detail, radius=radius)
        self._add(part, color, vary, position, rotation, scale, jitter * radius)

    def prism(self, outline, depth, position, color, *, rotation=(0, 0, 0), bevel=0.03, vary=0.05, gradient=True):
        """Contorno 2D [(x, y), …] en el plano de la fachada, con `depth` de fondo (centrado en z)."""
        part = bmesh.new()
        verts = [part.verts.new((x, 0, y)) for x, y in outline]
        face = part.faces.new(verts)
        made = bmesh.ops.extrude_face_region(part, geom=[face])
        moved = [e for e in made["geom"] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(part, verts=moved, vec=(0, -depth, 0))
        bmesh.ops.translate(part, verts=part.verts, vec=(0, depth / 2, 0))
        bmesh.ops.recalc_face_normals(part, faces=part.faces)
        self._bevel(part, bevel)
        self._add(part, color, vary, position, rotation, 1, 0, gradient)

    def lathe(self, profile, position, color, *, sides=10, rotation=(0, 0, 0), vary=0.05, scale=(1, 1, 1)):
        """Perfil [(radio, altura), …] torneado alrededor del eje vertical (como el casco del cohete)."""
        part = bmesh.new()
        rings = []
        for radius, y in profile:
            if radius < 1e-5:
                rings.append([part.verts.new((0, 0, y))])
            else:
                rings.append([part.verts.new((math.cos(i / sides * math.tau) * radius, math.sin(i / sides * math.tau) * radius, y)) for i in range(sides)])
        for a, b in zip(rings, rings[1:]):
            for i in range(sides):
                j = (i + 1) % sides
                quad = [a[i % len(a)], a[j % len(a)], b[j % len(b)], b[i % len(b)]]
                unique = list(dict.fromkeys(quad))
                if len(unique) >= 3:
                    part.faces.new(unique)
        bmesh.ops.recalc_face_normals(part, faces=part.faces)
        self._add(part, color, vary, position, rotation, scale)

    # ── Anclas ────────────────────────────────────────────────────────────
    def anchor(self, name, position, *, rotation=(0, 0, 0), size=(1, 1, 1)):
        """Vacío con nombre. `size` se guarda en su escala (ancho, alto, fondo)."""
        self.anchors.append((name, position, rotation, size))

    # ── Salida ────────────────────────────────────────────────────────────
    def ground_shade(self, amount=0.16, height=0.7):
        """Oscurece lo que queda cerca del suelo, como si le llegara menos luz."""
        layer = self.bm.loops.layers.float_color["Color"]
        for face in self.bm.faces:
            for loop in face.loops:
                k = 1 - amount * (1 - min(1, max(0, loop.vert.co.z / height)))
                c = loop[layer]
                loop[layer] = (c[0] * k, c[1] * k, c[2] * k, 1)

    def export(self, path):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bmesh.ops.triangulate(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new("edificio")
        self.bm.to_mesh(mesh)
        mesh.color_attributes.active_color = mesh.color_attributes["Color"]
        mesh.color_attributes.render_color_index = 0
        triangles = len(mesh.polygons)
        obj = bpy.data.objects.new("edificio", mesh)
        bpy.context.scene.collection.objects.link(obj)
        for name, position, rotation, size in self.anchors:
            empty = bpy.data.objects.new(name, None)
            # Las anclas guardan su orientación en ejes del juego: la conversión
            # de ejes la hace el exportador para todo el archivo.
            rot = Model._rotation(rotation)
            empty.matrix_world = TO_BLENDER @ Matrix.Translation(position) @ rot @ Matrix.Diagonal((*size, 1)) @ TO_GAME
            bpy.context.scene.collection.objects.link(empty)
        options = dict(filepath=path, export_format="GLB", export_normals=False, export_texcoords=False, export_materials="NONE", export_yup=True, export_apply=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
        for extra in (dict(export_vertex_color="ACTIVE", export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True), dict(export_vertex_color="ACTIVE"), dict(export_colors=True), {}):
            try:
                bpy.ops.export_scene.gltf(**options, **extra)
                break
            except TypeError:
                continue
        print(f"[kit] {path}: {self.count} piezas, {triangles} triángulos, {len(self.anchors)} anclas")
