import html2pdf from "html2pdf.js";

// html2pdf.js declara este tipo dentro de su módulo, pero no lo exporta.
// Lo definimos localmente para tipar las opciones sin depender de un export inexistente.
type Html2PdfOptions = {
  margin?: number | [number, number] | [number, number, number, number];
  filename?: string;
  image?: {
    type?: "jpeg" | "png" | "webp";
    quality?: number;
  };
  html2canvas?: object;
  jsPDF?: {
    unit?: string;
    format?: string | [number, number];
    orientation?: "portrait" | "landscape";
  };
};

const PDF_FILENAME = "Informe_Estadistico_Atleta.pdf";

/** Genera y descarga el PDF de un elemento HTML. */
export async function generarInformePdf(
  element: HTMLElement,
  filename: string = PDF_FILENAME,
): Promise<void> {
  const options: Html2PdfOptions = {
    margin: 0.5,
    filename,
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
    jsPDF: { unit: "cm", format: "letter", orientation: "portrait" },
  };

  await html2pdf().set(options).from(element).save();
}

function crearInforme(elementoBase: HTMLElement): HTMLElement {
  const clone = elementoBase.cloneNode(true) as HTMLElement;
  clone.id = "informe-tecnico-pdf";

  clone.querySelectorAll("button, .detail-actions").forEach((element) => element.remove());

  const posibleTitulo = clone.querySelector("h1, h2, h3, .text-xl, .font-bold");
  const tituloReporte = posibleTitulo?.textContent?.trim() || "Estadísticas del Atleta";
  if (posibleTitulo instanceof HTMLElement) posibleTitulo.style.display = "none";

  const estilos = document.createElement("style");
  estilos.textContent = `
    #informe-tecnico-pdf { background-color: #fff !important; padding: 50px 60px !important; width: 800px !important; font-family: Georgia, 'Times New Roman', serif !important; color: #000 !important; }
    .cabecera-tecnica { text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 40px; }
    .cabecera-tecnica h1 { font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 0; color: #000 !important; }
    .cabecera-tecnica h2 { font-size: 18px; margin: 10px 0 0; color: #333 !important; font-weight: normal; }
    .cabecera-tecnica p { font-size: 12px; margin: 15px 0 0; font-family: Arial, sans-serif; color: #666 !important; }
    #informe-tecnico-pdf * { box-shadow: none !important; border-radius: 0 !important; }
    #informe-tecnico-pdf [class*="bg-"] { background: transparent !important; }
    #informe-tecnico-pdf [class*="border"] { border: none !important; }
    #informe-tecnico-pdf .grid { display: flex !important; flex-direction: column !important; gap: 30px !important; }
    #informe-tecnico-pdf .flex.justify-between, #informe-tecnico-pdf [class*="justify-between"] { display: flex !important; flex-direction: row !important; justify-content: space-between !important; border-bottom: 1px dotted #888 !important; padding: 6px 0 !important; margin: 0 !important; }
    #informe-tecnico-pdf h3, #informe-tecnico-pdf .font-bold.text-lg { font-size: 16px !important; text-transform: uppercase !important; border-bottom: 2px solid #000 !important; padding-bottom: 5px !important; margin-bottom: 15px !important; color: #000 !important; }
    #informe-tecnico-pdf p, #informe-tecnico-pdf span { color: #000 !important; }
    #informe-tecnico-pdf [style*="width"] { background-color: #333 !important; height: 12px !important; border: 1px solid #000 !important; }
  `;
  clone.prepend(estilos);

  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const cabecera = document.createElement("div");
  cabecera.className = "cabecera-tecnica";
  cabecera.innerHTML = `<h1>Laboratorio de Rendimiento SportMind</h1><h2>Informe de Estadísticas Avanzadas</h2><h2><strong></strong></h2><p>FECHA DE EMISIÓN: ${fecha.toUpperCase()}</p>`;
  cabecera.querySelector("strong")!.textContent = tituloReporte;
  clone.insertBefore(cabecera, estilos.nextSibling);

  return clone;
}

/** Conecta los botones de descarga de informes con el generador de PDF. */
export function inicializarGeneradorPdf(): void {
  document.addEventListener("click", async (event) => {
    const boton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(".btn-pdf-atleta");
    if (!boton) return;

    event.preventDefault();
    const textoOriginal = boton.innerHTML;
    boton.innerHTML = "⏳ Generando Informe...";
    boton.disabled = true;

    let contenedorOculto: HTMLDivElement | undefined;
    try {
      const dialog = boton.closest("dialog");
      const elementoBase = dialog?.firstElementChild as HTMLElement | null ?? boton.closest<HTMLElement>("article");
      if (!elementoBase) throw new Error("No se encontró la información del atleta.");

      const clone = crearInforme(elementoBase);
      contenedorOculto = document.createElement("div");
      contenedorOculto.style.position = "absolute";
      contenedorOculto.style.left = "-9999px";
      contenedorOculto.appendChild(clone);
      document.body.appendChild(contenedorOculto);

      await generarInformePdf(clone);
    } catch (error) {
      console.error("No fue posible generar el informe PDF.", error);
      alert(`Error al generar el informe: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      contenedorOculto?.remove();
      boton.innerHTML = textoOriginal;
      boton.disabled = false;
    }
  });
}
