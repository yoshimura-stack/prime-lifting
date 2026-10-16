/* Display-only score guide: keep ranking/physics and scoring untouched. */
(function () {
  'use strict';
  const dialog = document.getElementById('bonus-guide-dialog');
  const trigger = document.getElementById('bonus-guide-open');
  const close = document.getElementById('bonus-guide-close');
  if (!dialog || !trigger || !close) return;

  let returnFocus = null;
  function dismiss() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  trigger.addEventListener('click', () => {
    returnFocus = document.activeElement;
    dialog.hidden = false;
    close.focus();
  });
  close.addEventListener('click', dismiss);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dismiss();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation(); // Do not toggle gameplay pause on dialog close.
      dismiss();
    } else if (event.key === 'Tab') {
      // The close button is the dialog's only focusable control.
      event.preventDefault();
      close.focus();
    }
  });
})();
