const express = require('express')
const {generateSlug} = require('random-word-slugs')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs')
const {Server, Socket} = require('socket.io')
const Redis = require('ioredis')

const app = express()
const PORT = 9000


//Add your redis url here, if you want to try this project 
const subscriber = new Redis('')

const io = new Server({cors: '*'})

io.on('connection', socket=>{
    socket.on('subscribe', channel=>{
        socket.join(channel)
        socket.emit('message', `Joined on channel : ${channel}`)
    })
})

io.listen(9002, ()=> console.log('Socker server running on port 9002'))

const ecsClient = new ECSClient({
    region: 'us-east-1',
    credentials: {
        // Add your AWS account access key and secret access key below, if you want to try this project 
        accessKeyId: '',
        secretAccessKey: ''
    }
})

const config = {
    //Add your cluster url below, if you want to try this project 
    CLUSTER : 'arn:aws:ecs:us-east-1:382742632034:cluster/builder-cluster01',
    //Add your task url below, if you want to try this project 
    TASK: 'arn:aws:ecs:us-east-1:382742632034:task-definition/new-builder-task-updated'
}

app.use(express.json())

app.post('/project', async (req,res)=> {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    // Spinning the Container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                //Add and make your changes here too
                subnets: ['subnet-0cc74dce8ab0033c2', 'subnet-09a1fc91d7adc2732',
                     'subnet-0376ce7dddbce1019', 'subnet-00879373aa42fc024', 
                    'subnet-0e0b2e9da6e341dfd', 'subnet-00eef4676b37b600e'
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

async function initRedisSubscribe(){
    console.log('Subscribed to logs')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

app.listen(PORT, ()=> {console.log(`API Server Running on port ....... ${PORT}`)})