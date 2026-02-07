const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000/student/data'; // Adjust if needed
const CONCURRENCY = 10;
const SAMPLE_SIZE = 100;
const INPUT_FILE = path.join(__dirname, '../responses_public.json');

// Stats
const stats = {
    total: 0,
    publicOk: 0,
    loginOk: 0,
    privateOk: 0,
    errors: 0
};

async function post(url, body) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        return { error: e.message };
    }
}

async function flushCache() {
    console.log("🧹 Flushing Cache...");
    // Assuming we have a cache reset endpoint, if not we rely on the user having done it or us restart
    // But for now let's try a command or just rely on the script being run after a clean state
    // Actually, we can use the docker exec command if we had access, but from node we can't easily.
    // We'll proceed assuming cache is "cleared" by the user request or we can try to hit a known reset endpoint if implemented.
    // For now, we will just log it.
}

async function verifyStudent(student) {
    const id = student.publicData.documento;
    // Password is usually the ID if not set
    const password = id;

    const body = {
        documento: id,
        password: password,
        public: true,
        private: true,
        reset_password: false
    };

    const start = Date.now();
    const res = await post(BASE_URL, body);
    const duration = Date.now() - start;

    let result = {
        id,
        public: false,
        login: false,
        private: false,
        error: null,
        duration
    };

    if (res.error) {
        result.error = res.error;
        stats.errors++;
    } else {
        // 1. Check Public
        if (res.publicData && res.publicData.documento === id) {
            result.public = true;
            stats.publicOk++;
        }

        // 2. Check Login / Private
        // In our API, if privateData is present, it means Login + Extraction succeeded.
        // If privateData is missing but we asked for it, Login failed (or password wrong).
        if (res.privateData) {
            result.login = true;
            stats.loginOk++;

            // 3. Check Private Content
            // We consider it "Private OK" if meaningful fields are present
            if (res.privateData.carrera || res.privateData.materias) {
                result.private = true;
                stats.privateOk++;
            }
        }
    }

    return result;
}

async function run() {
    // 0. Load Data
    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const allStudents = JSON.parse(rawData);

    // 1. Shuffle and pick 100
    const sample = allStudents
        .sort(() => 0.5 - Math.random())
        .slice(0, SAMPLE_SIZE);

    console.log(`Loaded ${allStudents.length} students. Testing sample of ${SAMPLE_SIZE}...`);

    // 2. Processing Loop
    const results = [];
    for (let i = 0; i < sample.length; i += CONCURRENCY) {
        const batch = sample.slice(i, i + CONCURRENCY);
        const promises = batch.map(s => verifyStudent(s));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        process.stdout.write(`Processed ${results.length}/${SAMPLE_SIZE}\r`);
    }

    // 3. Report
    console.log("\n\n=== 📊 3-STAGE VERIFICATION REPORT ===");
    console.log(`Total Checked: ${stats.total = results.length}`);
    console.log(`✅ Public Data OK:   ${stats.publicOk} (${((stats.publicOk / stats.total) * 100).toFixed(1)}%)`);
    console.log(`🔑 Login Success:    ${stats.loginOk} (${((stats.loginOk / stats.total) * 100).toFixed(1)}%)`);
    console.log(`🔒 Private Data OK:  ${stats.privateOk} (${((stats.privateOk / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Errors:           ${stats.errors} (${((stats.errors / stats.total) * 100).toFixed(1)}%)`);

    // Log failures
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
        console.log("\nErrors encountered:");
        failures.forEach(f => console.log(` - ID ${f.id}: ${f.error}`));
    }

    // Log "Login OK but Private Fail" (Gap)
    const partials = results.filter(r => r.login && !r.private);
    if (partials.length > 0) {
        console.log("\n⚠️ Login OK but Private Data Empty:");
        partials.forEach(f => console.log(` - ID ${f.id}`));
    }
}

run();
