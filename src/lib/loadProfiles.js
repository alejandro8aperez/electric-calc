// ─────────────────────────────────────────────────────────────────────────────
// Curvas de carga diarias normalizadas (0..1) por tipo de carga — 24 horas
// Índice 0 = 00:00 · base para coincidencia y dimensionamiento por demanda máxima
// ─────────────────────────────────────────────────────────────────────────────

export const PROFILE_HOURS = 24

const P = {
  // Alumbrado (oficina): bajo de noche, alto en horario laboral y nocturno
  lighting: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.3, 0.6, 0.85, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.95, 1.0, 1.0, 0.9, 0.6, 0.3, 0.1],
  // Tomacorrientes: horario de oficina
  sockets: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.1, 0.3, 0.6, 0.8, 0.85, 0.85, 0.7, 0.8, 0.85, 0.85, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02],
  // Cargas generales
  general: [0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3, 0.5, 0.7, 0.8, 0.85, 0.85, 0.85, 0.85, 0.85, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
  // Motores: turnos de trabajo (pausa al mediodía)
  motor: [0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 0.8, 1.0, 1.0, 1.0, 1.0, 0.9, 0.6, 0.2, 0.05, 0.0, 0.0, 0.0],
  // Climatización: campana de día
  hvac: [0.15, 0.15, 0.15, 0.15, 0.15, 0.2, 0.35, 0.55, 0.75, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.85, 0.6, 0.4, 0.3, 0.25, 0.2, 0.15],
  // Cocina: picos antes de comidas
  kitchen: [0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.4, 0.7, 0.5, 0.4, 0.5, 0.8, 1.0, 0.8, 0.4, 0.4, 0.5, 0.7, 0.9, 0.7, 0.4, 0.2, 0.1, 0.05],
  // Centro de datos / IT: prácticamente continuo
  computer: [0.6, 0.55, 0.5, 0.5, 0.5, 0.55, 0.7, 0.85, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65],
  // Recarga de vehículos: preferentemente nocturna
  evse: [0.6, 0.7, 0.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.25, 0.25, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.0, 0.9, 0.8, 0.7],
  // Carga CC / rectificadores: continua
  dc: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
  // Carga crítica: siempre disponible
  special: Array(24).fill(1.0),
}

export const PROFILES = P

// Perfil por defecto según tipo de carga
export function profileFor(loadType) {
  return P[loadType] ?? P.general
}

// Escala un perfil a valores de potencia (kW)
export function scaleProfile(profile, kw) {
  return profile.map((v) => kw * v)
}
