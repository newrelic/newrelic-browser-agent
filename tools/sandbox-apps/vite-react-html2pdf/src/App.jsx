import { useState, useCallback } from "react";
import { Buffer } from "buffer";
import "./App.css";

import html2pdf from "html2pdf.js";

function App() {
  const [resultedFile, setResultedFile] = useState(null);

  const onExport = useCallback(async () => {
    let pdfFile = null;

    try {
      const date = Date.now();
      const filename = `test-pdf_${date}`;
      console.log("Before worker");
      const worker = html2pdf()
        .set({
          enableLinks: true,
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 1 },
          html2canvas: {
            width: 816,
            scale: 1.5,
            allowTaint: true,
            useCORS: true,
          },
          jsPDF: {
            format: "letter",
            orientation: "portrait",
          },
        })
        .from(document.getElementById("export-pdf-container"));
      console.log("After worker");

      console.log("Before outputPDF");
      /*
        As of Safari 18.6, there was a case on the SPA browser agent (prior to v1.303.0)
        where html2pdf causes deeply nested promises, which in turn caused
        a deep call stack (when wrap-promise propagates the promises + loops through `getCtx` to locate the parent context).
        Fixed https://github.com/newrelic/newrelic-browser-agent/pull/1597.
      */
      await worker.outputPdf("datauristring").then((pdfAsString) => {
        const base64Data = pdfAsString.split(",")[1];
        const mimeType = pdfAsString.split(",")[0].split(":")[1].split(";")[0];
        const buffer = Buffer.from(base64Data, "base64");
        const ab = new ArrayBuffer(buffer.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < buffer.length; i++) {
          console.log("Buffer", i, "out of", buffer.length);
          ia[i] = buffer[i];
        }

        const pdfBlob = new Blob([ab], { type: mimeType });

        pdfFile = new File([pdfBlob], `${filename}.pdf`, {
          type: "application/pdf",
        });
      });
      console.log("After outputPdf");

      console.log("Before save");
      await worker.save();
      console.log("After save");

      alert("Export complete");
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setResultedFile(pdfFile);
    }
  }, []);

  return (
    <div className="App" id="export-pdf-container">
      <header className="App-header">
        <p>Hello Vite + React!</p>
        <p>
          <button type="button" onClick={onExport}>
            Export as PDF
          </button>
        </p>
        <p>
          Edit <code>App.jsx</code> and save to test HMR updates.
        </p>
        <p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          {" | "}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;
