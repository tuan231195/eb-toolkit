import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName: string; appEnv: string; region: string }
> = {
	describe: 'clean application versions',
	handler: async function({ appName, appEnv, region }) {
		const application = new Application({
			region,
		});
		await application.cleanEnvironments(appName, appEnv);
	},
	command: 'clean-app-envs',
	builder: {
		appName: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application name',
		},
		appEnv: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application env',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
