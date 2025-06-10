
'use client';

import { Button } from '@/components/ui/button';

interface SampleQueriesProps {
  queries: string[];
  onQueryClick: (query: string) => void;
}

// Simple Cloud SVG
const CloudIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path 
      d="M80 60H20C8.96 60 0 51.04 0 40S8.96 20 20 20c4.42 0 8.45 1.44 11.78 3.85C36.08 10.38 47.36 0 60 0c13.81 0 25 11.19 25 25 0 1.46-.13 2.89-.37 4.29C92.51 31.05 100 38.34 100 47.5 100 54.41 94.41 60 87.5 60H80z" 
      fill="currentColor"
    />
  </svg>
);


export function SampleQueries({ queries, onQueryClick }: SampleQueriesProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <CloudIcon className="w-16 h-auto text-primary mb-6 animate-float" data-ai-hint="cloud weather" />
      <h2 className="text-xl font-semibold mb-3 text-foreground">Start a conversation</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        You can ask me anything! Here are a few examples to get you started:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
        {queries.map((query, index) => (
          <Button
            key={index}
            variant="outline"
            className="text-left justify-start h-auto py-2.5 px-4 hover:bg-accent/50 w-full transition-shadow duration-300 ease-in-out hover:shadow-md text-sm"
            onClick={() => onQueryClick(query)}
          >
            <span className="truncate">{query}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-8">
        Or, just type your own message below.
      </p>
    </div>
  );
}
