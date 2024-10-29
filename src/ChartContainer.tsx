import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { selectNodeService } from "./service";
// @ts-ignore
import { JSONHelper } from "@dormammuuuuu/json-helper";
import ChartNode from "./ChartNode";

interface Datasource {
  id: string;
  name: string;
  relationship?: string;
  children?: Datasource[];
}

interface ChartContainerProps {
  datasource: Datasource;
  pan?: boolean;
  zoom?: boolean;
  zoomoutLimit?: number;
  zoominLimit?: number;
  containerClass?: string;
  chartClass?: string;
  NodeTemplate?: React.ComponentType<{ nodeData: Datasource }>;
  draggable?: boolean;
  collapsible?: boolean;
  multipleSelect?: boolean;
  onClickNode?: (datasource: Datasource) => void;
  onClickChart?: () => void;
}

const ChartContainer = forwardRef<unknown, ChartContainerProps>(
  (
    {
      datasource,
      pan = false,
      zoom = false,
      zoomoutLimit = 0.5,
      zoominLimit = 7,
      containerClass = "",
      chartClass = "",
      NodeTemplate,
      draggable = false,
      collapsible = true,
      multipleSelect = false,
      onClickNode,
      onClickChart,
    },
    ref
  ) => {
    const container = useRef<HTMLDivElement>(null);
    const chart = useRef<HTMLDivElement>(null);
    const downloadButton = useRef<HTMLAnchorElement>(null);

    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [transform, setTransform] = useState("");
    const [panning, setPanning] = useState(false);
    const [cursor, setCursor] = useState<"default" | "move">("default");
    const [exporting, setExporting] = useState(false);
    const [dataURL, setDataURL] = useState("");
    const [download, setDownload] = useState("");

    const attachRel = (data: Datasource, flags: string): Datasource => {
      data.relationship =
        flags + (data.children && data.children.length > 0 ? "1" : "0");
      if (data.children) {
        data.children.forEach(function (item) {
          attachRel(item, "1" + (data.children && data.children.length > 1 ? "1" : "0"));
        });
      }
      return data;
    };

    const [ds, setDS] = useState(datasource);
    useEffect(() => {
      setDS(datasource);
    }, [datasource]);

    const dsDigger = JSONHelper({datasource, idProp: "id",  childrenProp: "children"});

    const clickChartHandler = (event: React.MouseEvent) => {
      if (!(event.target as HTMLElement).closest(".oc-node")) {
        if (onClickChart) {
          onClickChart();
        }
        selectNodeService.clearSelectedNodeInfo();
      }
    };

    const panEndHandler = () => {
      setPanning(false);
      setCursor("default");
    };

    const panHandler = (e: React.MouseEvent | TouchEvent) => {
      let newX = 0;
      let newY = 0;
      if (!(e as TouchEvent).targetTouches) {
        newX = (e as React.MouseEvent).pageX - startX;
        newY = (e as React.MouseEvent).pageY - startY;
      } else if ((e as TouchEvent).targetTouches.length === 1) {
        newX = (e as TouchEvent).targetTouches[0].pageX - startX;
        newY = (e as TouchEvent).targetTouches[0].pageY - startY;
      } else if ((e as TouchEvent).targetTouches.length > 1) {
        return;
      }
      if (transform === "") {
        setTransform("matrix(1,0,0,1," + newX + "," + newY + ")");
      } else {
        let matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          matrix[4] = String(newX);
          matrix[5] = newY + ")";
        } else {
          matrix[12] = String(newX);
          matrix[13] = String(newY);
        }
        setTransform(matrix.join(","));
      }
    };

    const panStartHandler = (e: React.MouseEvent | TouchEvent) => {
      if ((e.target as HTMLElement).closest(".oc-node")) {
        setPanning(false);
        return;
      } else {
        setPanning(true);
        setCursor("move");
      }
      let lastX = 0;
      let lastY = 0;
      if (transform !== "") {
        const matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          lastX = parseInt(matrix[4]);
          lastY = parseInt(matrix[5]);
        } else {
          lastX = parseInt(matrix[12]);
          lastY = parseInt(matrix[13]);
        }
      }
      if (!(e as TouchEvent).targetTouches) {
        setStartX((e as React.MouseEvent).pageX - lastX);
        setStartY((e as React.MouseEvent).pageY - lastY);
      } else if ((e as TouchEvent).targetTouches.length === 1) {
        setStartX((e as TouchEvent).targetTouches[0].pageX - lastX);
        setStartY((e as TouchEvent).targetTouches[0].pageY - lastY);
      }
    };

    const updateChartScale = (newScale: number) => {
      let matrix = [];
      let targetScale = 1;
      if (transform === "") {
        setTransform(`matrix(${newScale}, 0, 0, ${newScale}, 0, 0)`);
      } else {
        matrix = transform.split(",");
        if (transform.indexOf("3d") === -1) {
          targetScale = Math.abs(parseFloat(matrix[3]) * newScale);
          if (targetScale > zoomoutLimit && targetScale < zoominLimit) {
            matrix[0] = `matrix(${targetScale}`;
            matrix[3] = String(targetScale);
            setTransform(matrix.join(","));
          }
        } else {
          targetScale = Math.abs(parseFloat(matrix[5]) * newScale);
          if (targetScale > zoomoutLimit && targetScale < zoominLimit) {
            matrix[0] = `matrix3d(${targetScale}`;
            matrix[5] = String(targetScale);
            setTransform(matrix.join(","));
          }
        }
      }
    };

    const zoomHandler = (e: React.WheelEvent) => {
      const newScale = 1 + (e.deltaY > 0 ? -0.2 : 0.2);
      updateChartScale(newScale);
    };

    const exportPDF = (canvas: HTMLCanvasElement, exportFilename: string) => {
      import("jspdf").then((jsPDF) => {
        const canvasWidth = Math.floor(canvas.width);
        const canvasHeight = Math.floor(canvas.height);
        const doc =
          canvasWidth > canvasHeight
            ? new jsPDF.jsPDF({
                orientation: "landscape",
                unit: "px",
                format: [canvasWidth, canvasHeight],
              })
            : new jsPDF.jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [canvasHeight, canvasWidth],
              });
        doc.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, canvasWidth, canvasHeight);
        doc.save(exportFilename + ".pdf");
      });
    };

    const exportPNG = (canvas: HTMLCanvasElement, exportFilename: string) => {
      const isWebkit = "WebkitAppearance" in document.documentElement.style;
      const isFf = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      const isEdge =
        navigator.appName === "Microsoft Internet Explorer" ||
        (navigator.appName === "Netscape" &&
          navigator.appVersion.indexOf("Edge") > -1);

      if ((!isWebkit && !isFf) || isEdge) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = exportFilename + ".png";
        link.click();
      } else {
        setDataURL(canvas.toDataURL());
        setDownload(exportFilename + ".png");
        downloadButton.current!.click();
      }
    };

    const changeHierarchy = (draggedItemData: Datasource, dropTargetId: string) => {
      const nodeRemoved = dsDigger.removeNode(draggedItemData.id);
      if (nodeRemoved) {
        dsDigger.addChildren(dropTargetId, draggedItemData);
        // @ts-ignore - This is a hack to force a re-render
        setDS({ ...dsDigger.getAllNodes() });
      }
      return Promise.resolve();
    };

    useImperativeHandle(ref, () => ({
      exportTo: (exportFilename: string = "OrgChart", exportFileextension: string = "png") => {
        setExporting(true);
        const originalScrollLeft = container.current!.scrollLeft;
        container.current!.scrollLeft = 0;
        const originalScrollTop = container.current!.scrollTop;
        container.current!.scrollTop = 0;
        import("html2canvas").then((html2canvasModule) => {
          const html2canvas = html2canvasModule.default;
          html2canvas(chart.current!, {
            width: chart.current!.clientWidth,
            height: chart.current!.clientHeight,
            onclone: function (clonedDoc) {
              (clonedDoc.querySelector(".orgchart") as HTMLElement)!.style.background = "none";
              (clonedDoc.querySelector(".orgchart") as HTMLElement)!.style.transform = "";
            },
          }).then(
            (canvas) => {
              if (exportFileextension.toLowerCase() === "pdf") {
                exportPDF(canvas, exportFilename);
              } else {
                exportPNG(canvas, exportFilename);
              }
              setExporting(false);
              container.current!.scrollLeft = originalScrollLeft;
              container.current!.scrollTop = originalScrollTop;
            },
            () => {
              setExporting(false);
              container.current!.scrollLeft = originalScrollLeft;
              container.current!.scrollTop = originalScrollTop;
            }
          );
        });
      },
      expandAllNodes: () => {
        chart.current!
          .querySelectorAll(
            ".oc-node.hidden, .oc-hierarchy.hidden, .isSiblingsCollapsed, .isAncestorsCollapsed"
          )
          .forEach((el) => {
            el.classList.remove(
              "hidden",
              "isSiblingsCollapsed",
              "isAncestorsCollapsed"
            );
          });
      },
    }));

    return (
      <div
        ref={container}
        className={"orgchart-container " + containerClass}
        onWheel={zoom ? zoomHandler : undefined}
        onMouseUp={pan && panning ? panEndHandler : undefined}
      >
        <div
          ref={chart}
          className={"orgchart " + chartClass}
          style={{ transform: transform, cursor: cursor }}
          onClick={clickChartHandler}
          onMouseDown={pan ? panStartHandler : undefined}
          onMouseMove={pan && panning ? panHandler : undefined}
        >
          <ul>
            <ChartNode
              datasource={attachRel(ds, "00")}
              NodeTemplate={NodeTemplate}
              draggable={draggable}
              collapsible={collapsible}
              multipleSelect={multipleSelect}
              changeHierarchy={changeHierarchy}
              onClickNode={onClickNode}
            />
          </ul>
        </div>
        <a
          className="oc-download-btn hidden"
          ref={downloadButton}
          href={dataURL}
          download={download}
        >
          &nbsp;
        </a>
        <div className={`oc-mask ${exporting ? "" : "hidden"}`}>
          <i className="oci oci-spinner spinner"></i>
        </div>
      </div>
    );
  }
);

export default ChartContainer;
