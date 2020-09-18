import { Application } from 'src/index';
import { CommandModule } from 'yargs';

const commandModule: CommandModule<
	{},
	{ appName: string; appEnv: string; region: string }
> = {
	describe: 'get application versions',
	handler: async function({ appName, region }) {
		const application = new Application({
			region,
		});
		const allVersions = await application.getApplicationVersions(appName);
		console.info(allVersions);
	},
	command: 'get-app-versions',
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
