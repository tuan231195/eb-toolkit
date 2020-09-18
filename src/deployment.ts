import { Application } from 'src/application';
import path from 'path';
import { sleep } from 'wait-promise';

const debug = require('debug')('eb:deployment');

type DeploymentOptions = {
	filePath: string;
	appName: string;
	appEnv: string;
	versionLabel?: string;
	stack: string;
	beanstalkConfig?: any;
	tags?: any[];
	tier: 'WebServer' | 'Worker';
	deploymentStrategy: 'standard' | 'bluegreen';
};

export class Deployment {
	private application: Application;

	constructor(credentials: any = undefined) {
		this.application = new Application(credentials);
	}

	async deploy({
		deploymentStrategy = 'standard',
		...options
	}: DeploymentOptions) {
		if (deploymentStrategy === 'standard') {
			return this.deployStandard(options);
		} else {
			return this.deployBlueGreen(options);
		}
	}

	async deployStandard({
		filePath,
		appEnv,
		appName,
		stack,
		versionLabel,
		beanstalkConfig,
		tags,
		tier,
	}: Omit<DeploymentOptions, 'deploymentStrategy'>) {
		debug(
			`Deploying with strategy standard for App: ${appName}, Env: ${appEnv}, Stack: ${stack}`
		);
		let defaultEnvName = await this.application.getDefaultEnvironment(
			appName,
			appEnv
		);
		if (!defaultEnvName) {
			defaultEnvName = Application.getDefaultEnvironmentName(
				appName,
				appEnv
			);
		}

		return this.application.deploy({
			filePath,
			environmentName: defaultEnvName,
			stack,
			versionLabel,
			applicationName: appName,
			beanstalkConfig: Deployment.getBeanstalkConfig(beanstalkConfig),
			tags,
			tier,
		});
	}

	async deployBlueGreen({
		filePath,
		appEnv,
		appName,
		stack,
		versionLabel,
		beanstalkConfig,
		tags,
		tier,
	}: Omit<DeploymentOptions, 'deploymentStrategy'>) {
		debug(
			`Deploying with bluegreen standard for App: ${appName}, Env: ${appEnv}, Stack: ${stack}`
		);

		let defaultEnvName = await this.application.getDefaultEnvironment(
			appName,
			appEnv
		);
		let environmentName;
		if (defaultEnvName) {
			environmentName = Deployment.getUniqueEnvironmentName(
				appName,
				appEnv
			);
		} else {
			defaultEnvName = Application.getDefaultEnvironmentName(
				appName,
				appEnv
			);
			environmentName = defaultEnvName;
		}

		await this.application.deploy({
			filePath,
			environmentName,
			versionLabel,
			stack,
			applicationName: appName,
			beanstalkConfig: Deployment.getBeanstalkConfig(beanstalkConfig),
			tags,
			tier,
		});

		if (environmentName !== defaultEnvName) {
			await this.swapEnvironmentCName({
				fromEnv: defaultEnvName,
				toEnv: environmentName,
			});
			debug(`Promoted ${environmentName} to ${defaultEnvName}`);
		}
	}

	private static getBeanstalkConfig(beanstalkConfig) {
		if (typeof beanstalkConfig === 'string') {
			return require(path.resolve(beanstalkConfig));
		}
		return beanstalkConfig;
	}

	private static getUniqueEnvironmentName(appName, appEnv, length = 6) {
		const randomSuffix = Math.random()
			.toString(36)
			.slice(2)
			.substring(0, length);
		return `${appName}-${appEnv}-${randomSuffix}`;
	}

	private async swapEnvironmentCName({ fromEnv, toEnv }) {
		const result = await this.application.swapEnvironmentCNAMEs({
			fromEnv,
			toEnv,
		});
		await sleep(60 * 1000);
		return result;
	}
}
