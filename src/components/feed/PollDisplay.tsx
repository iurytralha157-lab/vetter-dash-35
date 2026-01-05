import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PollDisplayProps {
  postId: string;
  options: string[];
  onVote?: () => void;
}

interface VoteData {
  option_index: number;
  count: number;
}

export function PollDisplay({ postId, options, onVote }: PollDisplayProps) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [postId]);

  const loadVotes = async () => {
    // Carregar votos
    const { data: allVotes } = await supabase
      .from('community_poll_votes')
      .select('option_index')
      .eq('post_id', postId);

    // Contar votos por opção
    const voteCounts: VoteData[] = options.map((_, index) => ({
      option_index: index,
      count: allVotes?.filter(v => v.option_index === index).length || 0
    }));
    setVotes(voteCounts);

    // Verificar se usuário já votou
    if (user) {
      const { data: myVote } = await supabase
        .from('community_poll_votes')
        .select('option_index')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (myVote) {
        setUserVote(myVote.option_index);
        setHasVoted(true);
      }
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!user) {
      toast.error('Faça login para votar');
      return;
    }

    setLoading(true);
    try {
      if (hasVoted) {
        // Atualizar voto
        await supabase
          .from('community_poll_votes')
          .update({ option_index: optionIndex })
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Novo voto
        await supabase
          .from('community_poll_votes')
          .insert({
            post_id: postId,
            user_id: user.id,
            option_index: optionIndex
          });
      }

      setUserVote(optionIndex);
      setHasVoted(true);
      await loadVotes();
      onVote?.();
    } catch (error) {
      console.error('Erro ao votar:', error);
      toast.error('Erro ao registrar voto');
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = votes.reduce((sum, v) => sum + v.count, 0);

  return (
    <div className="space-y-2 mt-3">
      {options.map((option, index) => {
        const voteCount = votes.find(v => v.option_index === index)?.count || 0;
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const isSelected = userVote === index;

        return (
          <Button
            key={index}
            variant="outline"
            className={`w-full justify-start relative overflow-hidden h-auto py-3 ${
              isSelected ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => handleVote(index)}
            disabled={loading}
          >
            {hasVoted && (
              <div 
                className="absolute inset-0 bg-primary/10 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {isSelected && <Check className="h-4 w-4 text-primary" />}
                <span className={isSelected ? 'font-medium' : ''}>{option}</span>
              </div>
              {hasVoted && (
                <span className="text-sm text-muted-foreground font-medium">
                  {percentage}%
                </span>
              )}
            </div>
          </Button>
        );
      })}
      <p className="text-xs text-muted-foreground text-center">
        {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
      </p>
    </div>
  );
}
