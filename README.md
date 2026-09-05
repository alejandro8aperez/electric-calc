# Electric Calc

Calculadora eléctrica para dimensionamiento de instalaciones de uso final: conductor, caída de tensión, protección térmica, cortocircuito, tubería y puesta a tierra. Incluye coordinación de protecciones (selectividad).

## Normas aplicadas

IEEE 141 · NEC (240, 250, 310) · RETIE · IEC 60947-2

## Características

- Dimensionamiento de conductores (cobre/aluminio) por ampacidad con corrección por temperatura y agrupamiento
- Regulación de tensión (monofásico/trifásico) y cumplimiento normativo
- Cortocircuito, selección de tubería y puesta a tierra
- Coordinación de protecciones (selectividad ≥ 1.6×, capacidad de ruptura)
- Proyectos guardados en el navegador (localStorage) — sin backend ni login

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Despliegue

GitHub Actions despliega `dist/` en GitHub Pages en cada push a `main`.

## Demo

https://alejandro8aperez.github.io/electric-calc/