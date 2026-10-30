/**
 * Matriz de Impacto Criminal · Tinta Digital
 * Puente seguro entre la app y Gemini. La clave NO va en la página:
 * se guarda en Configuración del proyecto > Propiedades del script > GEMINI_API_KEY
 */
const MODELO_POR_DEFECTO = 'gemini-2.5-flash';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Matriz de Impacto Criminal · Tinta Digital')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** La página llama a esta función en lugar de llamar a Gemini directamente. */
function gemini(ruta, cuerpo) {
  const props = PropertiesService.getScriptProperties();
  const clave = props.getProperty('GEMINI_API_KEY');
  if (!clave) {
    return { status: 500, text: JSON.stringify({ error: { message: 'Falta la propiedad GEMINI_API_KEY en el script.' } }) };
  }
  const m = String(ruta || '').match(/models\/([^:]+):(\w+)/);
  let modelo = props.getProperty('GEMINI_MODEL') || (m ? m[1] : MODELO_POR_DEFECTO);
  let metodo = (m && m[2] !== 'streamGenerateContent') ? m[2] : 'generateContent';

  let res;
  for (let intento = 0; intento < 4; intento++) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':' + metodo;
    res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: cuerpo,
      headers: { 'x-goog-api-key': clave },
      muteHttpExceptions: true
    });
    const codigo = res.getResponseCode();
    if (codigo === 404 && modelo !== MODELO_POR_DEFECTO) { modelo = MODELO_POR_DEFECTO; continue; } // modelo no disponible
    if (codigo !== 429 && codigo < 500) break;      // éxito o error definitivo
    Utilities.sleep(2000 * (intento + 1));          // demasiadas solicitudes: esperar y reintentar
  }
  return { status: res.getResponseCode(), text: res.getContentText() };
}

/** Prueba rápida: ejecútala desde el editor y mira el registro. */
function probar() {
  const r = gemini('models/gemini-3-flash-preview:generateContent', JSON.stringify({ contents: [{ parts: [{ text: 'Responde solo: OK' }] }] }));
  Logger.log(r.status + ' ' + r.text.slice(0, 300));
}
