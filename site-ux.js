/* Keyboard and focus behavior for the six principal pages. */
document.querySelectorAll('.site-mobile-nav').forEach(function (menu) {
  const trigger = menu.querySelector('summary');
  menu.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      trigger.focus();
    }
  });
  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) menu.open = false;
  });
  document.addEventListener('click', function (event) {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('focusout', function (event) {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
  });
});

document.querySelectorAll('.faq-item').forEach(function (item, index) {
  const trigger = item.querySelector('.faq-q');
  const answer = item.querySelector('.faq-a');
  if (!trigger || !answer) return;
  answer.id = 'faq-answer-' + index;
  trigger.setAttribute('aria-controls', answer.id);
  const sync = function () {
    const open = item.classList.contains('open');
    trigger.setAttribute('aria-expanded', String(open));
    answer.setAttribute('aria-hidden', String(!open));
  };
  sync();
  new MutationObserver(sync).observe(item, { attributes: true, attributeFilter: ['class'] });
});
