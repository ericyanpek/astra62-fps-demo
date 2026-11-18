"""Export the approved Blender prop, using compact, indexed batches for its moving parts.
Run with Blender's Python + the lz4 library. The actual game only needs the resulting mesh.
Coordinates in the file are already right/up/back, as used by the Three.js viewmodel.
"""
import ctypes, ctypes.util, struct, math, sys, os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent));import model as m
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent; out=P.parents[2]/'src/breakwater.mesh'; parts=['body','mag','slide','left','right','coil','glass','gauge0','gauge1','gauge2']; meshes={p:[] for p in parts}; palette=[]; palIDs={}; bvPts=[];bvFaces=[]
def material(mat):
 name=mat.name
 if name in palIDs:return palIDs[name]
 p=mat.node_tree.nodes['Principled BSDF'];r=next(n for n in mat.node_tree.nodes if n.type=='VALTORGB').color_ramp
 def srgb(x):return 1.055*x**(1/2.4)-.055 if x>.0031308 else 12.92*x
 val=[round(255*srgb((a+b)*.5)) for a,b in zip(list(r.elements[0].color)[:3],list(r.elements[1].color)[:3])];val.extend([round(255*p.inputs['Metallic'].default_value),round(255*p.inputs['Roughness'].default_value)]);palIDs[name]=len(palette);palette.append(val);return len(palette)-1
def octa(v):
 x,y,z=v;x,y,z=x/(k:=abs(x)+abs(y)+abs(z)),y/k,z/k
 if z<0:x,y=(1-abs(y))*(-1 if x<0 else 1),(1-abs(x))*(-1 if y<0 else 1)
 return (round(x*127),round(y*127))
mag=('Curved energy','Magazine floor','Inset ribbed magazine','Pressed magazine','Salvaged enamel cell','Remaining charge');slide=('Sliding contact','Pull tab','Contact cut')
for o in [*m.art.objects,*m.held.objects]:
 for mod in o.modifiers:
  if mod.type=='BEVEL':mod.segments=1 if mod.width<.013 else 2
 if o.type=='CURVE':o.data.resolution_u=3;o.data.bevel_resolution=1
m.bpy.context.view_layer.update();deps=m.bpy.context.evaluated_depsgraph_get()
for o in [*m.art.objects,*m.held.objects]:
 n=o.name
 ev=o.evaluated_get(deps);g=ev.to_mesh();g.calc_loop_triangles();M=ev.matrix_world;N=M.to_3x3().inverted().transposed();pos=[M@v.co for v in g.vertices];norms=g.corner_normals
 if o.name in m.held.objects:
  part='left' if n.startswith(('Support','Knuckle reinforcement')) else 'right'
 else:part='mag' if n.startswith(mag) else 'slide' if n.startswith(slide) else 'glass' if n.startswith('Smoked laminated') else 'coil' if n.startswith(('Dim longitudinal','Core phosphor')) else 'gauge'+str(int(n.rsplit('.',1)[1]) if '.' in n else 0) if n.startswith('Coolant status bead') else 'body'
 if part in ('body','mag','slide') and not n.startswith('Exposed casings'):
  offset=len(bvPts);bvPts.extend(pos);bvFaces.extend([tuple(offset+v for v in f.vertices) for f in g.loop_triangles]);
 for f in g.loop_triangles:
  if f.area<1e-11:continue
  mi=material(g.materials[f.material_index]);tri=[]
  for li in f.loops:
   p=pos[g.loops[li].vertex_index];normal=(N@(norms[li].vector if norms[li].vector.length_squared>.01 else f.normal)).normalized();ix,iy,iz=[round(k*6000) for k in (p.y,p.z,p.x)];nx,ny=octa((normal.y,normal.z,normal.x));tri.append(((ix,iy,iz,nx,ny,mi),p.copy(),normal))
  batch='mag' if n.startswith('Exposed casings') and all(p.z<-.63 and p.x<-.4 for _,p,_ in tri) else part
  meshes[batch].append(tri)
 ev.to_mesh_clear()
tree=BVHTree.FromPolygons(bvPts,bvFaces,all_triangles=True);rays=[]
for i in range(12):
 t=(i+.5)/12;a=i*2.399963;r=math.sqrt(t);rays.append((r*math.cos(a),r*math.sin(a),math.sqrt(1-t)))
def planes(block,stride):
 out=bytearray()
 for i in range(stride):
  prev=0
  for b in block[i::stride]:out.append((b-prev)&255);prev=b
 return out
pack=struct.pack;buf=bytearray(b'BW03'+bytes([len(palette),len(parts)]));[buf.extend(bytes(row)) for row in palette];counts=[];cache={}
for part in parts:
 vertices=[];indices=[];seen={}
 for tri in meshes[part]:
  for key,location,normal in tri:
   if key not in seen:
    seen[key]=len(vertices);tkey=key[:5];ao=255
    if part not in ('glass','coil') and not part.startswith('gauge'):
     if tkey not in cache:
      a=normal.orthogonal().normalized();b=normal.cross(a);o=location+normal*.008;occ=0
      for x,y,z in rays:
       hit=tree.ray_cast(o,x*a+y*b+z*normal,.48)[3];occ+=0 if hit is None else (1-min(1,hit/.48))**2
      cache[tkey]=round(255*(1-.48*occ/len(rays)))
     ao=cache[tkey]
    vertices.append(pack('<3h2b2B',*key,ao))
   indices.append(seen[key])
 assert 0<len(vertices)<65536,(part,len(vertices));buf.extend(pack('<HI',len(vertices),len(indices)));buf.extend(planes(b''.join(vertices),10));buf.extend(planes(pack('<%dH'%len(indices),*indices),2));counts.append((part,len(vertices),len(indices)//3))
# LZ4 block (not a frame); build.py embeds it verbatim into the offline HTML.
lib=os.getenv('LZ4_LIBRARY') or ctypes.util.find_library('lz4')
if not lib:raise RuntimeError('Set LZ4_LIBRARY to the path of liblz4.')
lz=ctypes.CDLL(lib);dst=ctypes.create_string_buffer(lz.LZ4_compressBound(len(buf)));n=lz.LZ4_compress_HC(bytes(buf),dst,len(buf),len(dst),12);assert n>0;out.write_bytes(pack('<I',len(buf))+dst.raw[:n]);print(counts,'packed bytes:',n,flush=True)
