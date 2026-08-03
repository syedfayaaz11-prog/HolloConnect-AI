export function FollowUpChips({
  questions,
  onSelect,
}: {
  questions: string[];
  onSelect: (question: string) => void;
}) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-3">Follow-up questions</h2>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="glass rounded-full px-4 py-2 text-xs text-gray-200 hover:bg-white/10 transition text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
