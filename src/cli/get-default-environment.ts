import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName: string; appEnv: string; region: string }
> = {
	describe: 'get default environment',
	handler: async function({ appName, appEnv, region }) {
		const application = new Application({
			region,
		});
		const defaultEnv = await application.getDefaultEnvironment(
			appName,
			appEnv
		);
		console.info(defaultEnv);
	},
	command: 'get-default-env',
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
