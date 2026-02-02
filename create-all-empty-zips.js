import JSZip from 'jszip';
import fs from 'node:fs/promises';

const libraries = [
  'fonts',
  'openscad',
  'MCAD',
  'BOSL',
  'BOSL2',
  'NopSCADlib',
  'boltsparts',
  'brailleSCAD',
  'FunctionalOpenSCAD',
  'OpenSCAD-Snippet',
  'funcutils',
  'smooth-prim',
  'closepoints',
  'plot-function',
  'openscad-tray',
  'lasercut',
  'YAPP_Box',
  'Stemfie_OpenSCAD',
  'UB.scad',
  'pathbuilder',
  'openscad_attachable_text3d'
];

for (const lib of libraries) {
  const zip = new JSZip();
  zip.file('README.txt', `This is a placeholder for ${lib} library.`);
  
  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await fs.writeFile(`public/libraries/${lib}.zip`, content);
  console.log(`Created empty ${lib}.zip`);
}

console.log('All empty library ZIPs created successfully!');
