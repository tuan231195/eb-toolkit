import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName: string; terminateEnvByForce: boolean; region: string }
> = {
	describe: 'delete application',
	handler: async function({ appName, region, terminateEnvByForce }) {
		const application = new Application({
			region,
		});
		await application.deleteApplication(appName, terminateEnvByForce);
	},
	command: 'delete-application',
	builder: {
		appName: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application name',
		},
		terminateEnvByForce: {
			demandOption: false,
			type: 'boolean',
			description: 'Whether to terminate Environment by force',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
