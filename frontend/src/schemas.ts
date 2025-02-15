import { z } from 'zod';

export const AvailableMessages = z.object({
	groups: z.array(z.object({
		name: z.string(),
		messages: z.array(z.string()),
	})),
});
export const ServerStateSchema = z.object({
	connectionState: z.discriminatedUnion("state", [
		z.object({ state: z.literal("not-connected") }),
		z.object({
			state: z.literal("connected"),
			channel: z.string(),
			user: z.string(),
			voice: z.string(),
		}),
	]),
	messages: AvailableMessages,
});

export type ServerState = z.input<typeof ServerStateSchema>;


