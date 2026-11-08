export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-2xl px-4 py-8">
      {children}
    </div>
  );
}
