"""Original procedural game prop for Tidemark. Run in a fresh Blender process."""
import bpy, bmesh, math, random
from mathutils import Vector
from math import pi, sin, cos
random.seed(30018); V=Vector
bpy.ops.wm.read_factory_settings(use_empty=True);sc=bpy.context.scene
art=bpy.data.collections.new('R03 | BREAKWATER');sc.collection.children.link(art);coll=art
space=bpy.data.objects.new('Casting grain coordinates',None);sc.collection.objects.link(space)
def lin(f):return ((f+.055)/1.055)**2.4 if f>.04045 else f/12.92
def col(c):return tuple(lin(int(c[i:i+2],16)/255) for i in (0,2,4))+(1,)
def material(name,a,b,mt=.0,ro=.5,scuff=.003,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=col(a);m.use_nodes=True;t=m.node_tree;n=t.nodes;add=n.new;L=t.links.new;pr=n.get('Principled BSDF');pr.inputs['Metallic'].default_value=mt;pr.inputs['Roughness'].default_value=ro
 co=add('ShaderNodeTexCoord');co.object=space;co=co.outputs['Object'];noise=add('ShaderNodeTexNoise');L(co,noise.inputs['Vector']);noise.inputs['Scale'].default_value=6;noise.inputs['Detail'].default_value=4;noise.inputs['Roughness'].default_value=.7;r=add('ShaderNodeValToRGB');r.color_ramp.elements[0].position=.24;r.color_ramp.elements[0].color=col(a);r.color_ramp.elements[1].position=.78;r.color_ramp.elements[1].color=col(b);L(noise.outputs['Fac'],r.inputs[0]);L(r.outputs[0],pr.inputs['Base Color']);rr=add('ShaderNodeMapRange');rr.inputs['To Min'].default_value=max(.035,ro-.22);rr.inputs['To Max'].default_value=min(.99,ro+.18);L(noise.outputs['Fac'],rr.inputs[0]);L(rr.outputs[0],pr.inputs['Roughness']);
 if scuff:
  fine=add('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=170;fine.inputs['Detail'].default_value=2;L(co,fine.inputs[0]);bump=add('ShaderNodeBump');bump.inputs['Distance'].default_value=scuff;bump.inputs['Strength'].default_value=.26;L(fine.outputs[0],bump.inputs['Height']);L(bump.outputs[0],pr.inputs['Normal'])
 if emit:pr.inputs['Emission Color'].default_value=col(b);pr.inputs['Emission Strength'].default_value=emit
 return m
steel=material('Blued forged steel','252f32','47565a',.8,.4);edge=material('Burnished contact edges','596463','939a90',.88,.38);dark=material('Recessed graphite','101615','242c2c',.52,.53);paint=material('Floodwall patrol / desaturated teal enamel','314946','475e56',.55,.43,.0045);sedge=material('Oxide and battered enamel','3d4541','7c8070',.72,.48); pales=material('Sun-bleached service enamel','8e927e','b3af94',.40,.51);yellow=material('Old gantry stripe','a4612e','daa253',.46,.44);bronze=material('Burnt bronze','62412e','ad7545',.8,.37);iron=material('Gunmetal','3a4548','66736e',.81,.35);rubber=material('Black grip rubber','151b1c','343936',.03,.76,.008);fabric=material('Oil-stained storm canvas','4d5144','828471',.02,.88,.012);ribbon=material('Waxed cloth edge','6c6d56','a5a085',.01,.82,.006);aqua=material('Pulse phosphor','147068','71d6bd',.25,.27,.0005,1.65);faint=material('Cell segments','316d65','77bca0',.4,.31,.0005,.72); rust=material('Oxidised salt','523e32','997354',.47,.74);salt=material('Chalky chips','929784','d2c7a6',.27,.75);black=material('Open slot','080d0e','131917',.2,.72); red=material('Strip of rescue red','782c21','b95132',.36,.56);glass=material('Smoked reticle glass','49736c','8db9a1',.28,.17,.0003);glass.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.38

def obj(name,mesh,ma):
 o=bpy.data.objects.new(name,mesh);coll.objects.link(o);o.data.materials.append(ma);return o
def finish(o,b=0,ed=None,smooth=False):
 if b:
  if ed and ed!=o.data.materials[0]:o.data.materials.append(ed)
  mod=o.modifiers.new('Rounded struck edges','BEVEL');mod.width=b;mod.segments=3;mod.harden_normals=True;mod.affect='EDGES';mod.material=1 if len(o.data.materials)>1 else -1
 if smooth:
  for f in o.data.polygons:f.use_smooth=True
 if b:
  m=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');m.keep_sharp=True;m.weight=60
 return o
def solid(name,verts,faces,m,b=0,ed=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return finish(obj(name,me,m),b,ed)
def profile(name,pts,width,ma,y=0,b=.023,ed=None):
 n=len(pts);vs=[(x,y+d,z) for d in [-width*.5,width*.5] for x,z in pts];fs=[tuple(range(n)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];return solid(name,vs,fs,ma,b,ed)
def box(name,x,y,z,w,d,h,m,b=.015,ed=None):return profile(name,[(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)],d,m,y,b,ed)
def cyl(name,a,b,r,m,r2=None,n=32,width=.007):
 a,b=V(a),V(b);axis=b-a;u=axis.normalized().cross(V((0,0,1)) if abs(axis.normalized().z)<.8 else V((1,0,0))).normalized();v=axis.normalized().cross(u);vs=[tuple(pt+rad*(cos(k*2*pi/n)*u+sin(k*2*pi/n)*v)) for pt,rad in [(a,r),(b,r2 if r2!=None else r)] for k in range(n)];fs=[tuple(range(n)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];o=solid(name,vs,fs,m,width);return o
def rod(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=3;c.resolution_u=5;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for bp,p in zip(s.bezier_points,points):bp.co=p;bp.handle_left_type=bp.handle_right_type='AUTO'
 o=obj(name,c,m);return o
def pin(x,y,z,r=.033):
 cyl('recess', (x,y+.010,z),(x,y-.003,z),r*1.22,black,n=28,width=.002);cyl('blackened hex', (x,y-.005,z),(x,y-.016,z),r,iron,n=8,width=.002);cyl('drive recess',(x,y-.016,z),(x,y-.017,z),r*.47,black,n=6,width=0)
def stripe(name,pts,w,m,y):return profile(name,pts,w,m,y,.004)
def hollow(name,x0,x1,outer,inner,ma,n=8,zc=.34):
 vs=[];fs=[];step=2*pi/n
 for x,r in [(x0,outer),(x1,outer),(x1,inner),(x0,inner)]:
  for j in range(n): a=step*(j+.5);vs.append((x,r*cos(a),zc+r*sin(a)))
 for i in range(4):
  for j in range(n):fs.append((i*n+j,i*n+(j+1)%n,((i+1)%4)*n+(j+1)%n,((i+1)%4)*n+j))
 return solid(name,vs,fs,ma,.010)
# Silhouette: a long slotted fore-end, raised sight, down-swept cell, independent grip, open shoulder stock.
# The crown is a dark recessed game emitter with a steel blast shroud, not a large hoop.
cz=.34
cyl('Inner pulse baffle',(-3.29,0,cz),(-2.41,0,cz),.088,steel,n=36);hollow('Muzzle crown',-3.44,-3.35,.18,.096,iron,12);hollow('Crown throat',-3.38,-3.25,.111,.080,black,20);cyl('Dark emitter face',(-3.331,0,cz),(-3.322,0,cz),.082,black);hollow('Core phosphor, deep recess',-3.34,-3.335,.061,.054,faint,32);hollow('Rear shoulder',-3.12,-3.045,.173,.095,steel,12)
for k in range(8):
 a=2*pi*(k+.5)/8; radial=V((0,cos(a),sin(a)));tang=V((0,-sin(a),cos(a)));vs=[]
 for x,r,w in [(-3.38,.150,.079),(-3.095,.147,.088)]:
  for dr,dw in [(-.026,-w),(.014,-w),(.014,w),(-.026,w)]:vs.append(tuple(V((x,0,cz))+radial*(r+dr)+tang*dw*.5))
 solid('Emitter cage ribs',vs,[(0,1,2,3),(4,5,6,7)]+[(i,(i+1)%4,4+(i+1)%4,i+4) for i in range(4)],iron,.009)
for i in range(4):cyl('crown collar',(-3.056+i*.072,0,cz),(-3.035+i*.072,0,cz),.127 if i%2 else .132,steel,n=32)
# Windowed fore-end. A physical channel runs between the two edge spars.
cyl('Insulated pulse core',(-2.83,0,cz),(-.54,0,cz),.147,black,n=36)
for i in range(24):
 x=-2.55+i*.070;cyl('Oxidised winding', (x,0,cz),(x+.032,0,cz),.153,bronze,n=28,width=.004)
for s in [-1,1]:
 rod('Dim longitudinal conductor',[(-2.49,s*.143,.33),(-2.16,s*.149,.329),(-1.57,s*.151,.33),(-.96,s*.151,.33)],.019,aqua)
 rod('Parallel copper contact',[(-2.50,s*.146,.385),(-2.26,s*.15,.385),(-.95,s*.15,.385)],.011,bronze)
for a,b in [(-2.78,-2.65),(-.88,-.77)]:hollow('Fore-end bulkhead',a,b,.235,.14,steel,8)
profile('Upper shroud spine',[(-2.74,.47),(-2.58,.585),(-1.28,.60),(-1.17,.63),(-.75,.62),(-.71,.455),(-2.64,.438)],.374,paint,b=.028,ed=sedge)
profile('Lower fore-end keel',[(-2.73,.18),(-2.52,.096),(-2.39,.066),(-.88,.067),(-.71,.139),(-.74,.238),(-2.61,.236)],.368,steel,b=.025,ed=iron)
for s in [-1,1]:
 yy=s*.19
 for j in range(5):
  x=-2.59+j*.35;profile('Slanted shroud vent bridge',[(x,.465),(x+.109,.475),(x+.205,.222),(x+.093,.18)],.060,paint,yy,.015,sedge)
 profile('Hand stop',[(-2.51,.134),(-2.37,.152),(-2.32,.064),(-2.40,-.065),(-2.49,-.069)],.034,rubber,yy,.012)
 for j in range(11):
  x=-2.302+j*.123;profile('Handguard traction rib',[(x,.181),(x+.040,.181),(x+.002,.075),(x-.031,.075)],.034,rubber,s*.193,.005)
 profile('Reclaimed gantry side cheek',[(-2.69,.458),(-2.55,.538),(-2.16,.549),(-2.10,.493),(-2.15,.454),(-2.62,.425)],.035,yellow,s*.194,.010,sedge)
 for j in range(3):
  x=-2.50+j*.084;stripe('chipped chevron',[(x,.457),(x+.03,.457),(x+.087,.530),(x+.057,.529)],.003,dark,s*.214)
for x in [-2.61,-1.17,-.84]:pin(x,-.212,.508,.024)
# Main receiver. Multiple contoured plates reveal a dark split line beneath a cast upper.
body=[(-1.02,.42),(-.88,.584),(-.51,.65),(.67,.655),(1.07,.56),(1.23,.392),(1.22,.17),(1.04,.085),(.72,.048),(.45,-.077),(-.17,-.083),(-.47,-.046),(-.65,.033),(-.91,.095),(-1.045,.22)]
profile('Main casting',body,.51,steel,b=.043,ed=iron)
face=[(-.925,.395),(-.795,.519),(-.50,.580),(.642,.58),(.915,.509),(1.108,.384),(1.08,.222),(.947,.160),(.633,.151),(.425,.102),(-.485,.098),(-.834,.135),(-.935,.22)]
for s in [-1,1]:profile('Repaired floodwall enamel shell',face,.039,paint,s*.259,.022,sedge)
profile('Ejection flank insert',[(-.807,.387),(-.62,.493),(-.05,.493),(.029,.434),(-.043,.361),(-.79,.354)],.036,dark,-.281,.012,iron);box('Sliding contact plate',-.422,-.310,.427,.432,.026,.065,iron,.009);box('Pull tab',-.196,-.354,.427,.096,.091,.066,steel,.011)
for i in range(3):box('Contact cut',-.55+i*.085,-.327,.427,.029,.005,.045,black,.003)
profile('Lower receiver and cell collar',[(-.78,.11),(.766,.10),(.755,-.101),(.57,-.139),(.42,-.15),(.275,-.062),(-.124,-.071),(-.270,-.193),(-.675,-.19),(-.76,-.11)],.412,steel,b=.028,ed=iron)
profile('Upper light-catching spine',[(-.85,.565),(-.56,.664),(.775,.675),(1.023,.57),(.815,.55),(-.75,.532)],.348,iron,b=.022,ed=sedge)
for i in range(19):
 x=-1.87+i*.145
 if x<.77:profile('Top rib',[(x,.606 if x<-.85 else .655),(x+.094,.606 if x<-.85 else .655),(x+.084,.646 if x<-.85 else .695),(x+.008,.646 if x<-.85 else .695)],.176,steel,b=.007)
for x,z,r in [(-.84,.206,.038),(-.57,.536,.024),(.03,.53,.027),(.89,.442,.039),(.93,.222,.029),(.57,.13,.022),(-.63,-.079,.028)]:pin(x,-.291,z,r)
# Asymmetric blue-grey storm shutter with a shallow diagonal assembly seam and a small red selector.
profile('Tail storm shutter',[(.72,.535),(.89,.484),(1.064,.357),(1.042,.242),(.94,.192),(.77,.204),(.702,.276)],.034,iron,-.282,.015,sedge)
for j in range(3):
 x=.801+j*.057;stripe('Shutter cast flute',[(x,.244),(x+.017,.245),(x+.049,.386),(x+.032,.396)],.014,dark,-.305)
cyl('Selector pivot',(.387,-.228,.006),(.387,-.275,.006),.063,black);profile('Rescue red selector',[(.345,.018),(.382,.05),(.501,.007),(.513,-.026),(.468,-.036)],.033,red,-.29,.011)
# Pistol grip and trigger bow; open space around the control is part of the silhouette.
stockgr=[(.421,-.073),(.722,-.071),(.795,-.194),(.999,-.788),(.891,-.894),(.641,-.88),(.552,-.78),(.392,-.27),(.32,-.191)]
profile('Sloped grip core',stockgr,.298,steel,b=.034,ed=iron)
for s in [-1,1]:
 profile('Moulded rubber grip',[(.457,-.211),(.670,-.218),(.884,-.759),(.84,-.821),(.677,-.81),(.597,-.722)],.052,rubber,s*.15,.022)
 for j in range(7):
  z=-.315-j*.064;x=.507+j*.021;stripe('Pressed grip flutes',[(x,z),(x+.14,z+.032),(x+.15,z+.058),(x+.013,z+.025)],.012,dark,s*.18)
rod('Oval guard lower bow',[(-.19,0,-.10),(-.158,0,-.26),(-.08,0,-.416),(.01,0,-.438),(.395,0,-.433),(.50,0,-.356)],.037,iron)
profile('Fictional trigger',[(.27,-.08),(.33,-.087),(.33,-.171),(.267,-.278),(.171,-.292),(.15,-.269),(.209,-.236),(.25,-.169)],.078,steel,b=.012,ed=edge)
# Forward-swept chunky energy magazine with an off-white grip band and visible cell windows.
mag=[(-.656,-.104),(-.267,-.11),(-.273,-.32),(-.383,-.63),(-.567,-.954),(-.714,-1.038),(-1.006,-.938),(-.976,-.817),(-.846,-.52),(-.748,-.225)]
profile('Curved energy magazine',mag,.331,iron,b=.028,ed=sedge)
profile('Magazine floor shoe',[(-1.015,-.833),(-.573,-.931),(-.545,-1.004),(-.68,-1.095),(-1.069,-.986),(-1.084,-.922)],.382,rubber,b=.018,ed=dark)
for s in [-1,1]:
 profile('Inset ribbed magazine flank',[(-.700,-.226),(-.382,-.24),(-.421,-.506),(-.591,-.836),(-.684,-.888),(-.900,-.828),(-.784,-.481)],.026,paint,s*.172,.014,sedge)
 for j in range(3):
  x=-.74+j*.078;rod('Pressed magazine guide',[(x,s*.195,-.323),(x-.048,s*.195,-.522),(x-.141,s*.195,-.764)],.013,iron)
 profile('Salvaged enamel cell clasp',[(-.896,-.676),(-.521,-.743),(-.562,-.828),(-.93,-.766)],.035,pales,s*.184,.009,sedge)
for j in range(3):box('Remaining charge telltale',-.59+j*.063,-.199,-.286,.039,.014,.036,faint,.004)
# Offset count-back windows behind the sight, visible at shoulder height.
profile('Armoured dorsal meter',[(.557,.609),(.95,.565),(1.113,.488),(1.081,.442),(.608,.487),(.508,.542)],.133,steel,-.148,.016,iron)
for i in range(3):
 x=.668+i*.079;z=.654-(x-.557)*.23
 # Calibrated inlay lies across the tilted upper face.
 v=[(x-.022,-.191,z-.044),(x+.022,-.191,z-.054),(x+.022,-.1,z-.054),(x-.022,-.1,z-.044)];solid('Coolant status bead',v,[(0,1,2,3)],faint)
# Short open skeletal shoulder stock: articulated cheek saddle, folded spars, battered recoil pad.
cyl('Buttstock socket',(1.012,0,.36),(1.40,0,.36),.182,iron,n=20);cyl('Lock collar',(1.17,0,.36),(1.258,0,.36),.209,steel,n=12)
profile('Shoulder stock upper beam',[(1.25,.455),(1.45,.56),(2.43,.535),(2.72,.438),(2.85,.262),(2.75,.129),(2.51,.162),(2.36,.228),(1.48,.217),(1.27,.26)],.283,paint,b=.036,ed=sedge)
profile('Laminated cheek rest',[(1.50,.511),(1.67,.651),(2.366,.616),(2.545,.528),(2.519,.444),(1.544,.44)],.342,rubber,b=.034)
profile('Lower stock brace',[(1.20,.254),(1.425,.267),(1.61,.11),(2.49,-.26),(2.698,-.233),(2.775,-.07),(2.84,-.19),(2.76,-.413),(2.51,-.451),(1.43,-.027),(1.23,.065)],.138,iron,b=.025,ed=sedge)
profile('Shoulder heel',[(2.58,.46),(2.802,.461),(2.944,.36),(2.921,-.296),(2.824,-.475),(2.626,-.504),(2.56,-.395),(2.61,-.271),(2.58,.247)],.336,paint,b=.04,ed=sedge)
profile('Butt pad rubber',[(2.793,.447),(2.92,.423),(3.004,.349),(2.993,-.325),(2.887,-.522),(2.73,-.525),(2.701,-.459),(2.818,-.31),(2.887,.291)],.373,rubber,b=.025)
for j in range(6):box('Buttpad weather grooves',2.888,-.191,.246-j*.096,.087,.012,.021,dark,.003)
for x,z in [(1.383,.356),(2.65,.299),(2.69,-.318)]:pin(x,-.178,z,.032)
# The wrap only covers a hand's breadth of the salvaged cheek rest. Stitching and dirty overlap follow its contour.
for j in range(4):
 x=1.82+j*.094;vs=[];N=24
 for ofs in [-.063,.063]:
  for k in range(N):
   a=2*pi*k/N;dy=math.copysign(abs(cos(a))**.41,cos(a))*.205;dz=math.copysign(abs(sin(a))**.43,sin(a))*.248;vs.append((x+ofs+dz*.31,dy,.434+dz-.014*(x-1.82)))
 fs=[(k,(k+1)%N,N+(k+1)%N,N+k) for k in range(N)];me=bpy.data.meshes.new('Canvas strip');me.from_pydata(vs,[],fs);o=obj('Hand-wrapped storm canvas',me,fabric);sol=o.modifiers.new('Ply','SOLIDIFY');sol.thickness=.007+j*.0008
 rod('Frayed canvas hem',[(x+.049+dz*.31,dy*1.022,.434+dz*.999-.014*(x-1.82)) for dy,dz in [(-.17,-.13),(-.186,-.036),(-.186,.063),(-.169,.126),(-.112,.199),(0,.212)]],.0033,ribbon)
# Compact caged holographic optic, hollow through the rear along the sightline.
box('Sight saddle',.12,0,.713,.568,.30,.069,steel,.015,iron);profile('Optic base', [(-.175,.736),(.376,.735),(.33,.813),(-.056,.819),(-.18,.79)],.343,dark,b=.018)
for s in [-1,1]:
 profile('Open reflex sight cheeks',[(-.154,.786),(.348,.787),(.319,.867),(.206,1.041),(.092,1.068),(-.029,1.044),(-.124,.931)],.046,steel,s*.149,.021,iron)
 profile('Sight cheek tile',[(.046,.847),(.26,.845),(.173,.997),(.082,.991)],.015,paint,s*.175,.01,sedge)
box('Reflex bridge',.102,0,1.039,.209,.312,.052,steel,.020,iron)
vs=[(.065,-.123,.801),(.065,.123,.801),(.133,.123,1.018),(.133,-.123,1.018)];lens=solid('Smoked laminated reticle',vs,[(0,1,2,3)],glass)
for x in [-.08,.268]:pin(x,-.183,.784,.018)
# Replaceable ceramic service tile and fastened lower cheek, engraved side return line.
profile('Raised rear receiver seam',[(.50,.188),(.60,.219),(.71,.218),(.72,.195),(.609,.186),(.538,.156)],.016,iron,-.281,.005)
for j in range(4):
 x=-.827+j*.072;profile('Cast cooling gills',[(x,.268),(x+.028,.268),(x+.078,.326),(x+.049,.326)],.012,black,-.279,.004)
for j in range(5):
 x=-2.27+j*.18;box('Fine vent in shroud cover',x,0,.582+(x+2.27)*.012,.119,.072,.008,black,.004)
# Upper auxiliary regulator and recessed side ID.
box('Upper access plate',-.416,0,.672,.45,.228,.025,steel,.005);cyl('Regulator cap',(-.439,0,.685),(-.439,0,.73),.078,iron,n=12);box('Regulator nick',-.439,0,.731,.08,.014,.004,black,.001)
profile('Old caution badge',[(-.67,.156),(-.22,.157),(-.19,.241),(-.664,.24)],.012,yellow,-.283,.006,sedge)
# Asymmetric splices over the upper spine, a tiny maintenance cable and exposed fasteners.
rod('Short insulated repair lead',[(-1.18,-.213,.512),(-1.04,-.243,.58),(-.931,-.244,.60),(-.82,-.245,.551)],.018,black);rod('Repair wire warm stripe',[(-1.18,-.228,.512),(-1.04,-.254,.58),(-.931,-.257,.60),(-.82,-.255,.551)],.005,bronze)
for x in [-1.15,-.85]:pin(x,-.244,.53,.018)
# Directional nicks near edges and screw heads; the flat painted centres stay comparatively quiet.
chips={}
def chiptri(y,xx,zz,le,he,ang,matl):
 S=chips.setdefault(matl,[]);c,s=cos(ang),sin(ang);xy=[(-.5,0),(-.28,.56),(.25,.27),(.5,-.12),(.12,-.28),(-.4,-.34)];pts=[(xx+u*le*c-t*he*s,y,zz+u*le*s+t*he*c) for u,t in xy];S.extend([tuple((pts[0],pts[j],pts[j+1])) for j in range(1,len(pts)-1)])
def scuff(pts,y,size=1,n=210):
 cx=sum(x for x,z in pts)/len(pts);cz=sum(z for x,z in pts)/len(pts)
 for i in range(n):
  j=random.randrange(len(pts));a=V(pts[j]);b=V(pts[(j+1)%len(pts)]);pt=a.lerp(b,random.random());f=V((cx-pt.x,cz-pt.y)).normalized();pt+=f*(.016+random.random()**2*.049)*size;length=(.002+random.random()**2*.037)*size;wide=(.001+random.random()**2*.005)*size;angle=math.atan2((b-a).y,(b-a).x)+random.uniform(-.43,.43);chiptri(y,pt.x,pt.y,length,wide,angle,random.choice([sedge,iron,edge,rust]))
scuff(face,-.281,1,680);scuff([(-2.67,.458),(-2.55,.532),(-2.16,.541),(-2.14,.486),(-2.19,.457),(-2.60,.436)],-.215, .75,140);scuff([(-.892,-.685),(-.524,-.746),(-.57,-.816),(-.917,-.759)],-.203,.65,95)
for x,z in [(-.84,.206),(.89,.442),(.93,.222),(-.57,.536)]:
 for j in range(10):
  a=random.uniform(0,2*pi);rr=random.uniform(.04,.072);chiptri(-.283,x+rr*cos(a),z+rr*sin(a),random.uniform(.004,.028),.0028,a+.8,edge)
for ma,triangles in chips.items():
 vs=[v for T in triangles for v in T];me=bpy.data.meshes.new('Scratches');me.from_pydata(vs,[],[(i,i+1,i+2) for i in range(0,len(vs),3)]);obj('Exposed casings and primer',me,ma)
# Glove meshes travel with the two separate hand poses.
held=bpy.data.collections.new('FPS only | rain gear');sc.collection.children.link(held);coll=held;glove=material('Dark worn glove hide','302f29','635d47',.07,.67,.009);knuckle=material('Glove moulded ridge','262c28','454a3d',.06,.73,.009)
def ball(name,pos,scale,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos);o=bpy.context.object
 for c in list(o.users_collection):c.objects.unlink(o)
 coll.objects.link(o);o.name=name;o.scale=scale;o.data.materials.append(ma)
 for f in o.data.polygons:f.use_smooth=True
 return o
ball('Support palm',(-1.58,-.146,.017),(.30,.167,.14),glove);ball('Dominant palm',(.77,.094,-.535),(.212,.17,.253),glove)
for i in range(4):
 x=-1.81+i*.119;rod('Support finger seam',[(x,-.125,-.033),(x-.012,-.248,.027),(x-.031,-.254,.132),(x-.039,-.232,.229)],.052,glove);ball('Knuckle reinforcement',(x-.025,-.265,.120),(.052,.028,.056),knuckle)
for i in range(3):
 x=.71+i*.027;z=-.396-i*.113;rod('Gloved curled finger',[(x+.06,.06,z),(x-.072,.014,z),(x-.117,-.116,z),(x-.067,-.173,z),(x+.032,-.158,z)],.050,glove)
rod('Indexed glove finger',[(.71,.109,-.285),(.55,.081,-.227),(.44,.069,-.162),(.277,.075,-.134)],.048,glove)
