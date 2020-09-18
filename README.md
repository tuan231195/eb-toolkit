A CLI tool to deploy AWS Beanstalk applications
======================================================

[![Build Status](https://travis-ci.org/tuan231195/eb-toolkit.svg?branch=master)](https://travis-ci.org/tuan231195/eb-toolkit)

This is a small CLI tool for deploying/interacting with AWS Beanstalk applications

## Table of Contents

* [Installation](#installation)
* [Basic Usage](#basic-usage)
* [Commands](#commands)


## Installation

```bash
npm i -g eb-toolkit
```

## Basic Usage

Deploy an application with bluegreen strategy

```bash
DEBUG=eb:* node ./dist/cli deploy --file-path acceptance/directory-case/tech-website-1 --deployment-strategy bluegreen --app-env test --app-name tech-website --platform 'node.js 12' --beanstalk-config acceptance/directory-case/config.json
```

Deploy an application with standard strategy (override the current application environment)

```bash
DEBUG=eb:* node ./dist/cli deploy --file-path acceptance/simple-case/tech-website-1.zip --deployment-strategy standard --app-env test --app-name tech-website --platform 'node.js 12' --beanstalk-config acceptance/simple-case/config.json
```

## Commands

```
eb-toolkit [command]

Commands:
  eb-toolkit deploy               deploy a beanstalk application version
  eb-toolkit get-default-env      get default environment
  eb-toolkit get-envs             get environments
  eb-toolkit get-app-versions     get application versions
  eb-toolkit get-solution-stacks  get solution stacks
  eb-toolkit clean-app-versions   clean application versions
  eb-toolkit clean-app-envs       clean application versions
  eb-toolkit delete-application   delete application
  eb-toolkit describe-env         get environments

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

```
