# R-03 Breakwater

`model.py` generates the original game prop in Blender. `export_mesh.py` bakes its surfaces and packs the rigid assemblies in `src/breakwater.mesh`. The browser draws the identification marks, readout and sleeves in `src/breakwater.js`.

To regenerate the mesh, run in a new Blender process from the repository root:

```sh
blender --background --python tools/art/breakwater/export_mesh.py
python3 src/build.py
```

The exporter uses Blender's Python API and the liblz4 shared library. If the library cannot be located automatically, set `LZ4_LIBRARY` to its absolute path. Neither dependency is needed to rebuild the HTML from the included mesh.
