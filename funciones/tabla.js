// funciones/tabla.js
// Módulo de Tabla de Posiciones - TOP 20 por puntaje acumulado (pts)
// EXCLUYE usuarios de prueba: 'super', 'mundial'

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Lista de usuarios de prueba que NO deben aparecer en la tabla
const USUARIOS_EXCLUIDOS = ['super', 'mundial', 'Super', 'Mundial', 'SUPER', 'MUNDIAL'];

// Función helper para agregar timestamp anti-cache
function urlWithTimestamp(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_=${Date.now()}`;
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

function formatearPuntos(puntos) {
  if (!puntos && puntos !== 0) return '0';
  return puntos.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Verificar si un usuario debe ser excluido
function esUsuarioExcluido(nombre) {
  if (!nombre) return false;
  return USUARIOS_EXCLUIDOS.includes(nombre.trim());
}

export async function renderizarTabla(contenedor, datosCuenta) {
  if (!contenedor) return;
  
  // Mostrar loader
  contenedor.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100%; min-height: 300px;">
      <div style="text-align: center;">
        <div style="width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #007aff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
        <p style="color: white; margin-top: 16px;">Cargando tabla de posiciones...</p>
      </div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  try {
    // Consultar todos los jugadores desde Velneo
    const response = await fetch(urlWithTimestamp(`${BASE}/fifa_jug?api_key=${KEY}`));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const jugadores = data.fifa_jug || [];
    
    // Filtrar:
    // 1. Solo jugadores activos (off !== true)
    // 2. Excluir usuarios de prueba ('super', 'mundial')
    // 3. Excluir usuarios sin nombre o con nombre vacío
    const jugadoresActivos = jugadores.filter(j => {
      if (j.off === true) return false;
      if (esUsuarioExcluido(j.name)) return false;
      if (!j.name || j.name.trim() === '') return false;
      return true;
    });
    
    // Ordenar por puntos (pts) de mayor a menor
    jugadoresActivos.sort((a, b) => {
      const ptsA = a.pts || 0;
      const ptsB = b.pts || 0;
      return ptsB - ptsA;
    });
    
    // Tomar TOP 20
    const top20 = jugadoresActivos.slice(0, 20);
    
    if (top20.length === 0) {
      contenedor.innerHTML = `
        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7);">
          <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
          <div style="font-size: 16px;">No hay datos disponibles</div>
          <div style="font-size: 12px; margin-top: 8px;">Los puntajes se actualizarán después del primer partido</div>
        </div>
      `;
      return;
    }
    
    // Construir HTML de la tabla
    let html = `
      <div style="padding: 20px; height: 100%; overflow-y: auto;">
        <div style="background: rgba(0,0,0,0.2); border-radius: 20px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="font-size: 28px;">🏆</div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: white;">Tabla de Posiciones</div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.5);">TOP 20 · Puntaje acumulado</div>
            </div>
          </div>
        </div>
        
        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.2);">
                <th style="padding: 14px 8px; text-align: center; width: 60px; color: #ffd60a;">#</th>
                <th style="padding: 14px 8px; text-align: left; color: #ffd60a;">Jugador</th>
                <th style="padding: 14px 8px; text-align: center; width: 80px; color: #ffd60a;">Puntos</th>
              <tr>
            </thead>
            <tbody>
    `;
    
    top20.forEach((jugador, index) => {
      const posicion = index + 1;
      let medalla = '';
      let colorFila = '';
      
      if (posicion === 1) {
        medalla = '🥇 ';
        colorFila = 'rgba(255, 215, 0, 0.15)';
      } else if (posicion === 2) {
        medalla = '🥈 ';
        colorFila = 'rgba(192, 192, 192, 0.15)';
      } else if (posicion === 3) {
        medalla = '🥉 ';
        colorFila = 'rgba(205, 127, 50, 0.15)';
      }
      
      const nombreJugador = jugador.name || jugador.nombre || `Jugador ${jugador.id}`;
      const puntos = jugador.pts || 0;
      
      html += `
        <tr style="border-bottom: 0.5px solid rgba(255,255,255,0.1); background: ${colorFila};">
          <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: ${posicion <= 3 ? '#ffd60a' : 'rgba(255,255,255,0.8)'};">${posicion}</td>
          <td style="padding: 12px 8px; text-align: left; font-weight: ${posicion <= 3 ? '700' : '500'}; color: white;">${medalla}${escapeHtml(nombreJugador)}</td>
          <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: #34c759;">${formatearPuntos(puntos)}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 16px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4);">
          Actualizado en tiempo real · Puntaje acumulado de todos los ciclos
        </div>
      </div>
    `;
    
    contenedor.innerHTML = html;
    
  } catch (error) {
    console.error('[Tabla] Error cargando datos:', error);
    contenedor.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ff6b6b;">
        <div>⚠️ Error al cargar la tabla de posiciones</div>
        <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 20px; background: #007aff; border: none; border-radius: 10px; color: white; cursor: pointer;">Reintentar</button>
      </div>
    `;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}