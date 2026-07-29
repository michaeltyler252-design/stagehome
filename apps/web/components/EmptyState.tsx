export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="ticket-card mx-auto max-w-xl border-dashed p-8 text-center">
      <p className="font-display text-xl uppercase text-navy">{title}</p>
      <p className="mt-2 text-sm text-chalk/70">{description}</p>
    </div>
  );
}
