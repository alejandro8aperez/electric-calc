# Electric Calc

Suite de diseño eléctrico para instalaciones de uso final (estilo Caneco/ETAP, versión web): tableros de distribución con cuadro de cargas, balance de fases, esquema unifilar multinivel, transformador, motores/generador/UPS, coordinación de protecciones, catálogo de dispositivos, presupuesto (BOM) y memoria de cálculo imprimible a PDF.

## Normas aplicadas

IEEE 141 · NEC (220, 240, 250, 310) · RETIE · IEC 60364-4-43 / 5-52 / 5-54 · IEC 60909-0 (cortocircuito) · IEC 60947-2

## Módulos

- **Proyectos** — biblioteca local (localStorage), con exportar/importar JSON. Migra automáticamente proyectos del modelo anterior (v1 → v2).
- **Tableros** — cuadro de cargas editable, dimensionamiento circuito a circuito, corriente de tablero, interruptor general, barraje, alimentador, neutro con armónicos (triplens), balance/desbalance de fases con balanceo automático, **definición de la fuente de alimentación (IEC 60909)** y diagrama unifilar SVG.
- **Calculadora** — cálculo de un solo circuito (conductor, protección, caída de tensión, cortocircuito, tubería y puesta a tierra).
- **Transformador** — dimensionamiento por carga y reserva, %Z, corrientes, cortocircuito en secundario, pérdidas, eficiencia y protecciones.
- **Motores / Generador / UPS** — arranque de motores (DOL, estrella-triángulo, arrancador suave, VFD), caída de tensión en arranque, grupo electrógeno y banco de baterías.
- **Bilan de potencia** — potencia instalada, de demanda, simultánea y de coincidencia (foisonnement), factor de potencia global y corrección de reactiva (compensación con condensadores).
- **Coordinación** — selectividad por corriente, magnética y temporal, **filiación/cascada (backup, IEC 60947-2 Anexo A)**, capacidad de interrupción y curvas tiempo-corriente.
- **Catálogo** — base de dispositivos editable (magnetotérmicos, cajas moldeadas, diferenciales, fusibles, contactores, gabinetes, barras, bornes), precios y curvas, import/export CSV o JSON.
- **Presupuesto (BOM)** — selección automática de materiales del tablero (protecciones por calibre/curva/poder de corte, diferenciales según tipo de carga, bornes, gabinete con reserva), cantidades y precios editables, totales con descuento/impuesto y export CSV.
- **Esquema de red** — unifilar multinivel de la red de tableros (jerarquía aguas arriba/abajo), cascada de Icc y regulación acumulada, folios y bornera con numeración de bornes, export **DXF** (CAD), **SVG** y CSV.
- **Memoria de cálculo** — reporte imprimible (Imprimir → Guardar como PDF) con resumen, cuadro de cargas, unifilar y verificaciones normativas.

## Rigor de cálculo

- Fuente de alimentación por transformador MT/BT, grupo electrógeno, Icc conocida, R y X, potencia de cortocircuito o batería CC.
- Cortocircuito IEC 60909: factores de tensión c (1,05 / 0,95), Ik máxima, Ik mínima (fase-neutro) y corriente de pico κ·√2·Ik.
- Ampacidad según IEC 60364-5-52 (métodos A1…F) para cobre/aluminio y aislamiento PVC/XLPE.
- Factores de corrección por temperatura (aire/terreno) y agrupamiento (tubo/bandeja).
- Protección por sobrecarga: In ≥ Ib, In ≤ Iz e I2 ≤ 1,45·Iz (IEC 60364-4-43).
- Verificación térmica del conductor k²S² ≥ I²t.
- Armónicos (triplens) por zonas (≤15 % / 15–33 % / >33 %): sobredimensión de fase y neutro.
- Regulación de tensión descompuesta en **amont (alimentador) / aval (circuito) / total**.
- Conductor de protección (PE) por IEC 60364-5-54, tabla 54.2.
- Conductor de electrodo de puesta a tierra por NEC 250.66.
- Selección automática de materiales (BOM): poder de corte Icu ≥ Icc en el punto, calibre y curva por circuito, diferencial por tipo de carga y gabinete con reserva de módulos.
- Red multinivel: Icc en barras del tablero aguas arriba alimenta al tablero aguas abajo (cascada de impedancias) y regulación de tensión acumulada hasta cada carga.

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
