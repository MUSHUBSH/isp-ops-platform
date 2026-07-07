import type { TopologyGraph } from "../shared/api";

export function TopologyMap({ graph }: { graph: TopologyGraph }) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  return (
    <div className="topologyPreview">
      <svg viewBox="0 0 820 380" preserveAspectRatio="xMidYMid meet">
        {graph.edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);

          if (!source || !target) {
            return null;
          }

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          return (
            <g key={edge.id}>
              <path className={edge.status} d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`} />
              <text x={midX} y={midY - 8}>
                {edge.label}
              </text>
            </g>
          );
        })}
      </svg>
      {graph.nodes.map((node) => (
        <div
          className={`topologyNode ${node.status}`}
          key={node.id}
          style={{
            left: `${(node.x / 820) * 100}%`,
            top: `${(node.y / 380) * 100}%`
          }}
        >
          <span>{node.label}</span>
          <small>{node.type}</small>
        </div>
      ))}
    </div>
  );
}
