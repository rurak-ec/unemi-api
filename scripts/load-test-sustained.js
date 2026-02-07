const fs = require('fs');
const path = require('path');

// CONFIGURATION
const API_URL = 'http://localhost:3000/student/reset';
const CSV_FILE = path.join(__dirname, '../Módulos de Ingles-StudenDataBase.csv');

// LOAD TEST CONFIG
const BATCH_SIZE = 100;        // User requested 100 for reset
const DURATION_MINUTES = 1;    // User requested 60 seconds
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const SLEEP_BETWEEN_BATCHES_MS = 1000;
const OUTPUT_FILE = path.join(__dirname, '../responses_reset.json');

// Initialize output file
fs.writeFileSync(OUTPUT_FILE, '[\n'); // Start JSON array

let totalProcessed = 0;
let totalSuccess = 0;
let totalErrors = 0;
let totalFound = 0;

// Helper to validate a single ID
async function validateId(identificacion) {
    try {
        // Simplified body for /public endpoint
        const body = JSON.stringify({
            documento: identificacion
        });

        const start = Date.now();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });
        const duration = Date.now() - start;

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}`, duration };
        }

        const data = await response.json();

        // Check if we actually found data
        const found = !!(data.publicData && (data.publicData.sga || data.publicData.posgrado || data.publicData.matriculacion || data.publicData.unemi_id));

        return { success: true, duration, found, data };

    } catch (error) {
        return { success: false, error: error.message, duration: 0, found: false };
    }
}

async function processBatch(items) {
    const startBatch = Date.now();
    const promises = items.map(item => validateId(item));
    const results = await Promise.all(promises);
    const endBatch = Date.now();
    const totalDuration = endBatch - startBatch;

    const errorCount = results.filter(r => !r.success).length;

    if (errorCount > 0) {
        const uniqueErrors = [...new Set(results.filter(r => !r.success).map(r => r.error))];
        console.log(`Unique Errors in batch: ${JSON.stringify(uniqueErrors)}`);
    }

    const foundCount = results.filter(r => r.found).length;

    // Write successful and found results to file
    const successfulData = results.filter(r => r.success && r.found && r.data).map(r => r.data);
    if (successfulData.length > 0) {
        const jsonChunk = successfulData.map(d => JSON.stringify(d)).join(',\n');
        fs.appendFileSync(OUTPUT_FILE, jsonChunk + ',\n');
    }

    const fps = (items.length / (totalDuration / 1000)).toFixed(2);

    totalProcessed += items.length;
    totalSuccess += (items.length - errorCount);
    totalErrors += errorCount;
    totalFound += foundCount;

    return { duration: totalDuration, fps, errorCount, foundCount };
}

async function run() {
    console.log(`Starting Sustained Load Test: ${DURATION_MINUTES} Minutes @ Batch Size ${BATCH_SIZE}...`);

    // 1. Read and Shuffle Documents
    const content = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = content.split(/\r?\n/);
    const documents = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length > 4 && cols[4] && cols[4].trim() !== '') {
            documents.push(cols[4].trim());
        }
    }
    console.log(`Loaded pool of ${documents.length} documents.`);

    const startTime = Date.now();
    const endTime = startTime + DURATION_MS;
    let batchIndex = 0;

    while (Date.now() < endTime) {
        // Pick 200 IDs (cycling)
        const batchItems = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
            const docIndex = (batchIndex * BATCH_SIZE + i) % documents.length;
            batchItems.push(documents[docIndex]);
        }

        const res = await processBatch(batchItems);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const remaining = ((endTime - Date.now()) / 1000).toFixed(0);

        console.log(`[T+${elapsed}s] Batch: ${BATCH_SIZE} | Time: ${(res.duration / 1000).toFixed(2)}s | FPS: ${res.fps} | Errors: ${res.errorCount} | Found: ${res.foundCount} | Remaining: ${remaining}s`);

        if (res.errorCount > 0) {
            console.warn(`⚠️ Warning: ${res.errorCount} errors in this batch!`);
            await new Promise(r => setTimeout(r, 2000)); // Backoff on error
        } else {
            await new Promise(r => setTimeout(r, SLEEP_BETWEEN_BATCHES_MS));
        }

        batchIndex++;
    }

    console.log("\nLoad Test Complete.");
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Total Success: ${totalSuccess}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Found: ${totalFound}`);
    console.log(`Average RPS: ${(totalProcessed / (DURATION_MINUTES * 60)).toFixed(2)}`);

    // Close JSON array (replace last comma if exists, or just close)
    // For simplicity, just appending ] - resulting JSON might have a trailing comma which is invalid standard JSON but readable
    // or we can handle it better, but for speed:
    fs.appendFileSync(OUTPUT_FILE, '{}]');
    console.log(`Responses saved to: ${OUTPUT_FILE}`);
}

run().catch(console.error);
