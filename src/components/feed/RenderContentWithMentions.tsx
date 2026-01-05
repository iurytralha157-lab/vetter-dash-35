import React from 'react';

interface RenderContentWithMentionsProps {
  content: string;
  onMentionClick?: (username: string) => void;
}

export function RenderContentWithMentions({ 
  content, 
  onMentionClick 
}: RenderContentWithMentionsProps) {
  // Regex para encontrar menções @username
  const mentionRegex = /@([A-Za-zÀ-ÿ\s]+?)(?=\s|$|[.,!?;:])/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Criar uma cópia do regex para iteração
  const regex = new RegExp(mentionRegex);
  
  while ((match = regex.exec(content)) !== null) {
    // Adicionar texto antes da menção
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{content.slice(lastIndex, match.index)}</span>
      );
    }
    
    // Adicionar a menção com estilo
    const username = match[1].trim();
    parts.push(
      <span
        key={key++}
        className="text-primary font-medium cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onMentionClick?.(username);
        }}
      >
        @{username}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar texto restante
  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }

  return <>{parts.length > 0 ? parts : content}</>;
}
