# INSTRUCCIONES PARA VERSION PORTABLE (SIN INSTALACION)

Esta version esta diseñada para ejecutarse en computadoras donde no se puede instalar software (como Node.js).

## Pasos de Preparacion (Solo una vez)

1.  Crea una carpeta nueva llamada `bin` dentro de esta carpeta del proyecto.
2.  Descarga el ejecutable de Node.js (version portable) desde este enlace oficial:
    
    https://nodejs.org/dist/latest-v20.x/win-x64/node.exe

    (Si el enlace no funciona, busca "Node.js Windows Binary .exe" en Google).

3.  Guarda el archivo `node.exe` descargado dentro de la carpeta `bin` que creaste en el paso 1.

   La estructura debe quedar asi:
   CV Screener/
   ├── bin/
   │   └── node.exe
   ├── dist/
   ├── portable-server.js
   └── INICIAR_PORTABLE.bat

## Como Iniciar

1.  Haz doble clic en `INICIAR_PORTABLE.bat`.
2.  Se abrira una ventana negra (el servidor) y tu navegador web.
3.  ¡Listo!

## Notas

*   Esta version NO requiere instalar nada en Windows.
*   Todo corre desde la carpeta.
*   Puedes copiar toda la carpeta (incluyendo `bin`) a una USB y funcionara en otra PC.
