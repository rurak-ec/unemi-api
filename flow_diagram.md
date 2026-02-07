# Flujo de Lógica: unemi-api

Este diagrama detalla cómo se procesan las peticiones en el `StudentService`.

```mermaid
graph TD
    A([Inicio: POST /student/data]) --> B{¿Está en Cache?}
    
    B -- Sí --> B1([Retornar Cache])
    
    B -- No --> C[Búsqueda SGA + Posgrado + Matriculación]
    
    C --> D{¿Usuario encontrado?}
    D -- No --> D1([Retornar 'No existe'])
    
    D -- Sí --> E{¿Solo Público?}
    E -- Sí --> E1([Retornar Datos Públicos])
    
    E -- No --> F[Login SGA]
    
    F -- Falla --> G{¿Reset Password?}
    G -- No --> E1
    G -- Sí --> H[Reset Matriculación + Login]
    H --> I
    
    F -- Éxito --> I{¿Múltiples Carreras?}
    I -- Sí --> J[SGA: Cambiar a Carrera 1]
    J --> K
    I -- No --> K[SGA: Descargar Todo]
    
    K --> L{¿Bloqueo SGA?}
    L -- Ficha --> L1([Retornar Ficha Obligatoria])
    L -- Clave --> L2[Flujo Cambio Clave]
    L -- OK --> M([Retornar Datos Completos])
    
    L2 --> M
```

### Casos Principales
1.  **Cédula no registrada**: Se detecta en la búsqueda inicial.
2.  **Solo consulta pública**: No requiere contraseña, usa datos de "recuperación de cuenta".
3.  **Consulta privada completa**: Requiere login. Si falla y se habilita `reset_password`, intenta forzar el acceso con la clave por defecto.
4.  **Bloqueos administrativos**: Detectados post-login (Ficha o cambio de clave obligatorio).
