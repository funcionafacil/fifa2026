// funciones/ahora.js
// Pantalla "AHORA" - VERSIÓN CON CARD DE PARTIDOS REDUCIDA
// - Card 1: Partidos del día (solo banderas, nombres, marcadores)
// - Card 2: Finalistas (Ciclo 2) - badge PULSO solo si NO ha hecho pronóstico
// - Card 3: Reglas del juego

import { simGetFechaStr, simGetHoraStr, onSimuladorCambio } from './lab.js';
import { gruposSeleccion, finalistasSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal } from './sync.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

let currentContenedor = null;
let currentDatosCuenta = null;
let actualizacionPeriodicaInterval = null;
let cambiarVistaCallback = null;
let pronosticosCache = {};
let partidosCache = [];
let resultadosRealesCache = {};

export function setCambiarVistaCallback(callback) {
    cambiarVistaCallback = callback;
}

function mostrarToast(msg, tipo) {
    const toast = document.getElementById('app-toast');
    if (toast) {
        toast.textContent = msg;
        toast.className = 'toast ' + (tipo || '');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function obtenerFechaReal() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatearHora12h(horaStr) {
    if (!horaStr) return '';
    const horaLimpia = horaStr.split(':').slice(0, 2).join(':');
    const [hora, minuto] = horaLimpia.split(':');
    let horaNum = parseInt(hora);
    const periodo = horaNum >= 12 ? 'pm' : 'am';
    if (horaNum > 12) horaNum -= 12;
    if (horaNum === 0) horaNum = 12;
    return `${horaNum}:${minuto} ${periodo}`;
}

async function cargarPartidos() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&_=${timestamp}`);
        const data = await response.json();
        partidosCache = data.fifa_ptd || [];
        
        const responseReales = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&filter[est]=4&_=${timestamp}`);
        const dataReales = await responseReales.json();
        resultadosRealesCache = {};
        (dataReales.fifa_ptd || []).forEach(p => { 
            resultadosRealesCache[p.id] = { 
                gol_loc: p.t90_gol_loc, 
                gol_vis: p.t90_gol_vis, 
                est: p.est 
            }; 
        });
        
        return partidosCache;
    } catch (error) { 
        console.error('Error cargando partidos:', error); 
        return []; 
    }
}

async function cargarPronosticos(jugId) {
    if (!jugId) return;
    const locales = cargarPronosticosPartidosLocal();
    if (locales && Object.keys(locales).length > 0) {
        pronosticosCache = locales;
        return;
    }
    try {
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res`);
        const pronosticos = (await response.json()).fifa_jug_pro || [];
        pronosticosCache = {};
        pronosticos.forEach(p => { pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 }; });
        guardarPronosticosPartidosLocal(pronosticosCache);
    } catch (error) {
        console.error('[AHORA] Error cargando pronósticos:', error);
    }
}

function irAPartidos() {
    if (typeof cambiarVistaCallback === 'function') {
        cambiarVistaCallback('partidos', currentDatosCuenta);
    }
}

function irAEspeciales(tab) {
    if (typeof cambiarVistaCallback === 'function') {
        cambiarVistaCallback('especiales', currentDatosCuenta, tab);
    }
}

function navegarAReglas() {
    if (!cambiarVistaCallback) return;
    cambiarVistaCallback('reglas', currentDatosCuenta);
}

function tieneCiclo2Completo() {
    return !!(finalistasSeleccion.campeon && finalistasSeleccion.subcampeon &&
        finalistasSeleccion.tercero && finalistasSeleccion.cuarto);
}

function tieneAlgunFinalista() {
    return !!(finalistasSeleccion.campeon || finalistasSeleccion.subcampeon ||
        finalistasSeleccion.tercero || finalistasSeleccion.cuarto);
}

function getEstadoPartido(partido) {
    const est = Number(partido.est);
    if (est === 4) {
        return { estado: 'terminado', texto: 'Terminado', icono: '🏁', clase: 'badge-terminado' };
    } else if (est === 1 || est === 2) {
        return { estado: 'activo', texto: 'Abierto', icono: '🟢', clase: 'badge-activo' };
    } else {
        return { estado: 'pendiente', texto: 'Próximamente', icono: '⏳', clase: 'badge-pendiente' };
    }
}

function getResultadoReal(partidoId) { 
    const real = resultadosRealesCache[partidoId]; 
    return real && real.gol_loc !== null ? { gol_loc: real.gol_loc, gol_vis: real.gol_vis } : null; 
}

function obtenerPartidosDelDia() {
    const fechaActual = obtenerFechaReal();
    const partidosDelDia = partidosCache.filter(p => {
        const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
        return fechaPartido === fechaActual && p.fas === 1;
    });
    
    partidosDelDia.sort((a, b) => {
        return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
    });
    
    return partidosDelDia;
}

function renderizarPartidosDelDia() {
    const partidosDelDia = obtenerPartidosDelDia();
    
    if (partidosDelDia.length === 0) {
        return `
            <div style="text-align: center; padding: 16px; color: #8e8e93;">
                <div style="font-size: 20px; margin-bottom: 4px;">📅</div>
                <div style="font-size: 12px;">No hay partidos hoy</div>
            </div>
        `;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    partidosDelDia.forEach(partido => {
        const estado = getEstadoPartido(partido);
        const pronostico = pronosticosCache[partido.id];
        const resultadoReal = getResultadoReal(partido.id);
        
        let marcadorHtml = '';
        
        if (estado.estado === 'terminado' && resultadoReal) {
            marcadorHtml = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 600; color: #1c1c1e;">${resultadoReal.gol_loc}</span>
                    <span style="color: #8e8e93;">-</span>
                    <span style="font-weight: 600; color: #1c1c1e;">${resultadoReal.gol_vis}</span>
                    <span style="background: #34c75920; color: #34c759; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600;">FIN</span>
                </div>
            `;
        } else if (pronostico) {
            marcadorHtml = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: 500; color: #007aff;">${pronostico.s1}</span>
                    <span style="color: #8e8e93;">-</span>
                    <span style="font-weight: 500; color: #007aff;">${pronostico.s2}</span>
                    <span style="background: #007aff10; color: #007aff; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 500;">⚽</span>
                </div>
            `;
        } else {
            marcadorHtml = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #8e8e93;">?</span>
                    <span style="color: #c7c7cc;">-</span>
                    <span style="color: #8e8e93;">?</span>
                </div>
            `;
        }
        
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #f9f9fb; border-radius: 12px; padding: 8px 12px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 2;">
                    <span style="font-size: 24px;">${getBandera(partido.nom_loc)}</span>
                    <span style="font-size: 12px; font-weight: 500; color: #1c1c1e; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${partido.nom_loc}</span>
                </div>
                <div style="flex: 1; text-align: center;">
                    ${marcadorHtml}
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex: 2; justify-content: flex-end;">
                    <span style="font-size: 12px; font-weight: 500; color: #1c1c1e; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">${partido.nom_vis}</span>
                    <span style="font-size: 24px;">${getBandera(partido.nom_vis)}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function getBadgeCiclo2() {
    const ciclo2Completo = tieneCiclo2Completo();
    const tieneAlguno = tieneAlgunFinalista();
    
    if (ciclo2Completo) {
        return '<div class="ahora-card-badge completado">✅ COMPLETADO</div>';
    }
    
    if (tieneAlguno) {
        return '<div class="ahora-card-badge pendiente">⚠️ INCOMPLETO</div>';
    }
    
    return '<div class="ahora-card-badge pulso50">🟡 PULSO 50</div>';
}

async function renderizarAhoraContent() {
    await cargarPartidos();
    
    const ciclo2Badge = getBadgeCiclo2();
    const partidosDelDiaHtml = renderizarPartidosDelDia();
    
    const html = `
        <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; overflow-y: auto; overflow-x: hidden;">
            <style>
                .ahora-header { 
                    background: linear-gradient(135deg, #0a2f1f 0%, #1a5a3a 100%);
                    padding: 16px 20px; 
                    text-align: center; 
                    color: white;
                    border-radius: 20px 20px 0 0;
                    position: relative;
                    overflow: hidden;
                }
                
                .ahora-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px);
                    pointer-events: none;
                }
                
                .ahora-header h2 { 
                    font-size: 18px; 
                    font-weight: 700; 
                    margin: 0 0 4px 0; 
                    color: white; 
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    position: relative;
                    z-index: 5;
                }
                
                .ahora-header p { 
                    font-size: 12px; 
                    opacity: 0.95; 
                    margin: 0;
                    position: relative;
                    z-index: 5;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                }
                
                .ahora-cards { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
                
                .ahora-card { 
                    background: #f9f9fb; 
                    border: 1px solid #e5e5ea; 
                    border-radius: 16px; 
                    padding: 14px 16px; 
                    cursor: pointer; 
                    transition: all 0.2s ease; 
                }
                
                .ahora-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                .ahora-card:active { transform: scale(0.98); }
                
                .ahora-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                
                .ahora-card-icono { 
                    font-size: 24px; 
                    width: 40px;
                    height: 40px;
                    background: rgba(0,122,255,0.1);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .ahora-card-titulo { 
                    font-size: 14px; 
                    font-weight: 700; 
                    color: #1c1c1e; 
                    flex: 1;
                }
                
                .ahora-card-flecha { 
                    font-size: 14px; 
                    color: #c7c7cc; 
                }
                
                .ahora-card-contenido {
                    padding-left: 52px;
                }
                
                .ahora-card-desc { 
                    font-size: 12px; 
                    color: #8e8e93; 
                    margin-bottom: 8px;
                }
                
                .ahora-card-badge { 
                    background: #ff9500; 
                    color: white; 
                    padding: 2px 10px; 
                    border-radius: 12px; 
                    font-size: 9px; 
                    font-weight: 600; 
                    display: inline-block;
                }
                
                .ahora-card-badge.completado { background: #34c759; }
                .ahora-card-badge.pendiente { background: #8e8e93; }
                .ahora-card-badge.pulso50 { background: #ff9500; }
                
                .ahora-footer { 
                    padding: 12px 16px; 
                    text-align: center; 
                    border-top: 1px solid #e5e5ea; 
                    margin-top: 4px; 
                }
                
                .ahora-footer-text { 
                    font-size: 10px; 
                    color: #8e8e93; 
                }
            </style>
            
            <div class="ahora-header">
                <h2>🏆 La Polla Mundialista 2026</h2>
                <p>¡Bienvenido, ${currentDatosCuenta?.name || currentDatosCuenta?.nombre || 'Participante'}!</p>
            </div>
            
            <div class="ahora-cards">
                <div class="ahora-card" data-accion="partidos">
                    <div class="ahora-card-header">
                        <div class="ahora-card-icono">⚽</div>
                        <div class="ahora-card-titulo">Partidos de hoy</div>
                        <div class="ahora-card-flecha">→</div>
                    </div>
                    <div class="ahora-card-contenido">
                        ${partidosDelDiaHtml}
                    </div>
                </div>
                
                <div class="ahora-card" data-accion="ciclo2">
                    <div class="ahora-card-header">
                        <div class="ahora-card-icono">🏆</div>
                        <div class="ahora-card-titulo">Los cuatro finalistas</div>
                        <div class="ahora-card-flecha">→</div>
                    </div>
                    <div class="ahora-card-contenido">
                        <div class="ahora-card-desc">Selecciona Campeón, Subcampeón, Tercero y Cuarto</div>
                        ${ciclo2Badge}
                    </div>
                </div>
                
                <div class="ahora-card" data-accion="reglas">
                    <div class="ahora-card-header">
                        <div class="ahora-card-icono">📖</div>
                        <div class="ahora-card-titulo">Reglas del juego</div>
                        <div class="ahora-card-flecha">→</div>
                    </div>
                    <div class="ahora-card-contenido">
                        <div class="ahora-card-desc">Cómo funciona La Polla, ciclos y sistema de puntos</div>
                    </div>
                </div>
            </div>
            
            <div class="ahora-footer">
                <div class="ahora-footer-text">💡 Sigue tus pronósticos en la TABLA de posiciones</div>
            </div>
        </div>
    `;
    
    return html;
}

// ========== EXPORTACIÓN PRINCIPAL ==========
export async function renderizarAhora(contenedor, datosCuenta) {
    if (!contenedor) return;
    currentContenedor = contenedor;
    currentDatosCuenta = datosCuenta;
    
    await cargarPronosticos(datosCuenta.id);
    
    if (actualizacionPeriodicaInterval) {
        clearInterval(actualizacionPeriodicaInterval);
        actualizacionPeriodicaInterval = null;
    }
    
    contenedor.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100%; min-height: 300px;">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #007aff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
                <p style="color: #8e8e93; margin-top: 16px;">Cargando...</p>
            </div>
        </div>
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    
    const html = await renderizarAhoraContent();
    contenedor.innerHTML = html;
    
    const cardPartidos = contenedor.querySelector('.ahora-card[data-accion="partidos"]');
    const cardCiclo2 = contenedor.querySelector('.ahora-card[data-accion="ciclo2"]');
    const cardReglas = contenedor.querySelector('.ahora-card[data-accion="reglas"]');
    
    if (cardPartidos) cardPartidos.addEventListener('click', () => irAPartidos());
    if (cardCiclo2) cardCiclo2.addEventListener('click', () => irAEspeciales('ciclo2'));
    if (cardReglas) cardReglas.addEventListener('click', () => navegarAReglas());
    
    actualizacionPeriodicaInterval = setInterval(async () => {
        await cargarPronosticos(datosCuenta.id);
        await cargarPartidos();
        const nuevoHtml = await renderizarAhoraContent();
        if (currentContenedor) {
            currentContenedor.innerHTML = nuevoHtml;
            const newCardPartidos = currentContenedor.querySelector('.ahora-card[data-accion="partidos"]');
            const newCardCiclo2 = currentContenedor.querySelector('.ahora-card[data-accion="ciclo2"]');
            const newCardReglas = currentContenedor.querySelector('.ahora-card[data-accion="reglas"]');
            if (newCardPartidos) newCardPartidos.addEventListener('click', () => irAPartidos());
            if (newCardCiclo2) newCardCiclo2.addEventListener('click', () => irAEspeciales('ciclo2'));
            if (newCardReglas) newCardReglas.addEventListener('click', () => navegarAReglas());
        }
    }, 60000);
}

export function suscribirAhoraAlSimulador() {
    onSimuladorCambio(() => {
        if (currentContenedor && currentDatosCuenta) {
            renderizarAhora(currentContenedor, currentDatosCuenta);
        }
    });
}