import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CampaignTypeSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CAMPAIGN_TYPES = [
  { value: "nao_classificada", label: "Não Classificada", color: "bg-muted" },
  { value: "mcmv", label: "MCMV", color: "bg-blue-500" },
  { value: "medio", label: "Médio Padrão", color: "bg-purple-500" },
  { value: "alto", label: "Alto Padrão", color: "bg-amber-500" },
];

export function CampaignTypeSelector({ value, onChange, disabled }: CampaignTypeSelectorProps) {
  const currentType = CAMPAIGN_TYPES.find((t) => t.value === value) || CAMPAIGN_TYPES[0];

  return (
    <Select value={value || "nao_classificada"} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <Badge variant="outline" className={`${currentType.color} text-white border-0`}>
            {currentType.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CAMPAIGN_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <Badge variant="outline" className={`${type.color} text-white border-0`}>
              {type.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
