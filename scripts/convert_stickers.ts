import TGS from 'tgs-to';
import path from 'path';
import { readdir } from 'fs/promises';

async function convertStickers() {
    try {
        // Get all TGS files from stickers directory
        const files = await readdir('stickers');
        const tgsFiles = files.filter(file => file.endsWith('.tgs'));

        console.log(`Found ${tgsFiles.length} TGS files to convert`);

        for (const tgsFile of tgsFiles) {
            const baseName = path.basename(tgsFile, '.tgs');
            const tgsPath = path.join('stickers', tgsFile);
            const gifPath = path.join('images', `${baseName}.gif`);

            console.log(`Converting ${tgsFile} to GIF...`);

            try {
                const tgs = new TGS(tgsPath);
                
                // Convert directly to GIF
                await tgs.convertToGif(gifPath);
                console.log(`Created ${gifPath}`);
            
            } catch (error) {
                console.error(`Error converting ${tgsFile}:`, error);
            }
        }

        console.log('All conversions completed!');
    } catch (error) {
        console.error('Error processing stickers:', error);
    }
}

// Run the conversion
convertStickers(); 