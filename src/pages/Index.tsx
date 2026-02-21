import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { search as wikiSearch } from "@/lib/wikiApi";
import type { WikiSearchResponse } from "@/lib/wikiApi";
import { SearchHome } from "@/components/SearchHome";
import { SearchResults } from "@/components/SearchResults";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<WikiSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const doSearch = async (query: string, type?: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchParams({ q: query });
    setLastQuery(query);
    try {
      const res = await wikiSearch({ q: query, type, sort: "relevance" });
      setResults(res);
    } catch {
      // toast shown by wikiApi
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setResults(null);
    setSearchParams({});
  };

  // Run initial search from URL params
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !results) doSearch(q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">검색 중...</p>
        </div>
      </div>
    );
  }

  if (results) {
    return <SearchResults initialResults={results} initialQuery={lastQuery} onBack={handleBack} />;
  }

  return <SearchHome onSearch={doSearch} />;
}
