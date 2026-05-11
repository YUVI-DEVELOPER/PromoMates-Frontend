type HtmlViewerProps = {
  sourceUrl: string;
};


export function HtmlViewer({ sourceUrl }: HtmlViewerProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner">
      <iframe
        title="Office document preview"
        src={sourceUrl}
        sandbox=""
        className="block h-[72vh] min-h-[360px] w-full bg-white sm:min-h-[520px]"
      />
    </div>
  );
}
