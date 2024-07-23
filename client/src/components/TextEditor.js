import React, { useCallback, useEffect, useRef, useState } from "react";
import {useParams} from "react-router-dom";
import { io } from "socket.io-client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf"


import Quill from "quill";
import "quill/dist/quill.snow.css";

const SAVE_INTERVAL_MS = 2000

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  const [socket, setSocket] = useState()
  const [quill, setQuill] = useState()
  const {id: documentId} = useParams()
  const [filename, setFilename] = useState("document")

  // console.log("doc id: ", documentId)

  useEffect(() => {
    const s = io("http://localhost:3001");

    setSocket(s)

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket == null || quill == null) return

    socket.once("load-document", document => {
        quill.setContents(document)
        quill.enable()
    })

    socket.emit("get-document", documentId)
  }, [socket, quill, documentId])

  useEffect(() => {
    if (socket == null || quill == null) return 
    const handler = (delta, oldDelta, source) => {
        if (source !== 'user') return 
        socket.emit("send-changes", delta) // delta is just the changes in the document
    }
    quill.on("text-change", handler)

    return () => {
        quill.off("text-change", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return 
    const handler = (delta) => {
        quill.updateContents(delta)
    }
    socket.on("receive-changes", handler)

    return () => {
        socket.off("recieve-changes", handler)
    }
  }, [socket, quill])

  useEffect(() => {
    if (socket == null || quill == null) return 

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents())
    }, SAVE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [socket, quill])

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, { theme: "snow", modules: { toolbar: TOOLBAR_OPTIONS } });
    q.disable()
    q.setText("Loading...")
    setQuill(q)
  }, []);

  const saveAsPDF = () => {
    const editor = document.querySelector(".ql-editor");
    if (!editor) return;

    html2canvas(editor, { useCORS: true }).then((canvas) => {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      const imgWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      while (heightLeft > 0) {
        const canvasPage = document.createElement("canvas");
        canvasPage.width = canvas.width;
        canvasPage.height = Math.min(pageHeight * canvas.width / imgWidth, canvas.height - position);
        const ctx = canvasPage.getContext("2d");
        ctx.drawImage(canvas, 0, position, canvas.width, canvasPage.height, 0, 0, canvasPage.width, canvasPage.height);
        const imgData = canvasPage.toDataURL("image/png");

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, canvasPage.height * imgWidth / canvasPage.width);
        heightLeft -= pageHeight;
        position += pageHeight * canvas.width / imgWidth;

        if (heightLeft > 0) {
          pdf.addPage();
        }
      }

      pdf.save(`${filename}.pdf`);
    }).catch((error) => {
      console.error("Error generating PDF:", error);
    });
  };
  

  

  return <div>

    <div className="container" ref={wrapperRef}></div>
    <div className="file-actions">
      <input type="text" className="file-name" placeholder="Filename" value={filename} onChange={e => setFilename(e.target.value)}/>
      <button onClick={saveAsPDF}>Save as PDF</button>
    </div>

  </div>;
}
