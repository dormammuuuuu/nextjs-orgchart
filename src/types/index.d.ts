import React from 'react';
import { Observable } from 'rxjs';

interface Datasource<T = any> {
  [key: string]: any;
}

interface ChartContainerProps<T = Datasource> {
  datasource: Datasource;
  pan?: boolean;
  zoom?: boolean;
  zoomoutLimit?: number;
  zoominLimit?: number;
  containerClass?: string;
  chartClass?: string;
  NodeTemplate?: React.ComponentType<NodeTemplateProps>;
  draggable?: boolean;
  collapsible?: boolean;
  multipleSelect?: boolean;
  onClickNode?: (datasource: T) => void;
  onClickChart?: () => void;
}

interface DragInfo {
  draggedNodeId: string | number;
}

interface SelectedNodeInfo {
  selectedNodeId: string | number;
}

interface NodeTemplateProps<T> {
  nodeData: Datasource;
}

interface ChartNodeProps {
  datasource: Datasource;
  NodeTemplate?: React.ComponentType<NodeTemplateProps<T>>;
  draggable?: boolean;
  collapsible?: boolean;
  multipleSelect?: boolean;
  changeHierarchy: (draggedNode: Datasource, targetId: string) => void;
  onClickNode?: (datasource: Datasource) => void;
}

declare const ChartNode: React.FC<ChartNodeProps>;

declare const dragNodeService: {
  sendDragInfo: (id: string | number) => void;
  clearDragInfo: () => void;
  getDragInfo: () => Observable<DragInfo | null>;
};

declare const selectNodeService: {
  sendSelectedNodeInfo: (id: string | number) => void;
  clearSelectedNodeInfo: () => void;
  getSelectedNodeInfo: () => Observable<SelectedNodeInfo | null>;
};

export {
  ChartContainer, ChartContainerProps, ChartNode, ChartNodeProps, Datasource, DragInfo, dragNodeService, NodeTemplateProps, SelectedNodeInfo, selectNodeService
};

export default ChartContainer;