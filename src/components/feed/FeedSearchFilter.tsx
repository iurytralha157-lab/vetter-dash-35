import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type CategoryFilter = 'all' | 'normal' | 'aviso' | 'campanha' | 'enquete';

interface FeedSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
}

export function FeedSearchFilter({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
}: FeedSearchFilterProps) {
  const categories: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'normal', label: 'Normal' },
    { value: 'aviso', label: 'Avisos' },
    { value: 'campanha', label: 'Campanhas' },
    { value: 'enquete', label: 'Enquetes' },
  ];

  const hasActiveFilter = categoryFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="flex items-center gap-2 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar posts ou @autor..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10 bg-card border-border/50"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className={`shrink-0 ${categoryFilter !== 'all' ? 'border-primary text-primary' : ''}`}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Categoria</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((cat) => (
            <DropdownMenuCheckboxItem
              key={cat.value}
              checked={categoryFilter === cat.value}
              onCheckedChange={() => onCategoryChange(cat.value)}
            >
              {cat.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Display */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange('');
            onCategoryChange('all');
          }}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          Limpar
        </Button>
      )}
    </div>
  );
}
