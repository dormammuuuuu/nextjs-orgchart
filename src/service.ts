import { Observable, Subject } from "rxjs";

interface DragInfo {
  draggedNodeId: string | number;
}

interface SelectedNodeInfo {
  selectedNodeId: string | number;
}

const subject1 = new Subject<DragInfo | null>();
const subject2 = new Subject<SelectedNodeInfo | null>();

export const dragNodeService = {
  sendDragInfo: (id: string | number): void => subject1.next({ draggedNodeId: id }),
  clearDragInfo: (): void => subject1.next(null),
  getDragInfo: (): Observable<DragInfo | null> => subject1.asObservable()
};

export const selectNodeService = {
  sendSelectedNodeInfo: (id: string | number): void => subject2.next({ selectedNodeId: id }),
  clearSelectedNodeInfo: (): void => subject2.next(null),
  getSelectedNodeInfo: (): Observable<SelectedNodeInfo | null> => subject2.asObservable()
};
