#!/usr/bin/env python3
"""Import missing item previews from a hash-verified official Java client.

Deterministic software previews, not a claim of pixel-identical game rendering.
The client archive is a local build input and must never be redistributed.
"""
import argparse, functools, hashlib, io, json, math, pathlib, zipfile
from PIL import Image, ImageDraw, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parents[1]


def rotate(point, angles):
    x, y, z = point
    # Minecraft's GUI quaternion uses XYZ rotation (apply Z, then Y, then X).
    for axis in [2, 1, 0]:
        c, s = math.cos(math.radians(angles[axis])), math.sin(math.radians(angles[axis]))
        if axis == 2: x, y = x*c-y*s, x*s+y*c
        elif axis == 1: x, z = x*c+z*s, -x*s+z*c
        else: y, z = y*c-z*s, y*s+z*c
    return (x, y, z)


class Renderer:
    def __init__(self, archive):
        self.zip = zipfile.ZipFile(archive)
        self.names = set(self.zip.namelist())

    @functools.lru_cache(maxsize=None)
    def read(self, name):
        return json.loads(self.zip.read(name))

    @staticmethod
    def resource(value, folder, suffix='.json'):
        namespace, name = value.split(':', 1) if ':' in value else ('minecraft', value)
        if '..' in name or not namespace.replace('_', '').isalnum(): raise ValueError('Invalid resource identifier')
        return f'assets/{namespace}/{folder}/{name}{suffix}'

    @functools.lru_cache(maxsize=None)
    def model(self, name):
        own = self.read(self.resource(name, 'models'))
        parent = own.get('parent', '')
        result = {} if not parent or parent.endswith(('builtin/generated', 'builtin/entity')) else self.model(parent).copy()
        for key, value in own.items():
            if key in ['textures', 'display']: result[key] = {**result.get(key, {}), **value}
            else: result[key] = value
        return result

    @functools.lru_cache(maxsize=2048)
    def texture(self, name):
        path = self.resource(name, 'textures', '.png')
        image = Image.open(io.BytesIO(self.zip.read(path))).convert('RGBA')
        if path+'.mcmeta' in self.names or image.height > image.width:
            metadata = self.read(path+'.mcmeta').get('animation', {}) if path+'.mcmeta' in self.names else {}
            width = metadata.get('width', image.width)
            height = metadata.get('height', min(image.height, width))
            first = metadata.get('frames', [0])[0]
            index = first.get('index', 0) if isinstance(first, dict) else first
            columns = image.width // width
            left, top = (index % columns)*width, (index // columns)*height
            image = image.crop((left, top, left+width, top+height))
        return image

    def texture_name(self, value, textures):
        seen = set()
        while value.startswith('#'):
            if value in seen: raise ValueError('Texture reference cycle')
            seen.add(value); value = textures[value[1:]]
        return value

    def choose(self, node):
        kind = node['type'].removeprefix('minecraft:')
        if kind == 'select':
            if node.get('property') == 'minecraft:display_context':
                for case in node.get('cases', []):
                    if 'gui' in ([case['when']] if isinstance(case['when'], str) else case['when']): return self.choose(case['model'])
            return self.choose(node['fallback'])
        if kind == 'condition': return self.choose(node['on_false'])
        if kind == 'range_dispatch': return self.choose(node['fallback'])
        return node

    @staticmethod
    def cube(start, dimensions, offset, texture):
        x, y, z = dimensions; u, v = offset
        rectangles = {'west': [u,v+z,u+z,v+z+y], 'north': [u+z,v+z,u+z+x,v+z+y],
                      'east': [u+z+x,v+z,u+2*z+x,v+z+y], 'south': [u+2*z+x,v+z,u+2*z+2*x,v+z+y],
                      'up': [u+z,v,u+z+x,v+z], 'down': [u+z+x,v,u+2*x+z,v+z]}
        return {'from': start, 'to': [a+b for a,b in zip(start, dimensions)],
                'faces': {face: {'texture': texture, 'uv': [n/4 for n in uv]} for face,uv in rectangles.items()}}

    def special(self, node):
        special = node['model']; kind = special['type'].removeprefix('minecraft:')
        if kind == 'chest':
            texture = 'minecraft:entity/chest/' + special['texture'].split(':')[-1]
            elements = [self.cube([1,0,1], [14,10,14], [0,19], texture), self.cube([1,9,1], [14,5,14], [0,0], texture), self.cube([7,7,15], [2,4,1], [0,0], texture)]
            return {'elements': elements, 'display': {'gui': {'rotation': [30,45,0], 'scale': [.625]*3}}}
        if kind == 'copper_golem_statue':
            texture = special['texture'].removeprefix('minecraft:textures/').removesuffix('.png')
            # Standing mesh box positions/UV offsets from Java 26.3's model.
            boxes = [([-4,-11,-3],[8,6,6],[0,15]), ([-4,-16,-5],[8,5,10],[0,0]),
                     ([-1,-13,-6],[2,3,2],[56,0]), ([-1,-20,-1],[2,4,2],[37,8]),
                     ([-2,-24,-2],[4,4,4],[37,0]), ([-7,-12,-2],[3,10,4],[36,16]),
                     ([4,-12,-2],[3,10,4],[50,16]), ([-4,-5,-2],[4,5,4],[0,27]), ([0,-5,-2],[4,5,4],[16,27])]
            elements = [self.cube([x+8,-y-dy,z+8], [dx,dy,dz], uv, texture) for (x,y,z),(dx,dy,dz),uv in boxes]
            return {'elements': elements, 'display': {'gui': {'rotation': [15,210,0], 'scale': [.5]*3, 'translation': [0,-4,0]}}}
        raise ValueError('Unsupported special renderer: '+kind)

    def render(self, definition):
        node = self.choose(definition['model'])
        if node['type'] == 'minecraft:composite':
            # Composite bed halves use their block geometry in a single preview.
            elements = []
            for child in node['models']:
                part = self.model(self.choose(child)['model'])
                transformation = child.get('transformation', {})
                translation = transformation.get('translation', [0,0,0])
                reverse = transformation.get('left_rotation', [0,0,0,1])[1] == 1
                for raw in part.get('elements', []):
                    item = json.loads(json.dumps(raw))
                    points = [[(-p[0] if reverse else p[0])+16*translation[0], p[1]+16*translation[1], (-p[2] if reverse else p[2])+16*translation[2]] for p in [item['from'], item['to']]]
                    item['from'] = [min(p[i] for p in points) for i in range(3)]
                    item['to'] = [max(p[i] for p in points) for i in range(3)]
                    for face in item['faces'].values(): face['texture'] = self.texture_name(face['texture'], part.get('textures', {}))
                    elements.append(item)
            return self.geometry({'elements': elements, 'display': {'gui': {'rotation': [30,225,0], 'scale': [.4]*3}}}, [])
        model = self.special(node) if node['type'] == 'minecraft:special' else self.model(node['model'])
        textures = model.get('textures', {})
        layers = sorted([key for key in textures if key.startswith('layer')])
        if layers and not model.get('elements'):
            result = Image.new('RGBA', (64,64))
            for key in layers:
                name = self.texture_name(textures[key], textures)
                image = self.texture(name).resize((64,64), Image.Resampling.NEAREST)
                result.alpha_composite(image)
            return result
        return self.geometry(model, node.get('tints', []))

    def geometry(self, model, tints):
        elements = model.get('elements')
        if not elements: raise ValueError('No renderable geometry or sprite layers')
        gui = model.get('display', {}).get('gui', {})
        angles = gui.get('rotation', [30,225,0]); scale = gui.get('scale', [.625]*3); translation = gui.get('translation', [0,0,0])
        faces = []
        for element in elements:
            x,y,z = element['from']; X,Y,Z = element['to']
            vertices = {'north': [(x,y,z),(x,Y,z),(X,Y,z),(X,y,z)], 'south': [(X,y,Z),(X,Y,Z),(x,Y,Z),(x,y,Z)],
                        'east': [(X,y,z),(X,Y,z),(X,Y,Z),(X,y,Z)], 'west': [(x,y,Z),(x,Y,Z),(x,Y,z),(x,y,z)],
                        'up': [(x,Y,z),(x,Y,Z),(X,Y,Z),(X,Y,z)], 'down': [(x,y,Z),(x,y,z),(X,y,z),(X,y,Z)]}
            default_uv = {'north':[16-X,16-Y,16-x,16-y], 'south':[x,16-Y,X,16-y], 'west':[z,16-Y,Z,16-y], 'east':[16-Z,16-Y,16-z,16-y], 'up':[x,z,X,Z], 'down':[x,16-Z,X,16-z]}
            for direction, face in element['faces'].items():
                points = []
                for vertex in vertices[direction]:
                    if 'rotation' in element:
                        r = element['rotation']; origin = r.get('origin', [8,8,8]); axis = 'xyz'.index(r['axis'])
                        a = [0,0,0]; a[axis] = r['angle']; vertex = [n+o for n,o in zip(rotate([v-o for v,o in zip(vertex,origin)],a),origin)]
                    point = rotate([n-8 for n in vertex], angles)
                    points.append([(point[i]*scale[i]+translation[i]) for i in range(3)])
                a = [points[1][i]-points[0][i] for i in range(3)]; b = [points[2][i]-points[0][i] for i in range(3)]
                if a[0]*b[1]-a[1]*b[0] <= 0: continue
                texture = self.texture(self.texture_name(face['texture'], model.get('textures', {})))
                uv = face.get('uv', default_uv[direction]); box = [n*texture.width/16 for n in uv]
                left,top,right,bottom = box
                image = texture.crop((min(left,right),min(top,bottom),max(left,right),max(top,bottom)))
                if image.width == 0 or image.height == 0: continue
                if right < left: image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                if bottom < top: image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                if face.get('rotation'): image = image.rotate(-face['rotation'], expand=True)
                tint_index = face.get('tintindex', -1)
                if 0 <= tint_index < len(tints):
                    tint = tints[tint_index]; color = tint.get('value', tint.get('default', 0xffffff))
                    if isinstance(color,int):
                        channels = image.split(); rgb = [channels[i].point(lambda v,c=((color >> (16-i*8))&255): v*c//255) for i in range(3)]
                        image = Image.merge('RGBA', (*rgb,channels[3]))
                brightness = {'up':1,'down':.55,'north':.75,'south':.75,'east':.86,'west':.86}[direction]
                alpha = image.getchannel('A'); image = ImageEnhance.Brightness(image).enhance(brightness); image.putalpha(alpha)
                faces.append((sum(p[2] for p in points)/4, points, image))
        if not faces: raise ValueError('Empty projection')
        points = [p for _,quad,_ in faces for p in quad]
        min_x,max_x = min(p[0] for p in points),max(p[0] for p in points)
        min_y,max_y = min(p[1] for p in points),max(p[1] for p in points)
        factor = min(3.8, 58/max(max_x-min_x,max_y-min_y))
        center_x,center_y = (min_x+max_x)/2,(min_y+max_y)/2
        resolution = 192; result = Image.new('RGBA',(resolution,resolution))
        for _,quad,image in sorted(faces,key=lambda face:face[0]):
            screen = [((p[0]-center_x)*factor*3+96,96-(p[1]-center_y)*factor*3) for p in quad]
            # UV: lower-left, upper-left, upper-right, lower-right.
            p0,p1,p2,p3 = screen; ax,ay = (p2[0]-p1[0])/image.width,(p2[1]-p1[1])/image.width
            bx,by = (p0[0]-p1[0])/image.height,(p0[1]-p1[1])/image.height
            determinant = ax*by-ay*bx
            if abs(determinant)<1e-8:continue
            affine = (by/determinant,-bx/determinant,(-by*p1[0]+bx*p1[1])/determinant,
                      -ay/determinant,ax/determinant,(ay*p1[0]-ax*p1[1])/determinant)
            layer=image.transform((resolution,resolution),Image.Transform.AFFINE,affine,Image.Resampling.NEAREST)
            mask=Image.new('L',(resolution,resolution));ImageDraw.Draw(mask).polygon(screen,fill=255)
            layer.putalpha(Image.composite(layer.getchannel('A'),Image.new('L',layer.size),mask));result.alpha_composite(layer)
        return result.resize((64,64),Image.Resampling.LANCZOS)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--jar',required=True);parser.add_argument('--metadata',required=True);args=parser.parse_args()
    archive=pathlib.Path(args.jar);metadata=json.loads(pathlib.Path(args.metadata).read_text());client=metadata['downloads']['client']
    if hashlib.sha1(archive.read_bytes()).hexdigest()!=client['sha1']:raise SystemExit('Client SHA-1 mismatch; import stopped')
    renderer=Renderer(archive)
    baseline=ROOT/'data/legacy-icons.json'
    if baseline.exists(): existing=set(json.loads(baseline.read_text()))
    else:
        existing={p.stem.removeprefix('minecraft_') for p in (ROOT/'public/icons').glob('*.png')}
        previous=ROOT/'data/minecraft-source.json'
        if previous.exists():existing-={item['id'] for item in json.loads(previous.read_text()).get('added',[])}
        baseline.parent.mkdir(exist_ok=True);baseline.write_text(json.dumps(sorted(existing),indent=2)+'\n')
    added=[];missing=[]
    for name in sorted(renderer.names):
        if not name.startswith('assets/minecraft/items/') or not name.endswith('.json'):continue
        identifier=pathlib.PurePosixPath(name).stem
        if identifier in existing:continue
        try:
            image=renderer.render(renderer.read(name))
            if not image.getbbox():raise ValueError('Transparent output')
            target=ROOT/'public/icons'/f'minecraft_{identifier}.png';image.save(target,optimize=True)
            added.append({'id':identifier,'definition':name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
        except Exception as error:missing.append({'id':identifier,'reason':str(error)})
    official=sorted(pathlib.PurePosixPath(name).stem for name in renderer.names if name.startswith('assets/minecraft/items/') and name.endswith('.json'))
    report={'minecraft':metadata['id'],'officialItems':official,'client':{'url':client['url'],'sha1':client['sha1'],'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},'renderer':'mcicons-software-preview-v1','added':added,'unavailable':missing}
    (ROOT/'data').mkdir(exist_ok=True);(ROOT/'data/minecraft-source.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'minecraft':metadata['id'],'added':len(added),'unavailable':missing},indent=2))

if __name__=='__main__':main()
