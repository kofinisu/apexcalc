const THEMES = ['dark', 'light', 'high-contrast'];
export function initTheme() {
  const btn = document.getElementById('themeBtn'), link = document.getElementById('theme-stylesheet');
  if (!btn || !link) return;
  let index = 0;
  btn.addEventListener('click', () => {
    index = (index + 1) % THEMES.length;
    link.href = `css/themes/${THEMES[index]}.css`;
    btn.title = `Cycle theme (${THEMES[index]})`;
  });
}
