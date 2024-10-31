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
import { toJpeg, toPng } from "html-to-image";
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

    const exportPDF = (dataUrl: string, exportFilename: string) => {
      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${exportFilename}</title>
          </head>
          <body>
            <img src="${dataUrl}" id="chartImage" style="max-width: 100%;" />
          </body>
          </html>
        `);
        newWindow.document.close();
        const img = newWindow.document.getElementById("chartImage") as HTMLImageElement;
        img.onload = () => {
          newWindow.print();
        };
      }
    };

    const exportPNG = (dataUrl: string, exportFilename: string) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${exportFilename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const changeHierarchy = (draggedItemData: Datasource, dropTargetId: string) => {
      const nodeRemoved = dsDigger.removeNode(draggedItemData.id);
      if (nodeRemoved) {
        dsDigger.addChildren(dropTargetId, draggedItemData);
        // @ts-ignore - This is a hack and not yet implemented in the library
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
        document.fonts.ready.then(() => {
          const exportFunction = exportFileextension.toLowerCase() === "pdf" ? toJpeg : toPng;
          exportFunction(chart.current!, { cacheBust: true, quality: 1, includeQueryParams: true, backgroundColor: '#fff' }).then(
            (dataUrl) => {
              if (exportFileextension.toLowerCase() === "pdf") {
                exportPDF(dataUrl, exportFilename);
              } else {
                exportPNG(dataUrl, exportFilename);
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
        if (chart.current) {
          chart.current
            .querySelectorAll(".oc-hierarchy .hidden")
            .forEach((el) => {
              el.classList.remove("hidden");
            });
        }
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
