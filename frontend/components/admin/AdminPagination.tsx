import { Button } from "@/components/ui/primitives";

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  loading,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="ghost" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages} · {total} total
      </span>
      <Button variant="ghost" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
