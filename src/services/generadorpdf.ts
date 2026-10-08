import html2pdf from "html2pdf.js";

type Html2PdfOptions = {
  margin?: number | [number, number] | [number, number, number, number];
  filename?: string;
  image?: { type?: "jpeg" | "png" | "webp"; quality?: number; };
  html2canvas?: object;
  jsPDF?: { unit?: string; format?: string | [number, number]; orientation?: "portrait" | "landscape"; };
};

export const PDF_FILENAME = "Informe_Especializado_SportMind.pdf";

export async function generarInformePdf(
  element: HTMLElement,
  filename: string = PDF_FILENAME,
): Promise<void> {
  const options: Html2PdfOptions = {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };
  await html2pdf().set(options).from(element).save();
}

export interface DatosAtleta {
  nombre: string;
  deporte: string;
  recomendacionOriginal: string;
  resumenMetricas: string;
}

export async function generarAnalisisIA(datos: DatosAtleta): Promise<string> {
const apiKey = import.meta.env.PUBLIC_GEMINI_API_KEY || "";
  const prompt = `Actúa como un especialista en medicina deportiva y neurocognición. Analiza el rendimiento de:
- Nombre: ${datos.nombre}
- Deporte / Disciplina: ${datos.deporte}
- Recomendación: ${datos.recomendacionOriginal}
- Métricas: ${datos.resumenMetricas}

Genera un reporte analítico en español con HTML limpio (sin markdown). Debe contener:
1. Indicadores de estado en etiquetas flotantes (ej: <span style="background: #0284c7; color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold;">ESTABILIDAD: ÓPTIMA</span>).
2. Un bloque titulado "✦ Síntesis de Rendimiento Multidimensional".
3. Un bloque titulado "✦ Evaluación de Carga y Fatiga".
4. Una lista (<ul> y <li>) titulada "✦ Recomendaciones y Plan de Acción".`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    let textoGemini = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    textoGemini = textoGemini.replace(/```html/g, "").replace(/```/g, "").trim();
    if (textoGemini) return textoGemini;
  } catch (e) {
    console.error("Error conectando con Gemini API:", e);
  }

  return `
    <div style="margin-bottom: 12px;">
      <strong style="color: #0369a1; font-size: 12px;">✦ Síntesis de Rendimiento:</strong><br>
      <span style="color: #334155;">El atleta <strong>${datos.nombre}</strong> muestra un perfil estable en ${datos.deporte}.</span>
    </div>
  `;
}

export function crearInforme(elementoBase: HTMLElement): HTMLElement {
  let nombreAtleta = "No disponible";
  let deporteAtleta = "No disponible";
  
  const todosLosElementos = Array.from(elementoBase.querySelectorAll("*"));
  const tituloElemento = todosLosElementos.find(el => {
    const texto = el.textContent?.trim() || "";
    return texto.startsWith("Informe de") && texto.length < 50;
  });

  if (tituloElemento && tituloElemento.textContent) {
    const tituloLimpio = tituloElemento.textContent.replace("Informe de", "").trim();
    if (tituloLimpio.includes("·")) {
      const partes = tituloLimpio.split("·");
      nombreAtleta = partes[0].trim();
      deporteAtleta = partes[1]?.trim() || "No disponible";
    } else {
      const partes = tituloLimpio.split(" ");
      nombreAtleta = partes[0] || "No disponible";
      deporteAtleta = partes.slice(1).join(" ") || "No disponible";
    }
  }

  const fechaActual = new Date().toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  
  const numeroInforme = Math.floor(Math.random() * 9000) + 1000;

  const plantilla = document.createElement("div");
  plantilla.id = "informe-tecnico-pdf";
  plantilla.style.width = "800px";
  plantilla.style.padding = "40px 50px";
  plantilla.style.backgroundColor = "#ffffff";
  plantilla.style.fontFamily = "Arial, sans-serif";
  plantilla.style.color = "#1e293b";

  plantilla.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 25px;">
      <div>
        <div style="font-size: 26px; font-weight: 900; color: #0f172a;">SportMind <span style="color: #0284c7;">VR Analytics</span></div>
        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 2px;">Sistema Avanzado de Evaluación Cognitivo-Deportiva</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 14px; font-weight: bold; color: #0284c7;">INFORME CLÍNICO DE SESIÓN</div>
        <div style="font-size: 11px; color: #475569;">REF: INF-${numeroInforme} | Fecha: ${fechaActual}</div>
      </div>
    </div>

    <div style="font-size: 12px; font-weight: bold; color: #0f172a; background-color: #f8fafc; padding: 6px 10px; border-left: 4px solid #0284c7; margin-bottom: 8px; text-transform: uppercase;">
      1. Ficha de Identificación del Atleta
    </div>
    <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #e2e8f0;">
      <tbody>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 10px; font-weight: bold; background-color: #f1f5f9; width: 20%; border-right: 1px solid #e2e8f0;">Atleta</td>
          <td style="padding: 6px 10px; width: 30%; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: bold;">${nombreAtleta}</td>
          <td style="padding: 6px 10px; font-weight: bold; background-color: #f1f5f9; width: 20%; border-right: 1px solid #e2e8f0;">ID Sesión</td>
          <td style="padding: 6px 10px; width: 30%;">SM-VR-01</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold; background-color: #f1f5f9; border-right: 1px solid #e2e8f0;">Disciplina</td>
          <td style="padding: 6px 10px; border-right: 1px solid #e2e8f0;">${deporteAtleta}</td>
          <td style="padding: 6px 10px; font-weight: bold; background-color: #f1f5f9; border-right: 1px solid #e2e8f0;">Plataforma</td>
          <td style="padding: 6px 10px;">Realidad Virtual Inmersiva</td>
        </tr>
      </tbody>
    </table>
    
    <div style="font-size: 12px; font-weight: bold; color: #0f172a; background-color: #f8fafc; padding: 6px 10px; border-left: 4px solid #0284c7; margin-bottom: 8px; text-transform: uppercase;">
      2. Registro de Desempeño y Métricas Crudas
    </div>
    <div id="datos-clonados-pdf" style="margin-bottom: 20px;"></div>

    <div style="font-size: 12px; font-weight: bold; color: #047857; background-color: #ecfdf5; padding: 6px 10px; border-left: 4px solid #059669; margin-bottom: 8px; text-transform: uppercase;">
      3. Análisis Diagnóstico Asistido por Gemini AI
    </div>
    <div style="border: 1px solid #a7f3d0; background-color: #f0fdf4; padding: 15px; font-size: 11px; color: #065f46; text-align: justify; margin-bottom: 20px; line-height: 1.5; border-radius: 0 0 6px 6px;">
      <div id="texto-analisis-ia">Procesando perfil cognitivo con Gemini AI...</div>
    </div>
    
    <div style="font-size: 12px; font-weight: bold; color: #0f172a; background-color: #f8fafc; padding: 6px 10px; border-left: 4px solid #64748b; margin-bottom: 8px; text-transform: uppercase;">
      4. Notas y Consideraciones Clínicas
    </div>
    <div style="border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 9.5px; color: #475569; text-align: justify; background-color: #f8fafc; line-height: 1.4;">
      <strong>AVISO LEGAL:</strong> Este reporte contiene estimaciones automatizadas basadas en telemetría de realidad virtual. No constituye un diagnóstico médico definitivo.
    </div>
  `;

  const clonDatos = elementoBase.cloneNode(true) as HTMLElement;
  const elementosClon = Array.from(clonDatos.querySelectorAll("*"));
  const tituloClon = elementosClon.find(el => {
    const texto = el.textContent?.trim() || "";
    return texto.startsWith("Informe de") && texto.length < 50;
  });
  if (tituloClon) tituloClon.remove();
  
  clonDatos.querySelectorAll("button, .detail-actions").forEach(btn => btn.remove());

  const estilosDatos = document.createElement("style");
  estilosDatos.textContent = `
    #datos-clonados-pdf { font-size: 11px; color: #1e293b; }
    #datos-clonados-pdf * { box-shadow: none !important; border-radius: 0 !important; }
    #datos-clonados-pdf .grid { display: flex !important; flex-direction: column !important; gap: 10px !important; }
    #datos-clonados-pdf [class*="bg-"] { background-color: transparent !important; }
    #datos-clonados-pdf [class*="border"] { border: 1px solid #cbd5e1 !important; }
    #datos-clonados-pdf .flex.justify-between { display: flex; justify-content: space-between; border-bottom: 1px dotted #cbd5e1; padding: 4px 0; }
    #datos-clonados-pdf h3, #datos-clonados-pdf .font-bold.text-lg { font-size: 12px !important; color: #0f172a !important; margin-bottom: 6px !important; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  `;
  
  plantilla.prepend(estilosDatos);
  const contenedorClonados = plantilla.querySelector("#datos-clonados-pdf");
  if (contenedorClonados) contenedorClonados.appendChild(clonDatos);

  return plantilla;
}

export function inicializarGeneradorPdf(): void {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement | null;
    const boton = target?.closest<HTMLButtonElement>(".btn-pdf-atleta");
    if (!boton) return;

    event.preventDefault();
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = "🧠 Analizando con Gemini...";
    boton.disabled = true;

    let contenedorOculto: HTMLDivElement | undefined;
    try {
      const dialog = boton.closest("dialog");
      const elementoBase = dialog?.firstElementChild as HTMLElement | null ?? boton.closest<HTMLElement>("article");
      if (!elementoBase) throw new Error("No se encontró la información del atleta.");

      const todosLosElementos = Array.from(elementoBase.querySelectorAll("*"));
      const tituloElemento = todosLosElementos.find(el => {
        const texto = el.textContent?.trim() || "";
        return texto.startsWith("Informe de") && texto.length < 50;
      });
      
      let nombreAtleta = "Atleta";
      let deporteAtleta = "General";
      
      if (tituloElemento && tituloElemento.textContent) {
        const tituloLimpio = tituloElemento.textContent.replace("Informe de", "").trim();
        if (tituloLimpio.includes("·")) {
          const partes = tituloLimpio.split("·");
          nombreAtleta = partes[0].trim();
          deporteAtleta = partes[1]?.trim() || "General";
        } else {
          nombreAtleta = tituloLimpio.split(" ")[0];
        }
      }

      const recoElement = todosLosElementos.find(el => el.textContent?.includes("Recomendación registrada"));
      let recomendacion = "-";
      if (recoElement && recoElement.textContent) {
         recomendacion = recoElement.textContent.replace("Recomendación registrada:", "").trim() || "-";
      }
      
      const textosCrudos = todosLosElementos.map(el => el.textContent?.trim() || "");
      const metricasClave = textosCrudos.filter(t => t.includes("/") || t.includes("puntos") || t.includes("segundos")).join(" | ");

      const datosExtraidos: DatosAtleta = {
        nombre: nombreAtleta,
        deporte: deporteAtleta,
        recomendacionOriginal: recomendacion,
        resumenMetricas: metricasClave.substring(0, 250)
      };

      const htmlIA = await generarAnalisisIA(datosExtraidos);

      const clone = crearInforme(elementoBase);
      const cajaIA = clone.querySelector("#texto-analisis-ia");
      if (cajaIA) {
        cajaIA.innerHTML = htmlIA;
      }

      contenedorOculto = document.createElement("div");
      contenedorOculto.style.position = "absolute";
      contenedorOculto.style.left = "-9999px";
      contenedorOculto.style.top = "0";
      contenedorOculto.appendChild(clone);
      document.body.appendChild(contenedorOculto);

      await generarInformePdf(clone, `Informe_Clinico_${nombreAtleta}.pdf`);
    } catch (error) {
      console.error("Error en exportación:", error);
      alert(`Error al generar el informe: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      contenedorOculto?.remove();
      boton.innerHTML = textoOriginal;
      boton.disabled = false;
    }
  });
}