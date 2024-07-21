import { Request, Response } from 'express';
import { Thread } from '../database/entities/Thread';
import { ThreadRepository } from '../database/repositories/ThreadRepository';
import OpenAI from 'openai';
import { getThreadMessageWithSnippet } from '../utils/snippetUtils';
import { OPENAI_API_KEY } from '../envConstants';
import { Reply } from 'src/database/entities/Reply';

const SYSTEM_PROMPT = `
    You are an AI assistant helping helping understanding code using documentation and discussion.
    Provide detailed and context-aware responses based on the input provided. Format your answer in markdown only.
`;

const DIVIDER = `\n----------\n`;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const postPrompt = async (req: Request, res: Response) => {
  const userPrompt: string = req.body.prompt;
  const referToDoclinThreads: boolean = req.body.referToDoclinThreads;
  const referToCodeFile: boolean = req.body.referToCodeFile;
  const activeEditorText: string | undefined = req.body.activeEditorText;
  const projectId: number = parseInt(req.params.projectId);

  console.log(activeEditorText);

  const completeUserPrompt = await generateUserPrompt(
    userPrompt,
    projectId,
    referToDoclinThreads,
    referToCodeFile,
    activeEditorText
  );
  const reply = await getResponseFromGPT(completeUserPrompt);
  res.send({ reply: reply });
};

const generateUserPrompt = async (
  userPrompt: string,
  projectId: number,
  referToDoclinThreads: boolean,
  referToCodeFile: boolean,
  activeEditorText: string | undefined
): Promise<string> => {
  let completeUserPrompt = `${userPrompt}\n`;
  completeUserPrompt += `Answer the above question from user.`;

  if (referToDoclinThreads || referToCodeFile) {
    completeUserPrompt += `Use the references below for your answer, only if they are relevant to the question\n`;
    completeUserPrompt += DIVIDER;
  }

  if (referToDoclinThreads) {
    completeUserPrompt += `Previous discussion on the sytem:\n`;
    completeUserPrompt += (await getThreadsReference(userPrompt, projectId)) ?? `No relevant discussion threads found.`;
    completeUserPrompt += DIVIDER;
  }

  if (referToCodeFile && activeEditorText) {
    completeUserPrompt += `Currently opened code file:\n`;
    completeUserPrompt += activeEditorText;
  }

  return completeUserPrompt;
};

const getThreadsReference = async (userPrompt: string, projectId: number): Promise<string | null> => {
  const threads: Thread[] = await ThreadRepository.searchThreads(userPrompt, projectId, 5);

  if (threads.length === 0) {
    return null;
  }

  let response = `Discussion threads reference:\n`;
  response += threads.map(getThreadReference).join('\n');
  response += '\n';

  return response;
};

const getThreadReference = (thread: Thread, index: number, threads: Thread[]): string => {
  let response = `Thread ${index + 1} of ${threads.length}\n`;
  response += `${thread.title ?? ''}\n`;
  response += `${getThreadMessageWithSnippet(thread)}\n`;
  response += thread.replies.slice(0, 3).map(getReplyReference).join('\n');
  return response;
};

const getReplyReference = (reply: Reply, index: number, replies: Reply[]): string => {
  return `Reply ${index + 1} of ${replies.length}: ${getThreadMessageWithSnippet(reply)}`;
};

const getResponseFromGPT = async (userPrompt: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content;
};
