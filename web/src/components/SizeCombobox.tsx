import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { filterSizeOptions, isAllowedGarmentSize } from "../garmentOptions";
import type { Category } from "../types";

interface SizeComboboxProps {
  category: Category;
  value: string;
  onChange: (value: string) => void;
}

export function SizeCombobox({ category, value, onChange }: SizeComboboxProps) {
  const inputId = useId();
  const listId = `${inputId}-options`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const options = useMemo(() => filterSizeOptions(category, filterText), [category, filterText]);
  const invalid = value ? !isAllowedGarmentSize(category, value) : false;
  const activeOptionId = open ? options[activeIndex] ? `${listId}-${activeIndex}` : undefined : undefined;

  useEffect(() => {
    setFilterText("");
    setActiveIndex(-1);
  }, [category]);

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
        setTouched(true);
      }
    }
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  function selectOption(option: string) {
    onChange(option);
    setFilterText("");
    setOpen(false);
    setTouched(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (open) {
        const option = options[activeIndex];
        if (option) {
          event.preventDefault();
          selectOption(option);
        }
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setTouched(true);
      setOpen(false);
    }
  }

  return (
    <div className="form-field">
      <label htmlFor={inputId}>Size</label>
      <div className="size-combobox" ref={containerRef}>
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={activeOptionId}
          aria-invalid={invalid}
          value={value}
          maxLength={20}
          placeholder="Choose an EU size"
          autoComplete="off"
          required
          onFocus={(event) => {
            event.currentTarget.select();
            setFilterText("");
            setOpen(true);
          }}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            setFilterText(nextValue);
            setActiveIndex(-1);
            setOpen(true);
            setTouched(false);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          className="combobox-toggle"
          type="button"
          aria-label="Show size options"
          aria-expanded={open}
          onClick={() => {
            setFilterText("");
            setActiveIndex(-1);
            setOpen((current) => !current);
          }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
        {open ? (
          <ul className="combobox-options" id={listId} role="listbox">
            {options.length > 0 ? options.map((option, index) => (
              <li
                className={index === activeIndex ? "active" : undefined}
                id={`${listId}-${index}`}
                key={option}
                role="option"
                aria-selected={option === value}
                onPointerDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onPointerMove={() => setActiveIndex(index)}
              >
                {option}
              </li>
            )) : <li className="combobox-empty">No matching EU sizes</li>}
          </ul>
        ) : null}
      </div>
      {touched ? invalid ? <small className="field-error">Choose a size from the list.</small> : null : null}
    </div>
  );
}
