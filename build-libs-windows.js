#!/usr/bin/env node

import { exec } from 'node:child_process';
import { createWriteStream, existsSync, readdirSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { promisify } from 'node:util';
import JSZip from 'jszip';

const execAsync = promisify(exec);

async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

async function downloadFile(url, outputPath) {
    console.log(`Downloading ${url}`);
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                return downloadFile(response.headers.location, outputPath)
                    .then(resolve)
                    .catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed: ${response.statusCode}`));
                return;
            }
            const fileStream = createWriteStream(outputPath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function cloneRepo(repo, targetDir, branch = 'master') {
    console.log(`Cloning ${repo}...`);
    try {
        await execAsync(`git clone --depth 1 --branch ${branch} --single-branch ${repo} ${targetDir}`);
    } catch (error) {
        console.error(`Failed to clone ${repo}:`, error.message);
        throw error;
    }
}

function matchesPattern(filePath, pattern) {
    const normalized = filePath.replace(/\\/g, '/');
    
    if (pattern.includes('**/*.')) {
        const ext = pattern.split('.').pop();
        return normalized.endsWith('.' + ext);
    }
    if (pattern.includes('**')) {
        const part = pattern.replace('**/', '').replace('/**', '');
        return normalized.includes(part);
    }
    if (pattern.includes('*.')) {
        const ext = pattern.split('.').pop();
        return normalized.endsWith('.' + ext);
    }
    if (pattern.includes('/')) {
        return normalized.includes(pattern) || normalized.endsWith(pattern);
    }
    return normalized.includes(pattern);
}

async function addFilesToZip(zip, baseDir, includes, excludes, prefix = '') {
    const files = readdirSync(baseDir);
    
    for (const file of files) {
        const fullPath = path.join(baseDir, file);
        const relativePath = path.join(prefix, file).replace(/\\/g, '/');
        const stat = statSync(fullPath);
        
        // Check excludes
        if (excludes.some(pattern => matchesPattern(relativePath, pattern))) {
            continue;
        }
        
        if (stat.isDirectory()) {
            await addFilesToZip(zip, fullPath, includes, excludes, relativePath);
        } else {
            // Check includes
            const shouldInclude = includes.length === 0 || 
                includes.some(pattern => matchesPattern(relativePath, pattern));
            
            if (shouldInclude) {
                const content = await fs.readFile(fullPath);
                zip.file(relativePath, content);
            }
        }
    }
}

async function createZipFromDir(sourceDir, outputPath, includes = [], excludes = []) {
    console.log(`Creating ${path.basename(outputPath)}...`);
    const zip = new JSZip();
    
    await addFilesToZip(zip, sourceDir, includes, excludes);
    
    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    await fs.writeFile(outputPath, content);
}

async function buildLibrary(library, libsDir, publicLibsDir) {
    const libDir = path.join(libsDir, library.name);
    const zipPath = path.join(publicLibsDir, `${library.name}.zip`);
    
    if (!existsSync(libDir)) {
        await cloneRepo(library.repo, libDir, library.branch);
    }
    
    const workingDir = library.workingDir ? path.join(libDir, library.workingDir) : libDir;
    await createZipFromDir(
        workingDir,
        zipPath,
        library.zipIncludes || ['*.scad'],
        library.zipExcludes || []
    );
}

async function buildFonts(config, libsDir, publicLibsDir) {
    console.log('Building fonts...');
    const notoDir = path.join(libsDir, 'noto');
    const liberationDir = path.join(libsDir, 'liberation');
    
    await ensureDir(notoDir);
    
    // Download Noto fonts
    for (const font of config.fonts.notoFonts) {
        const fontPath = path.join(notoDir, font);
        if (!existsSync(fontPath)) {
            const url = config.fonts.notoBaseUrl + font;
            await downloadFile(url, fontPath);
        }
    }
    
    // Clone liberation fonts
    if (!existsSync(liberationDir)) {
        await cloneRepo(config.fonts.liberationRepo, liberationDir, config.fonts.liberationBranch);
    }
    
    // Create fonts.zip
    const zip = new JSZip();
    
    // Add fonts.conf
    const fontsConf = await fs.readFile('fonts.conf');
    zip.file('fonts.conf', fontsConf);
    
    // Add Noto fonts
    const notoFiles = readdirSync(notoDir);
    for (const file of notoFiles) {
        if (file.endsWith('.ttf')) {
            const content = await fs.readFile(path.join(notoDir, file));
            zip.file(file, content);
        }
    }
    
    // Add Liberation fonts
    const liberationFiles = readdirSync(liberationDir);
    for (const file of liberationFiles) {
        if (file.endsWith('.ttf') || file === 'LICENSE' || file === 'AUTHORS') {
            const content = await fs.readFile(path.join(liberationDir, file));
            zip.file(file, content);
        }
    }
    
    const fontsZip = path.join(publicLibsDir, 'fonts.zip');
    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    await fs.writeFile(fontsZip, content);
    console.log('Fonts built successfully');
}

async function main() {
    const configContent = await fs.readFile('libs-config.json', 'utf-8');
    const config = JSON.parse(configContent);
    
    const libsDir = 'libs';
    const publicLibsDir = 'public/libraries';
    
    await ensureDir(libsDir);
    await ensureDir(publicLibsDir);
    
    // Build fonts
    await buildFonts(config, libsDir, publicLibsDir);
    
    // Build libraries
    for (const library of config.libraries) {
        try {
            await buildLibrary(library, libsDir, publicLibsDir);
            console.log(`✓ ${library.name}`);
        } catch (error) {
            console.error(`✗ ${library.name}:`, error.message);
        }
    }
    
    console.log('\nBuild completed!');
}

main().catch(console.error);
