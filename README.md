# CV Screener

Una aplicación de escritorio para analizar y evaluar CVs de candidatos usando inteligencia artificial.

## Características

- **Análisis con IA**: Evalúa CVs automáticamente usando modelos de OpenAI
- **Extracción de PDF**: Lee y extrae texto de archivos PDF
- **Sistema de Puntuación**: Evalúa candidatos en múltiples dimensiones (relevancia, educación, experiencia, proactividad)
- **Vista Kanban**: Organiza candidatos en diferentes etapas del proceso de selección
- **Presets de Criterios**: Guarda y reutiliza criterios de evaluación personalizados
- **Modo Oscuro**: Tema claro y oscuro
- **100% Local**: Tus datos se guardan en tu navegador (IndexedDB)

## Inicio Rápido (Sin Instalación)

1. Haz doble clic en `INICIAR_SIN_INSTALACION.bat`
2. Se abrirá la aplicación en tu navegador
3. Configura tu API Key de OpenAI en Configuración
4. ¡Empieza a evaluar CVs!

## Desarrollo

### Requisitos
- Node.js 18+
- npm

### Instalación
```bash
npm install
```

### Ejecutar en modo desarrollo
```bash
npm run dev
```

### Compilar para producción
```bash
npm run build
```

El archivo compilado estará en `dist/index.html` (aplicación de archivo único).

## Tecnologías

- **React 18** - UI Framework
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **Zustand** - Estado global
- **IndexedDB (idb)** - Persistencia local
- **PDF.js** - Extracción de texto de PDFs
- **OpenAI API** - Análisis con IA

## Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── pages/          # Páginas de la aplicación
├── services/       # Servicios (DB, OpenAI, PDF)
├── store/          # Estado global (Zustand)
├── types/          # Tipos TypeScript
└── utils/          # Utilidades
```

## Notas Importantes

- **Requiere API Key de OpenAI** para el análisis de CVs
- Los datos se almacenan localmente en tu navegador
- Si borras el historial/cookies del navegador, podrías perder tus datos

## Licencia

Uso privado.

