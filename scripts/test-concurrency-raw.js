const https = require('https');

// Configuration
const BASE_URL = 'https://sga.unemi.edu.ec/api/1.0/jwt';
const USERNAME = 'aalvendravom'; // Valid user
const PASSWORD = '0955453709'; // Password is often the ID by default

// Endpoints
const ENDPOINTS = {
    HOJA_VIDA: '/alumno/hoja_vida?action=loadDatosPersonales',
    MALLA: '/alumno/malla',
    HORARIO: '/alumno/horario',
    MATERIAS: '/alumno/materias'
};

// Headers builder
const getHeaders = (token = null) => {
    const h = {
        'Content-Type': 'application/json',
        'Origin': 'https://sgaestudiante.unemi.edu.ec',
        'Referer': 'https://sgaestudiante.unemi.edu.ec/login',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
};

// Helper for requests
async function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = BASE_URL + path;
        // console.log(`Requesting ${url}...`);

        fetch(url, {
            method,
            headers: getHeaders(token),
            body: body ? JSON.stringify(body) : undefined
        })
            .then(async res => {
                if (res.ok) resolve(await res.json());
                else reject(`Error ${res.status}: ${res.statusText}`);
            })
            .catch(reject);
    });
}

async function run() {
    console.log("1. Authenticating...");
    let token;
    try {
        console.log(`   Logging in as: ${USERNAME}`);
        const login = await request('POST', '/token/login', {
            username: USERNAME,
            password: PASSWORD,
            clientNavegador: 'TestScript',
            clientOS: 'TestOS',
            clientScreensize: '1080x1920',
            otp_verified_token: null
        });

        token = login.access;
        if (!token) throw new Error("No access token in login response");
        console.log("   Login success.");
    } catch (e) {
        console.error("   Authentication failed:", e);
        return;
    }

    // SERIAL
    console.log("\n2. Testing SERIAL Execution...");
    const serialStart = Date.now();
    try {
        await request('GET', ENDPOINTS.HOJA_VIDA, null, token);
        process.stdout.write('HV..');
        await request('GET', ENDPOINTS.MALLA, null, token);
        process.stdout.write('Malla..');
        await request('GET', ENDPOINTS.HORARIO, null, token);
        process.stdout.write('Horario..');
        await request('GET', ENDPOINTS.MATERIAS, null, token);
        process.stdout.write('Materias..');
        console.log(" Done.");
    } catch (e) {
        console.error("\n   Serial failed:", e);
    }
    const serialTime = Date.now() - serialStart;
    console.log(`   ⏱️ Serial Time: ${serialTime}ms`);

    // DELAY
    console.log("\n   Waiting 2s...");
    await new Promise(r => setTimeout(r, 2000));

    // PARALLEL
    console.log("\n3. Testing PARALLEL Execution...");
    const parallelStart = Date.now();
    try {
        await Promise.all([
            request('GET', ENDPOINTS.HOJA_VIDA, null, token).then(() => process.stdout.write('HV..')),
            request('GET', ENDPOINTS.MALLA, null, token).then(() => process.stdout.write('Malla..')),
            request('GET', ENDPOINTS.HORARIO, null, token).then(() => process.stdout.write('Horario..')),
            request('GET', ENDPOINTS.MATERIAS, null, token).then(() => process.stdout.write('Materias..'))
        ]);
        console.log(" Done.");
    } catch (e) {
        console.error("\n   Parallel failed:", e);
    }
    const parallelTime = Date.now() - parallelStart;
    console.log(`   ⏱️ Parallel Time: ${parallelTime}ms`);

    // RESULT
    console.log("\n=== RESULT ===");
    console.log(`Speed Improvement: ${(serialTime / parallelTime).toFixed(2)}x`);
    if (parallelTime < serialTime) console.log("✅ PARALLEL IS FASTER");
    else console.log("⚠️ PARALLEL IS SLOWER (Server might imply locks)");
}

run();
