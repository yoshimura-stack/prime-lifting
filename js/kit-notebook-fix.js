// Portal the full-screen uniform picker out of the scaled game shell.
// Preserve its existing node, listeners, IDs, selection and confirm behavior.
(function(){
 'use strict';
 const picker=document.getElementById('kit-select');
 if(!picker||picker.parentElement===document.body)return;
 document.body.appendChild(picker);
})();
