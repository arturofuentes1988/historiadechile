# Traspasa un movimiento de un personaje a otro, sin pedirlo de nuevo.
# Todos los modelos traen el mismo esqueleto (24 huesos con los mismos nombres), pero cada uno nace con su propia postura
# (los brazos más o menos abiertos, las piernas más o menos separadas), y los movimientos guardan el giro de cada hueso
# contando desde esa postura. Copiados tal cual, a otro personaje le quedan los brazos y las piernas corridos hasta 17 grados.
# Aquí se rehace el movimiento para el personaje de destino: en cada cuadro, sus brazos, antebrazos, muslos y canillas quedan
# apuntando exactamente hacia donde apuntan los del personaje de origen, y los demás huesos giran lo mismo que giran los de él.
# La altura de la cadera se ajusta al largo de sus piernas.
# (Comprobado con el reposo de Millaray traspasado a Curiñancu contra el reposo que Higgsfield hizo para él: ver --compara.)
#
# Uso:  python tools/glb-traspasa.py origen.glb movimiento.json destino.glb salida.json [nombre]
#       python tools/glb-traspasa.py origen.glb movimiento.json destino.glb --compara el-mismo-movimiento-del-destino.json
#   origen.glb: el modelo del personaje para el que se hizo el movimiento.  movimiento.json: el que saca tools/glb-animacion.mjs.
#   destino.glb: el modelo del personaje que lo va a usar.
import json, math, struct, sys

def mul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz]
inv = lambda q: [-q[0], -q[1], -q[2], q[3]]
def rot(q, v): return mul(mul(q, [v[0], v[1], v[2], 0]), inv(q))[:3]
def uno(v): n = math.sqrt(sum(x * x for x in v)) or 1; return [x / n for x in v]
def ang(a, b): return math.degrees(2 * math.acos(min(1, abs(sum(x * y for x, y in zip(a, b))))))
def angv(a, b): return math.degrees(math.acos(max(-1, min(1, sum(x * y for x, y in zip(uno(a), uno(b)))))))
def arco(a, b):  # el giro más corto que lleva la dirección a hasta la dirección b
    a, b = uno(a), uno(b); d = sum(x * y for x, y in zip(a, b))
    if d < -0.999999: e = uno([1, 0, 0] if abs(a[0]) < 0.9 else [0, 1, 0]); c = [a[1] * e[2] - a[2] * e[1], a[2] * e[0] - a[0] * e[2], a[0] * e[1] - a[1] * e[0]]; c = uno(c); return [c[0], c[1], c[2], 0]
    c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; q = [c[0], c[1], c[2], 1 + d]; n = math.sqrt(sum(x * x for x in q)); return [x / n for x in q]

def esqueleto(p):  # de cada hueso: su giro y su lugar al nacer, su padre y sus hijos
    b = open(p, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); N = j['nodes']; padre = {}
    for i, nd in enumerate(N):
        for c in nd.get('children', []): padre[c] = i
    J = j['skins'][0]['joints']; sk = {}
    for i in J:
        nd = N[i]; pa = padre.get(i)
        sk[nd['name']] = {'r': nd.get('rotation', [0, 0, 0, 1]), 't': nd.get('translation', [0, 0, 0]), 'p': N[pa]['name'] if pa in J else None, 'h': [N[c]['name'] for c in nd.get('children', []) if c in J]}
    return sk
def orden(sk):  # los padres antes que los hijos
    out = []
    def baja(k): out.append(k); [baja(h) for h in sk[k]['h']]
    for k in sk:
        if sk[k]['p'] is None: baja(k)
    return out
def mundo(sk, ORD, loc):  # del giro de cada hueso respecto de su padre, a su giro en el espacio del modelo
    W = {}
    for k in ORD: p = sk[k]['p']; W[k] = mul(W[p], loc[k]) if p else loc[k]
    return W

EXTREMIDADES = ['Spine02', 'Spine01', 'Spine', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg']  # los que copian la dirección: el tronco, los brazos y las piernas
def traspasa(SO, clip, SD):
    ORD = orden(SO); RO = mundo(SO, ORD, {k: SO[k]['r'] for k in ORD}); RD = mundo(SD, ORD, {k: SD[k]['r'] for k in ORD}); C = {}
    for k in ORD:
        c = mul(inv(RO[k]), RD[k])  # lo que separa a los dos huesos al nacer
        if k in EXTREMIDADES and SO[k]['h']: h = SO[k]['h'][0]; c = mul(arco(rot(c, SD[h]['t']), SO[h]['t']), c)  # y, además, que apunte igual
        C[k] = c
    giros = {q['hueso']: q for q in clip['pistas'] if q['que'] == 'giro'}; t = next(iter(giros.values()))['t']; nf = len(t)
    for q in giros.values(): assert len(q['t']) == nf, 'las pistas no traen los mismos cuadros'
    sal = {k: [] for k in giros}; antes = {}
    for i in range(nf):
        loc = {k: (giros[k]['v'][i * 4:i * 4 + 4] if k in giros else SO[k]['r']) for k in ORD}; WO = mundo(SO, ORD, loc); WD = {k: mul(WO[k], C[k]) for k in ORD}
        for k in giros:
            p = SD[k]['p']; l = mul(inv(WD[p]), WD[k]) if p else WD[k]
            if k in antes and sum(x * y for x, y in zip(antes[k], l)) < 0: l = [-x for x in l]  # sin saltos de signo entre un cuadro y el siguiente
            antes[k] = l; sal[k] += [round(x, 5) for x in l]
    alto = SD['Hips']['t'][1] / SO['Hips']['t'][1]; pistas = []
    for q in clip['pistas']:
        if q['que'] == 'giro': pistas.append({'hueso': q['hueso'], 'que': 'giro', 't': q['t'], 'v': sal[q['hueso']]})
        else: pistas.append({'hueso': q['hueso'], 'que': q['que'], 't': q['t'], 'v': [round(x * alto, 3) for x in q['v']]})  # la cadera, a la altura de sus piernas
    return {'nombre': clip.get('nombre', 'movimiento'), 'dura': clip['dura'], 'pistas': pistas}, alto

if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 4: print(__doc__ or 'Uso: python tools/glb-traspasa.py origen.glb movimiento.json destino.glb salida.json [nombre]'); sys.exit(2)
    SO, clip, SD = esqueleto(a[0]), json.load(open(a[1], encoding='utf-8')), esqueleto(a[2]); nuevo, alto = traspasa(SO, clip, SD)
    if a[3] == '--compara':  # cuánto se parece lo traspasado a lo que el servicio hizo para ese personaje
        real = json.load(open(a[4], encoding='utf-8')); ORD = orden(SD); gn = {q['hueso']: q for q in nuevo['pistas'] if q['que'] == 'giro'}; gr = {q['hueso']: q for q in real['pistas'] if q['que'] == 'giro'}; go = {q['hueso']: q for q in clip['pistas'] if q['que'] == 'giro'}
        nf = min(len(next(iter(gn.values()))['t']), len(next(iter(gr.values()))['t'])); peor = {}
        for i in range(0, nf, 3):
            cu = lambda g, sk: {k: (g[k]['v'][i * 4:i * 4 + 4] if k in g else sk[k]['r']) for k in ORD}
            WN, WR, WT = mundo(SD, ORD, cu(gn, SD)), mundo(SD, ORD, cu(gr, SD)), mundo(SD, ORD, cu(go, SD))  # traspasado, el del servicio, y copiado tal cual
            for k in ORD:
                if not SD[k]['h']: continue
                h = SD[k]['h'][0]; d = (angv(rot(WN[k], SD[h]['t']), rot(WR[k], SD[h]['t'])), angv(rot(WT[k], SD[h]['t']), rot(WR[k], SD[h]['t']))); peor[k] = [max(x, y) for x, y in zip(peor.get(k, [0, 0]), d)]
        print('Hacia dónde apunta cada hueso, comparado con el movimiento hecho por el servicio (grados de diferencia):')
        for k in ORD:
            if k in peor: print('  %-14s traspasado %5.1f    copiado tal cual %5.1f' % (k, peor[k][0], peor[k][1]))
        print('  el peor: traspasado %.1f, copiado tal cual %.1f' % (max(v[0] for v in peor.values()), max(v[1] for v in peor.values())))
    else:
        if len(a) > 4: nuevo['nombre'] = a[4]
        s = json.dumps(nuevo, separators=(',', ':')); open(a[3], 'w', encoding='utf-8').write(s)
        print('%s: %d pistas, %.2f s, %d KB (cadera a %.0f %% de la del origen)' % (nuevo['nombre'], len(nuevo['pistas']), nuevo['dura'], len(s) // 1024, alto * 100))
