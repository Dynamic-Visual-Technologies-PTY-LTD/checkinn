/** White stars, as many as the Star rating, read as "5-star hotel" (DESIGN.md Star rating). */
export function Stars({ count }: { count: number }) {
  return (
    <span role="img" aria-label={`${count}-star hotel`} className="flex gap-0.5">
      {Array.from({ length: count }, (_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          className="size-4 fill-on-surface"
        >
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}
