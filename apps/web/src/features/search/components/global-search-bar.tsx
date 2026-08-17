'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobalSearch } from '../hooks/use-global-search';
import {
  Search,
  X,
  Loader2,
  Users,
  BookOpen,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@coaching-os/ui';

export interface GlobalSearchBarProps {
  className?: string;
  initialQuery?: string;
  initialOpen?: boolean;
}

export function GlobalSearchBar({ className = '', initialQuery = '', initialOpen = false }: GlobalSearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState(initialQuery);
  const [isOpen, setIsOpen] = React.useState(initialOpen);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, isQueryValid, debouncedQuery } = useGlobalSearch(query);

  // Derive flat list of all visible result items for keyboard navigation
  const flatItems = React.useMemo(() => {
    if (!data) return [];
    const items: Array<{
      id: string;
      category: 'student' | 'batch' | 'invoice';
      title: string;
      subtitle?: string;
      targetPath: string;
    }> = [];

    data.students.forEach((s) => {
      items.push({
        id: `student-${s.id}`,
        category: 'student',
        title: s.displayName,
        subtitle: `Adm: ${s.admissionNumber}`,
        targetPath: s.targetPath,
      });
    });

    data.batches.forEach((b) => {
      items.push({
        id: `batch-${b.id}`,
        category: 'batch',
        title: b.displayName,
        subtitle: `${b.code}${b.subjectName ? ` • ${b.subjectName}` : ''}`,
        targetPath: b.targetPath,
      });
    });

    data.invoices.forEach((inv) => {
      const amountFormatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(inv.amount);

      items.push({
        id: `invoice-${inv.id}`,
        category: 'invoice',
        title: inv.invoiceNumber,
        subtitle: `${inv.studentName || 'Student'} • ${amountFormatted}`,
        targetPath: inv.targetPath,
      });
    });

    return items;
  }, [data]);


  // Click outside listener to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected) {
          handleNavigate(selected.targetPath);
        }
      }
    }
  };

  const hasResults =
    data &&
    (data.students.length > 0 || data.batches.length > 0 || data.invoices.length > 0);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-md ${className}`}
      data-testid="global-search-container"
    >
      {/* Search Input Box */}
      <div
        className="relative flex items-center"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="global-search-results"
      >
        <Search
          className="absolute left-3 h-4 w-4 text-[hsl(var(--muted-foreground))] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search students, batches, invoices..."
          aria-label="Global search"
          data-testid="global-search-input"
          className="w-full min-h-[44px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-9 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
        />

        {/* Action icons right (Clear or Loading) */}
        <div className="absolute right-3 flex items-center space-x-1">
          {isLoading && isQueryValid && (
            <Loader2
              className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]"
              aria-label="Searching..."
              data-testid="global-search-loading-spinner"
            />
          )}
          {query.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search query"
              data-testid="global-search-clear-button"
              className="p-1 rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] focus:outline-none"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Result Dropdown Panel */}
      {isOpen && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Global search results"
          data-testid="global-search-results-panel"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[80vh] overflow-y-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-lg backdrop-blur-md"
        >
          {/* 1. Prompt for short query */}
          {!isQueryValid && query.trim().length > 0 && (
            <div
              className="p-3 text-center text-xs text-[hsl(var(--muted-foreground))]"
              data-testid="global-search-short-query-message"
            >
              Type at least 2 characters to search
            </div>
          )}

          {/* 2. Empty input default message */}
          {query.trim().length === 0 && (
            <div className="p-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
              Search by student name, batch code, or invoice ID
            </div>
          )}

          {/* 3. Error state */}
          {isError && isQueryValid && (
            <div
              className="flex items-center space-x-2 p-3 text-xs text-[hsl(var(--destructive))]"
              data-testid="global-search-error-state"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Unable to search right now. Please try again.</span>
            </div>
          )}

          {/* 4. Loading state representation */}
          {isLoading && isQueryValid && !data && (
            <div
              className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]"
              data-testid="global-search-loading-state"
            >
              <Loader2 className="h-4 w-4 animate-spin inline mr-2 text-[hsl(var(--primary))]" />
              Searching for &quot;{debouncedQuery}&quot;...
            </div>
          )}

          {/* 5. Zero results state */}
          {!isLoading && isQueryValid && !isError && data && !hasResults && (
            <div
              className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]"
              data-testid="global-search-no-results-state"
            >
              No results found for &quot;{debouncedQuery}&quot;
            </div>
          )}

          {/* 6. Results rendering grouped by category */}
          {isQueryValid && !isError && data && hasResults && (
            <div className="space-y-3">
              {/* Category 1: Students */}
              {data.students.length > 0 && (
                <div data-testid="search-category-students" className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <span className="flex items-center space-x-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span>Students</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {data.students.length}
                    </Badge>
                  </div>
                  {data.students.map((student) => {
                    const itemIndex = flatItems.findIndex((i) => i.id === `student-${student.id}`);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <Link
                        key={student.id}
                        href={student.targetPath}
                        onClick={() => setIsOpen(false)}
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`search-result-student-${student.id}`}
                        className={`flex items-center justify-between rounded-md p-2 min-h-[44px] text-xs transition-colors ${
                          isSelected
                            ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-medium'
                            : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold truncate">{student.displayName}</p>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                            Adm: {student.admissionNumber}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
                          {student.status}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Category 2: Batches */}
              {data.batches.length > 0 && (
                <div data-testid="search-category-batches" className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <span className="flex items-center space-x-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Batches</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {data.batches.length}
                    </Badge>
                  </div>
                  {data.batches.map((batch) => {
                    const itemIndex = flatItems.findIndex((i) => i.id === `batch-${batch.id}`);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <Link
                        key={batch.id}
                        href={batch.targetPath}
                        onClick={() => setIsOpen(false)}
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`search-result-batch-${batch.id}`}
                        className={`flex items-center justify-between rounded-md p-2 min-h-[44px] text-xs transition-colors ${
                          isSelected
                            ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-medium'
                            : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold truncate">{batch.displayName}</p>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                            Code: {batch.code} {batch.subjectName ? `• ${batch.subjectName}` : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
                          {batch.status}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Category 3: Invoices */}
              {data.invoices.length > 0 && (
                <div data-testid="search-category-invoices" className="space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    <span className="flex items-center space-x-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span>Invoices</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {data.invoices.length}
                    </Badge>
                  </div>
                  {data.invoices.map((invoice) => {
                    const itemIndex = flatItems.findIndex((i) => i.id === `invoice-${invoice.id}`);
                    const isSelected = itemIndex === selectedIndex;

                    const amountFormatted = new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(invoice.amount);

                    return (
                      <Link
                        key={invoice.id}
                        href={invoice.targetPath}
                        onClick={() => setIsOpen(false)}
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`search-result-invoice-${invoice.id}`}
                        className={`flex items-center justify-between rounded-md p-2 min-h-[44px] text-xs transition-colors ${
                          isSelected
                            ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-medium'
                            : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="font-semibold truncate">{invoice.invoiceNumber}</p>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                            {invoice.studentName ? `${invoice.studentName} • ` : ''}
                            {amountFormatted}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
                          {invoice.status}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
