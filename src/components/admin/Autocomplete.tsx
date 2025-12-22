"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder = "Search...",
  className = "",
  allowCustom = true,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on input
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Sync input value with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If allowCustom is false and input doesn't match an option, clear it
        if (!allowCustom && !options.some((o) => o.label === inputValue)) {
          setInputValue(value);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, inputValue, options, value]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlighted = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // If allowCustom, update parent immediately
    if (allowCustom) {
      onChange(newValue);
    }
  };

  const selectOption = useCallback((option: Option) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          selectOption(filteredOptions[0]);
        } else if (allowCustom) {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const clearValue = () => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-16 rounded-lg border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none text-sm"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={clearValue}
              className="p-1 text-[#6B5344] hover:text-[#2C1810] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="p-1 text-[#6B5344] hover:text-[#2C1810] rounded"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-[#E5DDD5] rounded-lg shadow-lg"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex
                    ? "bg-[#C9A227]/10 text-[#2C1810]"
                    : "text-[#6B5344] hover:bg-[#FDF8F3]"
                } ${option.value === value ? "font-medium text-[#C9A227]" : ""}`}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-[#6B5344] italic">
              {allowCustom ? `Use "${inputValue}"` : "No results found"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Convenience wrapper for country selection
import countriesData from "@/data/countries.json";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
  className = "",
}: CountrySelectProps) {
  const options = countriesData.map((country) => ({
    label: `${country.flag} ${country.name}`,
    value: country.name,
  }));

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      allowCustom={false}
    />
  );
}

// Convenience wrapper for city selection
import citiesData from "@/data/cities.json";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  country?: string; // Optional country filter (by name)
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  country,
  placeholder = "Search city...",
  className = "",
}: CityAutocompleteProps) {
  // Find country code from name if provided
  const countryCode = country
    ? countriesData.find((c) => c.name === country)?.code
    : undefined;

  // Get cities for selected country (prioritized) and all other cities
  const countryCities = countryCode
    ? citiesData.filter((city) => city.country === countryCode)
    : [];
  const otherCities = countryCode
    ? citiesData.filter((city) => city.country !== countryCode)
    : citiesData;

  // Combine: country cities first, then all others
  const allCities = [...countryCities, ...otherCities];

  const options = allCities.map((city) => {
    // Add country flag for cities from other countries
    const cityCountry = countriesData.find((c) => c.code === city.country);
    const showFlag = countryCode && city.country !== countryCode && cityCountry;
    return {
      label: showFlag ? `${city.name} ${cityCountry.flag}` : city.name,
      value: city.name,
    };
  });

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      allowCustom={true}
    />
  );
}
