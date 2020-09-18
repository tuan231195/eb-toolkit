import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName?: string; appEnv?: string; envName?: string; region: string }
> = {
	describe: 'get environments',
	handler: async function({ appName, appEnv, envName, region }) {
		const application = new Application({
			region,
		});
		if (!envName && appName && appEnv) {
			envName = await application.getDefaultEnvironment(appName, appEnv);
		}
		if (!envName) {
			throw new Error('No envName was specified');
		}
		const environmentDesc = await application.environment.describeEnvironment(
			envName
		);
		console.info(environmentDesc);
	},
	command: 'describe-env',
	builder: {
		appName: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk application name',
		},
		appEnv: {
			demandOption: false,
			type: 'string',
			description: 'Beanstalk application env',
		},
		envName: {
			demandOption: false,
			type: 'string',
			description:
				'Beanstalk environment name. Either this or (appName and appEnv) is required',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
