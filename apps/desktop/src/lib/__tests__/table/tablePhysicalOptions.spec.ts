import { describe, expect, it } from "vitest";
import { buildInceptorCreateOptions, emptyTablePhysicalOptions, hasTablePhysicalOptions, pruneTablePhysicalOptions, restoreTablePhysicalOptions } from "@/lib/table/tablePhysicalOptions";

const columns = [
  { id: "first", name: "id" },
  { id: "second", name: "day" },
  { id: "third", name: "label" },
];

describe("table physical options", () => {
  it("restores an older Inceptor draft into stable column identities", () => {
    const restored = restoreTablePhysicalOptions(
      {
        transwarpPartitionColumns: "day",
        transwarpBucketColumns: "id",
        transwarpBucketCount: "2",
        transwarpStorageFormat: "ORC",
        transwarpTransactional: true,
      },
      columns,
    );
    expect(restored).toMatchObject({ partitionColumnIds: ["second"], distributionColumnIds: ["first"], bucketCount: "2", storageFormat: "ORC", transactional: true });
    expect(hasTablePhysicalOptions(restored)).toBe(true);
    expect(hasTablePhysicalOptions(emptyTablePhysicalOptions())).toBe(false);
  });

  it("uses the current column name after a selected column is renamed", () => {
    const draft = { ...emptyTablePhysicalOptions(), partitionColumnIds: ["second"], distributionColumnIds: ["first"], bucketCount: "2", storageFormat: "ORC", transactional: true };
    const renamed = columns.map((column) => (column.id === "second" ? { ...column, name: "event_day" } : column));
    expect(buildInceptorCreateOptions(draft, renamed)).toEqual({
      partitionColumns: ["event_day"],
      bucketColumns: ["id"],
      bucketCount: 2,
      storageFormat: "ORC",
      transactional: true,
    });
    expect(pruneTablePhysicalOptions(draft, new Set(["first", "third"]))).toMatchObject({ partitionColumnIds: [], distributionColumnIds: ["first"] });
  });

  it("keeps an invalid bucket count in the SQL builder's validation path", () => {
    const draft = { ...emptyTablePhysicalOptions(), distributionColumnIds: ["first"], bucketCount: "1.5" };
    expect(buildInceptorCreateOptions(draft, columns).bucketCount).toBe(0);
  });
});
