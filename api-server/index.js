const express = require('express')
const {generateSlug} = require('random-word-slugs')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs')

const app = express()
const PORT = 9000

const ecsClient = new ECSClient({
    region: 'us-east-1',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
})

const config = {
    CLUSTER : '',
    TASK: ''
}

app.use(express.json())

app.post('/project', async (req,res)=> {
    const { gitURL } = req.body
    const projectSlug = generateSlug()

    // Spinning the Container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: ['subnet-0cc74dce8ab0033c2', 'subnet-09a1fc91d7adc2732',
                     'subnet-0376ce7dddbce1019', 'subnet-00879373aa42fc024', 
                    '', 'subnet-00eef4676b37b600e'
                ],
                securityGroups: ['sg-0db4b434034bbdb0d']
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'new-builder-image',
                    environment: [
                        {
                            name: 'GIT_REPOSITORY__URL', value: gitURL
                        },
                        {
                            name: 'PROJECT_ID', value: projectSlug
                        }
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: {projectSlug, url: `http://${projectSlug}.localhost:8000`}})
})

app.listen(PORT, ()=> {console.log(`API Server Running on port ....... ${PORT}`)})