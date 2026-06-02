// leftPanel (shell) — assemble les sous-composants (actions / voices / progress /
// scoreInfo, chargés par index.html dans leurs hosts). Ne porte que le tooltip
// global, générique et partagé : attaché au body pour échapper au clipping des
// conteneurs en overflow, il s'affiche pour tout élément [data-tooltip].
(function setupGlobalTooltip() {
  let tip = null;
  let timer = null;
  function show(element) {
    const title = element.getAttribute('data-tooltip');
    const sub = element.getAttribute('data-tooltip-sub') || '';
    if (!title) return;
    tip = document.createElement('div');
    tip.className = 'global-tooltip';
    tip.innerHTML = sub ? `<strong>${title}</strong>${sub}` : `<strong>${title}</strong>`;
    document.body.appendChild(tip);
    const rect = element.getBoundingClientRect();
    // measure
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const centerX = rect.left + rect.width / 2;
    let top = rect.top - tipHeight - 10;
    let placeBelow = false;
    if (top < 8) {
      top = rect.bottom + 10;
      placeBelow = true;
    }
    // clamp horizontal
    const margin = 8;
    let left = centerX - tipWidth / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tipWidth - margin, left));
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.transform = 'none';
    // reposition arrow
    const arrowX = centerX - left;
    tip.style.setProperty('--arrow-x', arrowX + 'px');
    tip.classList.toggle('below', placeBelow);
    requestAnimationFrame(() => tip.classList.add('show'));
  }
  function hide() {
    clearTimeout(timer);
    if (tip) {
      tip.remove();
      tip = null;
    }
  }
  document.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
    timer = setTimeout(() => show(target), 350);
  });
  document.addEventListener('mouseout', (event) => {
    const target = event.target.closest('[data-tooltip]');
    if (!target) return;
    hide();
  });
  window.addEventListener('scroll', hide, true);
})();
