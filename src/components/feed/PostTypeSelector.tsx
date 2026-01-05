import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, MessageSquare, AlertTriangle, Megaphone, BarChart3 } from "lucide-react";

export type PostCategory = 'normal' | 'aviso' | 'campanha' | 'enquete';

interface PostTypeSelectorProps {
  value: PostCategory;
  onChange: (value: PostCategory) => void;
}

const postTypes: { value: PostCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'normal', label: 'Normal', icon: <MessageSquare className="h-4 w-4" />, color: 'text-foreground' },
  { value: 'aviso', label: 'Aviso', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-yellow-500' },
  { value: 'campanha', label: 'Campanha', icon: <Megaphone className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'enquete', label: 'Enquete', icon: <BarChart3 className="h-4 w-4" />, color: 'text-purple-500' },
];

export function PostTypeSelector({ value, onChange }: PostTypeSelectorProps) {
  const selected = postTypes.find(t => t.value === value) || postTypes[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className={selected.color}>{selected.icon}</span>
          <span>{selected.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {postTypes.map((type) => (
          <DropdownMenuItem
            key={type.value}
            onClick={() => onChange(type.value)}
            className="gap-2 cursor-pointer"
          >
            <span className={type.color}>{type.icon}</span>
            <span>{type.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
