
'use client';

import { Button } from '@/components/ui/button';
import { ChatLogo } from '@/components/icons/ChatLogo'; // Changed from Lightbulb

interface SampleQueriesProps {
  queries: string[];
  onQueryClick: (query: string) => void;
}

export function SampleQueries({ queries, onQueryClick }: SampleQueriesProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <ChatLogo className="w-16 h-16 text-primary mb-6 animate-pulse" /> {/* Replaced Lightbulb, added animate-pulse */}
      <h2 className="text-2xl font-semibold mb-4 text-foreground">Start a conversation</h2>
      <p className="text-muted-foreground mb-8">
        You can ask me anything! Here are a few examples to get you started:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        {queries.map((query, index) => (
          <Button
            key={index}
            variant="outline"
            className="text-left justify-start h-auto py-3 px-4 hover:bg-accent/50"
            onClick={() => onQueryClick(query)}
          >
            {query}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-10">
        Or, just type your own message below.
      </p>
    </div>
  );
}
