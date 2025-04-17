import { Workbook } from 'exceljs';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

interface Gift {
    id: string;
    limited: boolean;
    soldOut: boolean;
    sticker: {
        id: string;
        accessHash: string;
        attributes: {
            alt: string;
        }[];
    };
    stars: number;
    availabilityTotal: number;
}

interface GiftAnalysis {
    NAME: string;
    STARS: number;
    PRICE_USD: number;
    SUPPLY: number;
    MCAP_USD: number;
    SOLD_OUT: string;
    STICKER_ID: string;
}

const STAR_PRICE_USD = 0.015; // Price of one star in USD

async function analyzeGifts() {
    try {
        // Read the JSON file
        const data = await readFile('star_gifts.json', 'utf-8');
        const giftsData = JSON.parse(data);

        // Get list of available GIF files
        const gifFiles = new Set((await readdir('images')).filter(file => file.endsWith('.gif')));
        console.log(`Found ${gifFiles.size} GIF files`);

        // Create a new workbook
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet('Star Gifts Analysis');

        // Define columns
        worksheet.columns = [
            { header: 'IMAGE', width: 30 },
            { header: 'NAME', width: 30 },
            { header: 'STARS', width: 10 },
            { header: 'PRICE_USD', width: 12 },
            { header: 'SUPPLY', width: 10 },
            { header: 'MCAP_USD', width: 15 },
            { header: 'SOLD_OUT', width: 10 },
            { header: 'STICKER_ID', width: 20 }
        ];

        // Transform and add data
        const gifts = giftsData.gifts
            .filter((gift: Gift) => gift.sticker)
            .map((gift: Gift) => {
                const name = gift.sticker.attributes?.[0]?.alt || 
                            gift.sticker.attributes?.[1]?.alt || 
                            `Gift ${gift.id}`;

                const stars = gift.stars || 0;
                const priceUsd = stars * STAR_PRICE_USD;
                const supply = gift.availabilityTotal || 0;
                const mcapUsd = priceUsd * supply;

                return {
                    id: gift.id,
                    analysis: {
                        NAME: name,
                        STARS: stars,
                        PRICE_USD: parseFloat(priceUsd.toFixed(2)),
                        SUPPLY: supply,
                        MCAP_USD: parseFloat(mcapUsd.toFixed(2)),
                        SOLD_OUT: gift.soldOut ? 'Yes' : 'No',
                        STICKER_ID: gift.sticker.id
                    }
                };
            })
            .sort((a, b) => b.analysis.MCAP_USD - a.analysis.MCAP_USD);

        // Add rows and images
        for (const gift of gifts) {
            const gifFileName = `${gift.id}.gif`;
            const hasGif = gifFiles.has(gifFileName);
            const row = worksheet.addRow(['', ...Object.values(gift.analysis)]);
            
            // Set row height for images
            row.height = 60;

            if (hasGif) {
                try {
                    const imagePath = path.join('images', gifFileName);
                    const imageId = workbook.addImage({
                        filename: imagePath,
                        extension: 'gif',
                    });

                    worksheet.addImage(imageId, {
                        tl: { col: 0, row: row.number - 1 },
                        ext: { width: 80, height: 80 }
                    });
                } catch (error) {
                    console.error(`Error adding image for gift ${gift.id}:`, error);
                }
            }
        }

        // Generate timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `star_gifts_analysis_${timestamp}.xlsx`;

        // Write to file
        await workbook.xlsx.writeFile(filename);
        console.log(`Analysis saved to ${filename}`);

        // Also log to console
        console.log('\nTop 10 gifts by MCAP:');
        gifts.slice(0, 10).forEach((gift, index) => {
            console.log(`${index + 1}. ${gift.analysis.NAME}`);
            console.log(`   Stars: ${gift.analysis.STARS}`);
            console.log(`   Price: $${gift.analysis.PRICE_USD}`);
            console.log(`   Supply: ${gift.analysis.SUPPLY}`);
            console.log(`   MCAP: $${gift.analysis.MCAP_USD}`);
            console.log(`   Sold Out: ${gift.analysis.SOLD_OUT}`);
            console.log(`   Sticker ID: ${gift.analysis.STICKER_ID}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error analyzing gifts:', error);
    }
}

// Run the analysis
analyzeGifts(); 