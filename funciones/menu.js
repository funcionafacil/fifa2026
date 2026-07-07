// funciones/menu.js
// Módulo de menú con cards - VERSIÓN RESPONSIVE
// - Cards autoajustables con clamp()
// - Textos escalables
// - Diseño limpio para todos los tamaños

export function inicializarMenu(datosCuenta, onSeleccionarOpcion, opciones) {
  const menuContainer = document.getElementById('fp-body-menu');
  if (!menuContainer) {
    console.error('No se encontró fp-body-menu');
    return;
  }
  
  const opcionesMenu = opciones || [
    { id: 'ahora', nombre: 'AHORA', color: '#34c759', icono: '🏠' },
    { id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' },
    { id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' },
    { id: 'tabla', nombre: 'TABLA', color: '#ff9500', icono: '📊' },
    { id: 'reglas', nombre: 'REGLAS', color: '#5856d6', icono: '📖' }
  ];

  const wrapperDiv = document.createElement('div');
  wrapperDiv.className = 'menu-cards-wrapper';
  wrapperDiv.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 1.5vh, 14px);
    width: 100%;
    padding: clamp(4px, 0.8vw, 8px);
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
  `;

  opcionesMenu.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'menu-card';
    cardDiv.setAttribute('data-opcion', card.id);
    cardDiv.style.cssText = `
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: clamp(12px, 1.8vh, 18px);
      padding: clamp(10px, 1.5vh, 16px) clamp(12px, 1.8vw, 20px);
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: clamp(10px, 1.5vw, 16px);
      width: auto;
      animation: slideInCard 0.4s ease forwards;
      opacity: 0;
      transform: translateX(-20px);
      animation-delay: ${0.05 * (index + 1)}s;
      min-height: clamp(44px, 6vh, 56px);
    `;
    
    cardDiv.innerHTML = `
      <div class="card-icono" style="
        width: clamp(32px, 5vw, 44px);
        height: clamp(32px, 5vw, 44px);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(16px, 2.8vw, 24px);
        background: ${card.color}20;
        border: 1px solid ${card.color}40;
        flex-shrink: 0;
      ">${card.icono}</div>
      <div class="card-contenido" style="flex: 1; text-align: left; min-width: 0;">
        <div class="card-titulo" style="
          font-size: clamp(12px, 2vw, 18px);
          font-weight: 700;
          color: #ffffff;
          text-transform: uppercase;
          white-space: nowrap;
          letter-spacing: 0.5px;
        ">${card.nombre}</div>
      </div>
      <div class="card-flecha" style="
        font-size: clamp(14px, 2vw, 20px);
        color: rgba(255, 255, 255, 0.25);
        flex-shrink: 0;
      ">→</div>
    `;
    
    cardDiv.addEventListener('click', () => {
      if (typeof onSeleccionarOpcion === 'function') {
        onSeleccionarOpcion(card.id, datosCuenta);
      }
    });
    
    wrapperDiv.appendChild(cardDiv);
  });

  menuContainer.innerHTML = '';
  menuContainer.appendChild(wrapperDiv);
  
  if (!document.querySelector('#menu-keyframes')) {
    const styleKeyframes = document.createElement('style');
    styleKeyframes.id = 'menu-keyframes';
    styleKeyframes.textContent = `
      @keyframes slideInCard {
        0% { opacity: 0; transform: translateX(-20px); }
        100% { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleKeyframes);
  }
}
