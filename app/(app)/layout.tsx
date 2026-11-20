// Every screen inside (app) requires a logged-in user; proxy.ts enforces it.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex-1 flex flex-col min-h-full">
      <main className="flex-1 mx-auto w-full max-w-lg px-4 pt-safe pb-safe">{children}</main>
    </div>
  );
}
