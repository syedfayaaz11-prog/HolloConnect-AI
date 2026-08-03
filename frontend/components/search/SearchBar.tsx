"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";

export function SearchBar({
  onSearch,
  loading,
  initialValue = "",
}: {
  onSearch: (query: string) => void;
  loading: boolean;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSearch(value.trim());
  }

  return (
    <form onSubmit={submit} className="glass rounded-xl2 p-2 flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the web with AI…"
        className="border-none bg-transparent focus:ring-0"
        autoFocus
      />
      <Button type="submit" disabled={loading || !value.trim()}>
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
