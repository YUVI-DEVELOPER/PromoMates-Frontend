import { Link } from "react-router-dom";

import type { DocumentListItem } from "../../types/document";
import { EmptyState } from "../ui/EmptyState";
import { LoadingState } from "../ui/LoadingState";
import { DocumentStatusBadge } from "./DocumentStatusBadge";


type DocumentTableProps = {
  documents: DocumentListItem[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};


function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}


function fallbackName(name: string | undefined | null, id: number | null): string {
  if (name) {
    return name;
  }

  return id ? `ID ${id}` : "Not set";
}


export function DocumentTable({
  documents,
  isLoading,
  total,
  page,
  pageSize,
  onPageChange,
}: DocumentTableProps) {
  if (isLoading) {
    return <LoadingState label="Loading review content..." rows={4} />;
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No review content found"
        description="Create review content or adjust filters to continue MLR preparation."
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(total, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Number / Title</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Due Date</th>
              <th className="px-4 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {documents.map((document) => (
              <tr key={document.id} className="align-top transition hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {document.document_number}
                  </p>
                  <p className="mt-1 font-medium text-slate-950">{document.title}</p>
                </td>
                <td className="px-4 py-4">
                  <DocumentStatusBadge status={document.status} />
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {fallbackName(document.product?.name, document.product_id)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {document.owner?.full_name ?? `User ${document.owner_id}`}
                </td>
                <td className="px-4 py-4 text-slate-700">{formatDate(document.expiry_date)}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Link
                      to={`/library/${document.id}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      Open
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {documents.map((document) => (
          <Link
            key={document.id}
            to={`/library/${document.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-100 hover:bg-brand-50/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {document.document_number}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">{document.title}</h3>
              </div>
              <DocumentStatusBadge status={document.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <MobileDetail label="Product" value={fallbackName(document.product?.name, document.product_id)} />
              <MobileDetail label="Owner" value={document.owner?.full_name ?? `User ${document.owner_id}`} />
              <MobileDetail label="Due Date" value={formatDate(document.expiry_date)} />
              <MobileDetail label="Country" value={fallbackName(document.country?.name, document.country_id)} />
            </dl>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {firstItem}-{lastItem} of {total}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


type MobileDetailProps = {
  label: string;
  value: string;
};


function MobileDetail({ label, value }: MobileDetailProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}
