import type { ReactNode } from "react";


type PageContainerProps = {
  children: ReactNode;
  className?: string;
  width?: "standard" | "wide" | "narrow";
};


const widthClasses: Record<NonNullable<PageContainerProps["width"]>, string> = {
  narrow: "max-w-5xl",
  standard: "max-w-7xl",
  wide: "max-w-[1440px]",
};


export function PageContainer({
  children,
  className = "",
  width = "standard",
}: PageContainerProps) {
  return (
    <section className={["mx-auto w-full space-y-4", widthClasses[width], className].join(" ")}>
      {children}
    </section>
  );
}
