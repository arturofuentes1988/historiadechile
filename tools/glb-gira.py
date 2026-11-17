# Da un cuarto de vuelta a un modelo .glb, dentro del archivo mismo, para que quede mirando hacia +z.
# Los modelos que entrega Tripo vienen mirando hacia +x, y el servicio que pone el esqueleto supone que miran hacia +z:
# si no se gira antes, las piernas quedan adelante y atrás en vez de a los lados, y el personaje camina de costado.
#
# Uso:  python tools/glb-gira.py entrada.glb salida.glb          (x, y, z) pasa a (−z, y, x)
#       python tools/glb-gira.py entrada.glb salida.glb al-reves  (x, y, z) pasa a (z, y, −x), si venía mirando hacia −x
import json, struct, sys

entrada, salida = sys.argv[1], sys.argv[2]
signo = -1 if len(sys.argv) > 3 else 1
b = bytearray(open(entrada, 'rb').read())
largo = struct.unpack_from('<I', b, 12)[0]
j = json.loads(b[20:20 + largo].decode('utf8'))
base = 20 + largo + 8  # donde empiezan los números
hechos = set()
for malla in j['meshes']:
    for pr in malla['primitives']:
        for nombre in ('POSITION', 'NORMAL'):
            i = pr['attributes'].get(nombre)
            if i is None or i in hechos:
                continue
            hechos.add(i)
            a = j['accessors'][i]
            v = j['bufferViews'][a['bufferView']]
            paso = v.get('byteStride', 12)
            ini = base + v.get('byteOffset', 0) + a.get('byteOffset', 0)
            for k in range(a['count']):
                x, y, z = struct.unpack_from('<3f', b, ini + k * paso)
                struct.pack_into('<3f', b, ini + k * paso, -z * signo, y, x * signo)
            if 'min' in a and 'max' in a:
                (x0, y0, z0), (x1, y1, z1) = a['min'], a['max']
                xs = sorted([-z0 * signo, -z1 * signo]); zs = sorted([x0 * signo, x1 * signo])
                a['min'], a['max'] = [xs[0], y0, zs[0]], [xs[1], y1, zs[1]]
nuevo = json.dumps(j, separators=(',', ':')).encode('utf8')
nuevo += b' ' * ((4 - len(nuevo) % 4) % 4)
resto = bytes(b[20 + largo:])
total = 12 + 8 + len(nuevo) + len(resto)
open(salida, 'wb').write(struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(nuevo), b'JSON') + nuevo + resto)
print('listo:', salida, round(total / 1e6, 2), 'MB')
