import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface PollCreatorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export function PollCreator({ options, onChange }: PollCreatorProps) {
  const addOption = () => {
    if (options.length < 4) {
      onChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      onChange(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
      <p className="text-sm font-medium text-muted-foreground">Opções da enquete</p>
      {options.map((option, index) => (
        <div key={index} className="flex gap-2 items-center">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {index + 1}
          </div>
          <Input
            placeholder={`Opção ${index + 1}`}
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            className="flex-1"
          />
          {options.length > 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-muted-foreground"
          onClick={addOption}
        >
          <Plus className="h-4 w-4" />
          Adicionar opção
        </Button>
      )}
    </div>
  );
}
