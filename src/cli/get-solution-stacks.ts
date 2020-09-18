import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<{}, { platform: string; region: string }> = {
	describe: 'get solution stacks',
	handler: async function({ platform, region }) {
		const application = new Application({
			region,
		});
		const allStacks = await application.getSolutionStack(platform);
		console.info(allStacks);
	},
	command: 'get-solution-stacks',
	builder: {
		platform: {
			demandOption: false,
			type: 'string',
			description: 'The platform to use (Nodejs/Java)',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
