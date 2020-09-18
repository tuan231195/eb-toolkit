import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName: string; appEnv: string; region: string }
> = {
	describe: 'clean application versions',
	handler: async function({ appName, region }) {
		const application = new Application({
			region,
		});
		await application.cleanApplicationVersions(appName);
	},
	command: 'clean-app-versions',
	builder: {
		appName: {
			demandOption: true,
			type: 'string',
			description: 'Beanstalk application name',
		},
		region: {
			demandOption: false,
			type: 'string',
			description: 'AWS region',
		},
	},
};

export default commandModule;
