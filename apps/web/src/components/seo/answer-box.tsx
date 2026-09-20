/** The direct 40 to 60 word answer that sits at the top of a page, for readers and answer engines. */
export function AnswerBox({ children }: { children: string }) {
  return (
    <p className="border-brand bg-surface mb-8 max-w-3xl rounded-r-2xl border-l-4 px-5 py-4 text-lg leading-relaxed">
      {children}
    </p>
  );
}
