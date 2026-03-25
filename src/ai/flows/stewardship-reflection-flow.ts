'use server';
/**
 * @fileOverview Provides an AI-powered tool for generating personalized reflective prompts and scriptural insights
 * concerning financial stewardship based on user tithing activity.
 *
 * - stewardshipReflection - A function that handles the generation of stewardship reflections.
 * - StewardshipReflectionInput - The input type for the stewardshipReflection function.
 * - StewardshipReflectionOutput - The return type for the stewardshipReflection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StewardshipReflectionInputSchema = z.object({
  totalIncome: z
    .number()
    .describe('The total income recorded by the user for the period.'),
  titheAmount: z
    .number()
    .describe('The total tithe amount calculated for the period.'),
  monthlyEntriesCount: z
    .number()
    .int()
    .min(0)
    .describe('The number of income entries made by the user in the period.'),
  reflectionPeriod: z
    .string()
    .describe('A brief description of the period for reflection (e.g., "this month", "the last quarter").'),
});
export type StewardshipReflectionInput = z.infer<
  typeof StewardshipReflectionInputSchema
>;

const StewardshipReflectionOutputSchema = z.object({
  reflectivePrompt: z
    .string()
    .describe('A personalized reflective question about financial stewardship.'),
  scripturalInsights: z
    .array(z.string())
    .describe('2-3 relevant scriptural insights on financial stewardship and giving.'),
});
export type StewardshipReflectionOutput = z.infer<
  typeof StewardshipReflectionOutputSchema
>;

export async function stewardshipReflection(
  input: StewardshipReflectionInput
): Promise<StewardshipReflectionOutput> {
  return stewardshipReflectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'stewardshipReflectionPrompt',
  input: {schema: StewardshipReflectionInputSchema},
  output: {schema: StewardshipReflectionOutputSchema},
  prompt: `Based on the user's financial stewardship activity for {{{reflectionPeriod}}}, where they reported a total income of R${{{totalIncome}}} and dedicated R${{{titheAmount}}} as tithe across {{{monthlyEntriesCount}}} income entries, generate a personalized reflective question and 2-3 relevant scriptural insights on financial stewardship and giving. Respond in Portuguese.

Reflective Question:
Scriptural Insights:`,
});

const stewardshipReflectionFlow = ai.defineFlow(
  {
    name: 'stewardshipReflectionFlow',
    inputSchema: StewardshipReflectionInputSchema,
    outputSchema: StewardshipReflectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
