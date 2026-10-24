import { useEffect, useId, useMemo, useRef, useState } from "react";

interface MultiSelectFilterProps<T extends string> {
  label: string;
  mobileLabel?: string;
  options: readonly T[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
  formatOption?: (value: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function MultiSelectFilter<T extends string>({
  label,
  mobileLabel = label,
  options,
  selected,
  onChange,
  formatOption = (value) => value,
  searchable = false,
  searchPlaceholder = "Search options",
}: MultiSelectFilterProps<T>) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const availableOptions = useMemo(() => [...new Set([...options, ...selected])], [options, selected]);
  const visibleOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      return availableOptions;
    }
    return availableOptions.filter((option) => formatOption(option).toLocaleLowerCase().includes(normalizedSearch));
  }, [availableOptions, formatOption, search]);
  const selectionSummary = selected.length > 0
    ? `${selected.slice(0, 2).map(formatOption).join(", ")}${selected.length > 2 ? ` +${selected.length - 2}` : ""}`
    : "All";

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  function toggleOption(option: T) {
    if (selected.includes(option)) {
      onChange(selected.filter((value) => value !== option));
      return;
    }
    onChange([...selected, option]);
  }

  return (
    <div className="multi-select-filter" ref={containerRef} onKeyDown={(event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }}>
      <span className="filter-label">{label}</span>
      <button
        className={`filter-trigger${open ? " open" : ""}${selected.length > 0 ? " has-selection" : ""}`}
        type="button"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current);
          if (open) {
            setSearch("");
          }
        }}
      >
        <span className="filter-trigger-label">{mobileLabel}</span>
        <span className="filter-trigger-value" title={selected.map(formatOption).join(", ")}>{selectionSummary}</span>
        <span className="filter-chevron" aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="filter-menu">
          {searchable ? (
            <input
              className="filter-search"
              type="search"
              value={search}
              placeholder={searchPlaceholder}
              aria-label={`Search ${label.toLocaleLowerCase()}`}
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
            />
          ) : null}
          <div className="filter-option-list" id={listId} role="listbox" aria-multiselectable="true">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  className={isSelected ? "filter-option selected" : "filter-option"}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={option}
                  onClick={() => toggleOption(option)}
                >
                  <span className="filter-check" aria-hidden="true">{isSelected ? "✓" : ""}</span>
                  <span>{formatOption(option)}</span>
                </button>
              );
            }) : <p className="filter-no-options">No matching sizes</p>}
          </div>
          <div className={`filter-menu-actions${selected.length === 0 ? " selection-empty" : ""}`}>
            {selected.length > 0 ? (
              <button className="filter-clear" type="button" onClick={() => onChange([])}>Clear selection</button>
            ) : null}
            <button className="filter-done" type="button" onClick={() => {
              setOpen(false);
              setSearch("");
            }}>Done</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
