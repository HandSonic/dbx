import type { EditableStructureColumn, TranswarpCreateTableOptions } from "@/lib/table/tableStructureEditorSql";

export interface TablePhysicalOptionsDraft {
  partitionColumnIds: string[];
  distributionColumnIds: string[];
  bucketCount: string;
  storageFormat: string;
  transactional: boolean;
}

export interface TablePhysicalOptionsConfig {
  partitionColumnsLabel: string;
  distributionColumnsLabel: string;
  bucketCountLabel: string;
  storageFormatLabel: string;
  transactionalLabel?: string;
  maxBuckets: number;
  storageFormats: readonly string[];
}

export const INCEPTOR_PHYSICAL_OPTIONS: TablePhysicalOptionsConfig = {
  partitionColumnsLabel: "structureEditor.transwarpPartitionColumns",
  distributionColumnsLabel: "structureEditor.transwarpBucketColumns",
  bucketCountLabel: "structureEditor.transwarpBucketCount",
  storageFormatLabel: "structureEditor.transwarpStorageFormat",
  transactionalLabel: "structureEditor.transwarpTransactional",
  maxBuckets: 4096,
  storageFormats: ["ORC", "PARQUET", "TEXTFILE"],
};

export function emptyTablePhysicalOptions(): TablePhysicalOptionsDraft {
  return { partitionColumnIds: [], distributionColumnIds: [], bucketCount: "", storageFormat: "", transactional: false };
}

export function hasTablePhysicalOptions(draft: TablePhysicalOptionsDraft): boolean {
  return draft.partitionColumnIds.length > 0 || draft.distributionColumnIds.length > 0 || !!draft.bucketCount.trim() || !!draft.storageFormat || draft.transactional;
}

export function pruneTablePhysicalOptions(draft: TablePhysicalOptionsDraft, availableColumnIds: ReadonlySet<string>): TablePhysicalOptionsDraft {
  const partitionColumnIds = draft.partitionColumnIds.filter((id) => availableColumnIds.has(id));
  const distributionColumnIds = draft.distributionColumnIds.filter((id) => availableColumnIds.has(id));
  if (partitionColumnIds.length === draft.partitionColumnIds.length && distributionColumnIds.length === draft.distributionColumnIds.length) return draft;
  return { ...draft, partitionColumnIds, distributionColumnIds };
}

interface LegacyInceptorDraft {
  physicalOptions?: TablePhysicalOptionsDraft;
  transwarpPartitionColumns?: string;
  transwarpBucketColumns?: string;
  transwarpBucketCount?: string;
  transwarpStorageFormat?: string;
  transwarpTransactional?: boolean;
}

export function restoreTablePhysicalOptions(saved: LegacyInceptorDraft, columns: readonly Pick<EditableStructureColumn, "id" | "name">[]): TablePhysicalOptionsDraft {
  if (saved.physicalOptions) {
    return {
      partitionColumnIds: [...(saved.physicalOptions.partitionColumnIds ?? [])],
      distributionColumnIds: [...(saved.physicalOptions.distributionColumnIds ?? [])],
      bucketCount: saved.physicalOptions.bucketCount ?? "",
      storageFormat: saved.physicalOptions.storageFormat ?? "",
      transactional: saved.physicalOptions.transactional ?? false,
    };
  }
  const legacyIds = (names: string | undefined) =>
    (names ?? "")
      .split(",")
      .map((name) => columns.find((column) => column.name.toLowerCase() === name.trim().toLowerCase())?.id)
      .filter((id): id is string => !!id);
  return {
    partitionColumnIds: legacyIds(saved.transwarpPartitionColumns),
    distributionColumnIds: legacyIds(saved.transwarpBucketColumns),
    bucketCount: saved.transwarpBucketCount ?? "",
    storageFormat: saved.transwarpStorageFormat === "__default" ? "" : (saved.transwarpStorageFormat ?? ""),
    transactional: saved.transwarpTransactional ?? false,
  };
}

export function buildInceptorCreateOptions(draft: TablePhysicalOptionsDraft, columns: readonly Pick<EditableStructureColumn, "id" | "name">[]): TranswarpCreateTableOptions {
  const names = (ids: readonly string[]) => ids.map((id) => columns.find((column) => column.id === id)?.name ?? id);
  const count = draft.bucketCount.trim();
  const parsedCount = Number(count);
  return {
    partitionColumns: names(draft.partitionColumnIds),
    bucketColumns: names(draft.distributionColumnIds),
    bucketCount: count ? (Number.isSafeInteger(parsedCount) && parsedCount > 0 && parsedCount <= 4096 ? parsedCount : 0) : undefined,
    storageFormat: draft.storageFormat || undefined,
    transactional: draft.transactional,
  };
}
