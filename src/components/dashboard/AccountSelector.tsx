import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface AccountOption {
  id: string;
  nome_cliente: string;
  meta_account_id: string | null;
  status: string;
}

interface AccountSelectorProps {
  value: string | null;
  onValueChange: (accountId: string | null) => void;
}

export function AccountSelector({ value, onValueChange }: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("accounts")
        .select("id, nome_cliente, meta_account_id, status")
        .eq("status", "Ativo")
        .order("nome_cliente");
      setAccounts(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const selected = accounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between bg-background/50 border-border/60 text-sm"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected ? selected.nome_cliente : "Todas as contas"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar conta..." />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                Todas as contas
              </CommandItem>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.nome_cliente}
                  onSelect={() => {
                    onValueChange(account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{account.nome_cliente}</span>
                    {account.meta_account_id && (
                      <span className="text-xs text-muted-foreground">
                        ID: {account.meta_account_id}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
