import { updateGraphResultProperty, type GraphEdge, type GraphNode, type GraphProperty, type GraphVid } from "./graphResult";
import type { QueryResult } from "@/types/database";
export { graphPropertyFromUpdateResult, graphPropertyMatchesValue } from "./graphResult";

function quoteIdentifier(value: string): string {
  if (
    !value ||
    [...value].some((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 32 || (code >= 127 && code <= 159);
    })
  )
    throw new Error("Invalid NebulaGraph identifier");
  return `\`${value.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
}

function quoteVid(vid: GraphVid | undefined): string {
  if (!vid) throw new Error("Missing NebulaGraph vertex ID");
  if (vid.type === "string") return JSON.stringify(vid.value);
  if (vid.type === "int" && /^-?(?:0|[1-9]\d*)$/u.test(vid.value)) return vid.value;
  throw new Error("Unsupported NebulaGraph vertex ID");
}

function quoteValue(type: string, value: string | boolean): string {
  if (type === "string" && typeof value === "string") return JSON.stringify(value);
  if (type === "bool" && typeof value === "boolean") return value ? "true" : "false";
  if (type === "int" && typeof value === "string" && /^-?(?:0|[1-9]\d*)$/u.test(value)) return value;
  if (type === "float" && typeof value === "string" && /^(?:-?)(?:\d+\.\d*|\d*\.\d+|\d+)(?:[eE][+-]?\d+)?$/u.test(value) && Number.isFinite(Number(value))) return value;
  throw new Error("Invalid value for this NebulaGraph property type");
}

export function buildNebulaGraphPropertyUpdate(entity: GraphNode | GraphEdge, property: GraphProperty, value: string | boolean): string {
  const oldValue = property.value;
  if (oldValue === null) throw new Error("A null property needs its schema type before it can be edited");
  const name = quoteIdentifier(property.name);
  const next = quoteValue(property.type, value);
  const previous = quoteValue(property.type, oldValue);
  if ("labels" in entity) {
    if (!property.owner || !entity.labels.includes(property.owner)) throw new Error("Missing NebulaGraph Tag identity");
    return `UPDATE VERTEX ON ${quoteIdentifier(property.owner)} ${quoteVid(entity.vid)} SET ${name} = ${next} WHEN ${name} == ${previous} YIELD ${name} AS dbx_value`;
  }
  if (property.owner || !entity.rank || !/^-?\d+$/u.test(entity.rank)) throw new Error("Invalid NebulaGraph Edge identity");
  return `UPDATE EDGE ON ${quoteIdentifier(entity.type)} ${quoteVid(entity.sourceVid)} -> ${quoteVid(entity.targetVid)}@${entity.rank} SET ${name} = ${next} WHEN ${name} == ${previous} YIELD ${name} AS dbx_value`;
}

export function buildNebulaGraphExpand(node: GraphNode): string {
  return `GET SUBGRAPH WITH PROP 1 STEPS FROM ${quoteVid(node.vid)} YIELD VERTICES AS nodes, EDGES AS relationships`;
}

function propertyDisplay(property: GraphProperty): string {
  if (property.value === null) return "NULL";
  return property.type === "string" ? JSON.stringify(property.value) : String(property.value);
}

function nodeDisplay(node: GraphNode): string {
  const tags = node.labels.map((label) => {
    const properties = node.properties
      .filter((property) => property.owner === label)
      .map((property) => `${property.name}: ${propertyDisplay(property)}`)
      .join(", ");
    return `${label}{${properties}}`;
  });
  return `(${quoteVid(node.vid)}${tags.length ? ` :${tags.join(" :")}` : ""})`;
}

function edgeDisplay(edge: GraphEdge): string {
  const properties = edge.properties.map((property) => `${property.name}: ${propertyDisplay(property)}`).join(", ");
  return `[:${edge.type} ${quoteVid(edge.sourceVid)}->${quoteVid(edge.targetVid)} @${edge.rank} {${properties}}]`;
}

export function applyGraphPropertyToResult(result: QueryResult, entity: GraphNode | GraphEdge, property: GraphProperty, updated: GraphProperty): void {
  updateGraphResultProperty(result, entity, property, updated, nodeDisplay, edgeDisplay);
}
