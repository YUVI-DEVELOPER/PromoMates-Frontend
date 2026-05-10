import { PageContainer } from "../components/ui/PageContainer";


export function AccessDenied() {
  return (
    <PageContainer width="narrow">
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="mt-2 text-sm">
          You do not have permission to view this page.
        </p>
      </section>
    </PageContainer>
  );
}
