# Scripts de Verificación y Pruebas de Carga

Este directorio contiene las herramientas esenciales para validar la integridad de datos, rendimiento y estabilidad de la API UNEMI.

## 1. `verify-3-stages.js` (Verificación de Integridad)
**Uso:** Validar que los datos fluyen correctamente a través de las 3 capas de seguridad (Pública, Login, Privada).
```bash
node scripts/verify-3-stages.js
```
**Qué hace:**
*   Carga 100 estudiantes aleatorios de `responses_public.json`.
*   Intenta autenticarse con ellos (usando Cédula como contraseña).
*   Si logra entrar, intenta descargar su Hoja de Vida, Malla, etc.
*   **Reporte Final:** Indica el porcentaje de éxito en cada etapa.
    *   `Public Data OK`: La API responde públicamente (Debe ser 100%).
    *   `Login Success`: Usuarios que usan su Cédula como password.
    *   `Private Data OK`: Usuarios de los que se pudo extraer data real tras el login.

---

## 2. `test-concurrency-raw.js` (Benchmark de Velocidad)
**Uso:** Comparar la velocidad de descarga de datos privados (Serie vs Paralelo).
```bash
node scripts/test-concurrency-raw.js
```
**Qué hace:**
*   Se loguea con un usuario de prueba válido.
*   Descarga `hoja_vida`, `malla`, `horario`, `materias` uno por uno (Serie).
*   Descarga los mismo 4 endpoints simultáneamente (Paralelo).
*   **Resultado:** Muestra la mejora de velocidad (ej. `1.6x faster`). Útil para verificar que la refactorización de `Promise.all` funciona.

---

## 3. `load-test-sustained.js` (Prueba de Carga / Estrés)
**Uso:** Simular múltiples usuarios concurrentes para hallar el límite de la API.
```bash
node scripts/load-test-sustained.js
```
**Configuración (editar archivo):**
*   `CONCURRENCY`: Número de usuarios simultáneos (ej. 100, 500, 1000).
*   `DURATION_MS`: Duración de la prueba (ej. 60000 para 1 min).
*   `API_URL`: Endpoint a atacar (`/student/public`, `/student/private`, etc).

**Reporte:**
*   Genera un archivo `responses_*.json` con todas las respuestas.
*   Muestra en consola: RPS (Peticiones por segundo), Errores, y Latencia promedio.

---

### Notas de Mantenimiento
*   **Limpieza:** Se han eliminado scripts obsoletos (`verify-1x1`, `stress-test`, etc.) para evitar confusiones.
*   **Dependencias:** Asegúrate de tener `node` instalado y las dependencias del proyecto (`yarn install`).
