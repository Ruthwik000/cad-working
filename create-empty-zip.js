import JSZip from 'jszip';
import fs from 'node:fs/promises';

const zip = new JSZip();
zip.file('README.txt', 'This library could not be downloaded.');

const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
await fs.writeFile('public/libraries/funcutils.zip', content);
console.log('Created empty funcutils.zip');
