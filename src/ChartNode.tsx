import React, { useEffect, useRef, useState } from "react";
import { dragNodeService, selectNodeService } from "./service";

interface Datasource {
  id: string;
  name: string;
  title?: string;
  relationship?: string;
  children?: Datasource[];
}

interface NodeTemplateProps {
  nodeData: Datasource;
}

interface ChartNodeProps {
  datasource: Datasource;
  NodeTemplate?: React.ComponentType<NodeTemplateProps>;
  draggable?: boolean;
  collapsible?: boolean;
  multipleSelect?: boolean;
  changeHierarchy: (draggedNode: Datasource, targetId: string) => void;
  onClickNode?: (datasource: Datasource) => void;
}

const ChartNode: React.FC<ChartNodeProps> = ({
  datasource,
  NodeTemplate,
  draggable = false,
  collapsible = true,
  multipleSelect = false,
  changeHierarchy,
  onClickNode,
}) => {
  const node = useRef<HTMLDivElement>(null);

  const [isChildrenCollapsed, setIsChildrenCollapsed] = useState(false);
  const [topEdgeExpanded, setTopEdgeExpanded] = useState<boolean | undefined>();
  const [rightEdgeExpanded, setRightEdgeExpanded] = useState<boolean | undefined>();
  const [bottomEdgeExpanded, setBottomEdgeExpanded] = useState<boolean | undefined>();
  const [leftEdgeExpanded, setLeftEdgeExpanded] = useState<boolean | undefined>();
  const [allowedDrop, setAllowedDrop] = useState(false);
  const [selected, setSelected] = useState(false);

  const nodeClass = [
    "oc-node",
    isChildrenCollapsed ? "isChildrenCollapsed" : "",
    allowedDrop ? "allowedDrop" : "",
    selected ? "selected" : "",
  ]
    .filter((item) => item)
    .join(" ");

  useEffect(() => {
    const subs1 = dragNodeService.getDragInfo().subscribe((draggedInfo: any) => {
      if (draggedInfo && node.current) {
        setAllowedDrop(
          !document
            .querySelector("#" + draggedInfo.draggedNodeId)
            ?.closest("li")
            ?.querySelector("#" + node.current.id)
            ? true
            : false
        );
      } else {
        setAllowedDrop(false);
      }
    });

    const subs2 = selectNodeService.getSelectedNodeInfo().subscribe((selectedNodeInfo) => {
      if (selectedNodeInfo) {
        if (multipleSelect) {
          if (selectedNodeInfo.selectedNodeId === datasource.id) {
            setSelected(true);
          }
        } else {
          setSelected(selectedNodeInfo.selectedNodeId === datasource.id);
        }
      } else {
        setSelected(false);
      }
    });

    return () => {
      subs1.unsubscribe();
      subs2.unsubscribe();
    };
  }, [multipleSelect, datasource]);

  const addArrows = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = e.currentTarget.closest("li");
    const parent = (node?.parentNode as Element)?.closest("li");
    const isAncestorsCollapsed = (parent?.firstChild as Element)?.classList.contains("hidden");
    const isSiblingsCollapsed = node?.parentNode ? Array.from(node.parentNode.children).some(
      (item) => item.classList.contains("hidden")
    ) : false;

    setTopEdgeExpanded(!isAncestorsCollapsed);
    setRightEdgeExpanded(!isSiblingsCollapsed);
    setLeftEdgeExpanded(!isSiblingsCollapsed);
    setBottomEdgeExpanded(!isChildrenCollapsed);
  };

  const removeArrows = () => {
    setTopEdgeExpanded(undefined);
    setRightEdgeExpanded(undefined);
    setBottomEdgeExpanded(undefined);
    setLeftEdgeExpanded(undefined);
  };

  const toggleAncestors = (actionNode: HTMLElement) => {
    let node = (actionNode.parentNode as Element)?.closest("li");
    if (!node) return;
    const isAncestorsCollapsed = (node.firstChild as Element)?.classList.contains("hidden");
    if (isAncestorsCollapsed) {
      actionNode.classList.remove("isAncestorsCollapsed");
      (node.firstChild as Element)?.classList.remove("hidden");
    } else {
      const isSiblingsCollapsed = actionNode.parentNode ? Array.from(
        actionNode.parentNode?.children
      ).some((item) => item.classList.contains("hidden")) : false;
      if (!isSiblingsCollapsed) {
        toggleSiblings(actionNode);
      }
      actionNode.classList.add(
        ...("isAncestorsCollapsed" + (isSiblingsCollapsed ? "" : " isSiblingsCollapsed")).split(" ")
      );
      (node.firstChild as Element)?.classList.add("hidden");
      if (
        (node.parentNode as Element).closest("li") &&
        !((node.parentNode as Element).closest("li")?.firstChild as Element)?.classList.contains("hidden")
      ) {
        toggleAncestors(node);
      }
    }
  };

  const topEdgeClickHandler = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setTopEdgeExpanded(!topEdgeExpanded);
    toggleAncestors(e.currentTarget.closest("li") as HTMLElement);
  };

  const bottomEdgeClickHandler = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setIsChildrenCollapsed(!isChildrenCollapsed);
    setBottomEdgeExpanded(!bottomEdgeExpanded);
  };

  const toggleSiblings = (actionNode: HTMLElement) => {
    let node = actionNode.previousSibling as HTMLElement;
    const isSiblingsCollapsed = Array.from(
      actionNode.parentNode?.children || []
    ).some((item) => item.classList.contains("hidden"));
    actionNode.classList.toggle("isSiblingsCollapsed", !isSiblingsCollapsed);

    while (node) {
      node.classList.toggle("hidden", !isSiblingsCollapsed);
      node = node.previousSibling as HTMLElement;
    }
    node = actionNode.nextSibling as HTMLElement;
    while (node) {
      node.classList.toggle("hidden", !isSiblingsCollapsed);
      node = node.nextSibling as HTMLElement;
    }

    const isAncestorsCollapsed = actionNode.parentNode
      ? ((actionNode.parentNode as Element).closest("li")?.firstChild as Element)?.classList.contains("hidden")
      : false;
    if (isAncestorsCollapsed) {
      toggleAncestors(actionNode);
    }
  };

  const hEdgeClickHandler = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setLeftEdgeExpanded(!leftEdgeExpanded);
    setRightEdgeExpanded(!rightEdgeExpanded);
    toggleSiblings(e.currentTarget.closest("li") as HTMLElement);
  };

  const filterAllowedDropNodes = (id: string) => {
    dragNodeService.sendDragInfo(id);
  };

  const clickNodeHandler = () => {
    if (onClickNode) {
      onClickNode(datasource);
    }
    selectNodeService.sendSelectedNodeInfo(datasource.id);
  };

  const dragstartHandler = (event: React.DragEvent<HTMLDivElement>) => {
    const copyDS = { ...datasource };
    delete copyDS.relationship;
    event.dataTransfer.setData("text/plain", JSON.stringify(copyDS));
    filterAllowedDropNodes(node.current!.id);
  };

  const dragoverHandler = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const dragendHandler = () => {
    dragNodeService.clearDragInfo();
  };

  const dropHandler = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.classList.contains("allowedDrop")) {
      return;
    }
    dragNodeService.clearDragInfo();
    changeHierarchy(
      JSON.parse(event.dataTransfer.getData("text/plain")),
      event.currentTarget.id
    );
  };

  return (
    <li className="oc-hierarchy">
      <div
        ref={node}
        id={datasource.id}
        className={nodeClass}
        draggable={draggable ? true : undefined}
        onClick={clickNodeHandler}
        onDragStart={dragstartHandler}
        onDragOver={dragoverHandler}
        onDragEnd={dragendHandler}
        onDrop={dropHandler}
        onMouseEnter={addArrows}
        onMouseLeave={removeArrows}
      >
        {NodeTemplate ? (
          <NodeTemplate nodeData={datasource} />
        ) : (
          <>
            <div className="oc-heading">
              {datasource.relationship &&
                datasource.relationship.charAt(2) === "1" && (
                  <i className="oci oci-leader oc-symbol" />
                )}
              {datasource.name}
            </div>
            <div className="oc-content">{datasource.title}</div>
          </>
        )}
        {collapsible &&
          datasource.relationship &&
          datasource.relationship.charAt(0) === "1" && (
            <i
              className={`oc-edge verticalEdge topEdge oci ${
                topEdgeExpanded === undefined
                  ? ""
                  : topEdgeExpanded
                  ? "oci-chevron-down"
                  : "oci-chevron-up"
              }`}
              onClick={topEdgeClickHandler}
            />
          )}
        {collapsible &&
          datasource.relationship &&
          datasource.relationship.charAt(1) === "1" && (
            <>
              <i
                className={`oc-edge horizontalEdge rightEdge oci ${
                  rightEdgeExpanded === undefined
                    ? ""
                    : rightEdgeExpanded
                    ? "oci-chevron-left"
                    : "oci-chevron-right"
                }`}
                onClick={hEdgeClickHandler}
              />
              <i
                className={`oc-edge horizontalEdge leftEdge oci ${
                  leftEdgeExpanded === undefined
                    ? ""
                    : leftEdgeExpanded
                    ? "oci-chevron-right"
                    : "oci-chevron-left"
                }`}
                onClick={hEdgeClickHandler}
              />
            </>
          )}
        {collapsible &&
          datasource.relationship &&
          datasource.relationship.charAt(2) === "1" && (
            <i
              className={`oc-edge verticalEdge bottomEdge oci ${
                bottomEdgeExpanded === undefined
                  ? ""
                  : bottomEdgeExpanded
                  ? "oci-chevron-up"
                  : "oci-chevron-down"
              }`}
              onClick={bottomEdgeClickHandler}
            />
          )}
      </div>
      {datasource.children && datasource.children.length > 0 && (
        <ul className={isChildrenCollapsed ? "hidden" : ""}>
          {datasource.children.map((node) => (
            <ChartNode
              datasource={node}
              NodeTemplate={NodeTemplate}
              key={node.id}
              draggable={draggable}
              collapsible={collapsible}
              multipleSelect={multipleSelect}
              changeHierarchy={changeHierarchy}
              onClickNode={onClickNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default ChartNode;
