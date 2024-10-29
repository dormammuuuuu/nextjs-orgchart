# nextjs-orgchart

`nextjs-orgchart` is a flexible and interactive organizational chart component for React and Next.js applications. It allows for dynamic, hierarchical data visualization with support for customizable nodes, drag-and-drop reordering, zooming, and exporting to PNG or PDF formats. This component is ideal for representing complex team structures, project hierarchies, and organizational trees. This is the modernization of [dabeng](https://github.com/dabeng/react-orgchart) and [mahyarmadad](https://github.com/mahyarmadad/nextjs-orgchart) orgchart.

## Features

- **Hierarchy Representation**: Visualize nested relationships with expandable/collapsible child nodes.
- **Drag-and-Drop Reordering**: Rearrange nodes within the chart with drag-and-drop support.
- **Node Selection**: Click nodes to highlight and manage selected nodes.
- **Zooming and Panning**: Easily navigate complex hierarchies with zoom and pan functionality.
- **Customizable Node Templates**: Define custom templates for nodes using the `NodeTemplate` prop.
- **Export Options**: Export the entire chart as PNG or PDF.
- **Multiselect Support**: Enable multiple node selection.
- **Configurable**: Customize behavior for pan, zoom limits, collapsibility, and more.

## Installation

Install via npm or yarn:

```bash
npm install @dormammuuuuu/nextjs-orgchart
```

or

```bash
yarn add @dormammuuuuu/nextjs-orgchart
```

## CSS Styling

Include the provided CSS files in your project:
```javascript
import '@dormammuuuuu/nextjs-orgchart/ChartContainer.css';
import '@dormammuuuuu/nextjs-orgchart/ChartNode.css';
```

Add custom styles to the chart or nodes using the provided class names:
- **Container**: `.orgchart-container`
- **Chart**: `.orgchart`
- **Node**: `.oc-node`
- **Edges**: `.oc-edge` for top, bottom, left, and right edges

## Usage

```javascript
import React from 'react';
import ChartContainer from '@dormammuuuuu/nextjs-orgchart';
import '@dormammuuuuu/nextjs-orgchart/ChartContainer.css';
import '@dormammuuuuu/nextjs-orgchart/ChartNode.css';

const data = {
  id: "1",
  name: "CEO",
  relationship: "00",
  children: [
    {
      id: "2",
      name: "CTO",
      children: [{ id: "3", name: "Dev Lead" }]
    }
  ]
};

const MyNodeTemplate = ({ nodeData }) => (
  <div>
    <h4>{nodeData.name}</h4>
  </div>
);

function App() {
  return (
    <ChartContainer
      datasource={data}
      pan={true}
      zoom={true}
      NodeTemplate={MyNodeTemplate}
      draggable={true}
      collapsible={true}
      onClickNode={(node) => console.log("Node clicked:", node)}
    />
  );
}

export default App;
```

## Props

### `ChartContainer`

| Prop              | Type                                     | Default          | Description |
|-------------------|------------------------------------------|------------------|-------------|
| `datasource`      | `Datasource`                             | -                | Hierarchical data for the chart, including `id`, `name`, and optional `relationship` and `children`. |
| `pan`             | `boolean`                                | `false`          | Enables or disables panning (drag-to-move chart). |
| `zoom`            | `boolean`                                | `false`          | Enables or disables zooming. |
| `zoomoutLimit`    | `number`                                 | `0.5`            | Minimum zoom scale. |
| `zoominLimit`     | `number`                                 | `7`              | Maximum zoom scale. |
| `containerClass`  | `string`                                 | `""`             | Custom class for the container. |
| `chartClass`      | `string`                                 | `""`             | Custom class for the chart. |
| `NodeTemplate`    | `React.ComponentType<{ nodeData: Datasource }>` | `-`      | Custom template component for nodes. |
| `draggable`       | `boolean`                                | `false`          | Enables or disables node dragging for reordering. |
| `collapsible`     | `boolean`                                | `true`           | Enables or disables collapsibility of nodes. |
| `multipleSelect`  | `boolean`                                | `false`          | Enables selection of multiple nodes. |
| `onClickNode`     | `(datasource: Datasource) => void`       | `-`      | Callback when a node is clicked. |
| `onClickChart`    | `() => void`                             | `-`      | Callback when the chart area is clicked (outside any node). |

### `ChartNode` (Used Internally)

| Prop             | Type                                          | Description |
|------------------|-----------------------------------------------|-------------|
| `datasource`     | `Datasource`                                  | Data for an individual node. |
| `NodeTemplate`   | `React.ComponentType<NodeTemplateProps>`      | Custom template component for the node. |
| `draggable`      | `boolean`                                     | Enables or disables drag-and-drop for the node. |
| `collapsible`    | `boolean`                                     | Enables or disables collapsibility for the node. |
| `multipleSelect` | `boolean`                                     | Enables multiselect mode. |
| `changeHierarchy`| `(draggedNode: Datasource, targetId: string) => void` | Handles reordering of nodes in the hierarchy. |
| `onClickNode`    | `(datasource: Datasource) => void`            | Callback for node click events. |

## Services

### `dragNodeService`

- **Purpose**: Handles drag events for nodes, including the node being dragged and clearing drag info.
- **Methods**:
  - `sendDragInfo(id: string | number)`: Starts a drag operation for the node with the specified ID.
  - `clearDragInfo()`: Clears any current drag information.
  - `getDragInfo()`: Returns an observable with current drag info.

### `selectNodeService`

- **Purpose**: Manages selection events for nodes.
- **Methods**:
  - `sendSelectedNodeInfo(id: string | number)`: Sets the node with the specified ID as selected.
  - `clearSelectedNodeInfo()`: Clears any current selection info.
  - `getSelectedNodeInfo()`: Returns an observable with current selection info.

## Exporting the Chart

Use `useImperativeHandle` ref in `ChartContainer` to access the `exportTo` function and export the chart to PNG or PDF:

```javascript
import React, { useRef } from 'react';
import ChartContainer from '@dormammuuuuu/nextjs-orgchart';

const App = () => {
  const chartRef = useRef();

  const exportChart = () => {
    chartRef.current.exportTo("MyOrgChart", "pdf");
  };

  return (
    <>
      <button onClick={exportChart}>Export Chart</button>
      <ChartContainer ref={chartRef} datasource={data} />
    </>
  );
};

export default App;
```

- `exportTo(filename: string, format: string)`: Exports the chart as `PNG` or `PDF` with the specified filename.

## Example Datasource Structure

The `datasource` prop should be a hierarchical structure, as shown below:

```json
{
  "id": "1",
  "name": "CEO",
  "relationship": "00",
  "children": [
    {
      "id": "2",
      "name": "CTO",
      "children": [
        { "id": "3", "name": "Dev Lead" }
      ]
    }
  ]
}
```

## Customizing Nodes

Define a custom component and pass it to the `NodeTemplate` prop to render custom node templates:

```javascript
const MyNodeTemplate = ({ nodeData }) => (
  <div>
    <h4>{nodeData.name}</h4>
    <p>{nodeData.title}</p>
  </div>
);
```

Then pass it to `ChartContainer`:

```javascript
<ChartContainer datasource={data} NodeTemplate={MyNodeTemplate} />
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
