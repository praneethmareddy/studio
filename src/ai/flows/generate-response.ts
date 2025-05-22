// src/ai/flows/generate-response.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating AI responses, incorporating summarized context from previous conversation turns.
 *
 * - generateResponse - A function that generates AI responses based on user prompts and conversation history.
 * - GenerateResponseInput - The input type for the generateResponse function, including the user's prompt and conversation context.
 * - GenerateResponseOutput - The return type for the generateResponse function, containing the AI-generated response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The user prompt to generate a response for.'),
  contextSummary: z
    .string()
    .describe(
      'A summarized context of the previous conversation turns to maintain conversation history.'
    ),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated response to the user prompt.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `You are a helpful AI assistant.  Use the context from previous turns to provide
relevant and accurate answers.  Here is a summary of the previous conversation:

{{contextSummary}}

Now, respond to the following prompt:

{{prompt}}`,
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
