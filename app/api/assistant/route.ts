import { AssistantResponse } from 'ai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    console.log('Request received');
    
    const input: {
      threadId: string | null;
      message: string;
    } = await req.json();
    
    console.log('Parsed input:', input);

    const threadId = input.threadId ?? (await openai.beta.threads.create({})).id;
    console.log('Thread ID:', threadId);

    const createdMessage = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: input.message,
    });

    console.log('Created message:', createdMessage);

    const assistantId = process.env.OPENAI_ASSISTANT_ID || '';

    if (!assistantId) {
      throw new Error('ASSISTANT_ID environment is not set');
    }

    return AssistantResponse(
      { threadId, messageId: createdMessage.id },
      async ({ forwardStream }) => {
        const runStream = openai.beta.threads.runs.stream(threadId, {
          assistant_id: assistantId,
        });

        await forwardStream(runStream);
      },
    );
  } catch (error) {
    console.error('Error in API route:', (error as Error).message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
