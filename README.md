# Electric Calc

Suite de diseño eléctrico para instalaciones de uso final (estilo Caneco/ETAP, versión web): tableros de distribución con cuadro de cargas, balance de fases, esquema unifilar, transformador, motores/generador/UPS, coordinación de protecciones y memoria de cálculo imprimible a PDF.

## Normas aplicadas

IEEE 141 · NEC (220, 240, 250, 310) · RETIE · IEC 60364-4-43 / 5-52 / 5-54 · IEC 60947-2

## Módulos

- **Proyectos** — biblioteca local (localStorage), con exportar/importar JSON. Migra automáticamente proyectos del modelo anterior (v1 → v2).
- **Tableros** — cuadro de cargas editable, dimensionamiento circuito a circuito, corriente de tablero, interruptor general, barraje, alimentador, neutro con armónicos (triplens), balance/desbalance de fases con balanceo automático y diagrama unifilar SVG.
- **Calculadora** — cálculo de un solo circuito (conductor, protección, caída de tensión, cortocircuito, tubería y puesta a tierra).
- **Transformador** — dimensionamiento por carga y reserva, %Z, corrientes, cortocircuito en secundario, pérdidas, eficiencia y protecciones.
- **Motores / Generador / UPS** — arranque de motores (DOL, estrella-triángulo, arrancador suave, VFD), caída de tensión en arranque, grupo electrógeno y banco de baterías.
- **Coordinación** — selectividad por corriente, magnética y temporal, capacidad de interrupción y curvas tiempo-corriente.
- **Memoria de cálculo** — reporte imprimible (Imprimir → Guardar como PDF) con resumen, cuadro de cargas, unifilar y verificaciones normativas.

## Rigor de cálculo

- Ampacidad según IEC 60364-5-52 (métodos A1…F) para cobre/aluminio y aislamiento PVC/XLPE.
- Factores de corrección por temperatura (aire/terreno) y agrupamiento (tubo/bandeja).
- Protección por sobrecarga: In ≥ Ib, In ≤ Iz e I2 ≤ 1,45·Iz (IEC 60364-4-43).
- Verificación térmica del conductor k²S² ≥ I²t.
- Conductor de protección (PE) por IEC 60364-5-54, tabla 54.2.
- Conductor de electrodo de puesta a tierra por NEC 250.66.

## Idiomas

Interfaz en **español** e **inglés** (selector ES/EN en la barra superior). Preferencia guardada en el navegador.

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

GitHub Actions publica `dist/` en GitHub Pages en cada push a `main`.

## Demo

https://alejandro8aperez.github.io/electric-calc/

> Los resultados deben ser revisados y validados por un ingeniero responsable del diseño. Los valores de pérdidas, %Z y catálogos son de referencia.
