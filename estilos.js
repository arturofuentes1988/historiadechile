// Selector de estilo visual: cada estilo es una versión completa del juego publicada en su propia carpeta.
(() => {
  const ESTILOS = [['realista', 'Realista'], ['acuarela', 'Acuarela'], ['oleo', 'Óleo (pinceladas)']];
  const partes = location.pathname.split('/').filter((p) => p && p !== 'index.html'), ultima = partes[partes.length - 1];
  const actual = ultima === 'acuarela' || ultima === 'oleo' ? ultima : 'realista';
  const base = actual === 'realista' ? location.pathname.replace(/index\.html$/, '') : location.pathname.replace(/[^/]+\/(index\.html)?$/, '');
  const hoja = document.getElementById('menu-sheet'); if (!hoja) return;
  const fila = document.createElement('label'); fila.className = 'opt';
  fila.innerHTML = '<div><b>Estilo visual</b><small>Cambia cómo se dibuja el mundo. El juego se recarga y vuelves a la portada.</small></div><select id="o-estilo">' + ESTILOS.map(([k, n]) => `<option value="${k}"${k === actual ? ' selected' : ''}>${n}</option>`).join('') + '</select>';
  hoja.insertBefore(fila, hoja.querySelector('.opt'));
  fila.querySelector('select').onchange = (e) => { location.href = base + (e.target.value === 'realista' ? '' : e.target.value + '/') + location.search; };
})();
