const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')


// Add your redis url below
const publisher = new Redis('')


// Creating an S3 client
const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
        // Add your aws credential here, if you want to try this project
        accessKeyId: '',
        secretAccessKey: ''
    }
})

const PROJECT_ID = process.env.PROJECT_ID

function publishLog(log){
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({log}))
}

async function init(){
    console.log("script.js Executing started")
    publishLog('Build Started ......')

    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        publishLog(data.toString())
    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        publishLog(`error: ${data.toString()}`)
    })

    p.on('close', async function(){
        console.log('Build Complete')
        publishLog(`Build Complete..`)
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive: true})

        publishLog(`Uploading Started....`)
        for(const file of distFolderContents){
            const filePath = path.join(distFolderPath, file)
            if(fs.lstatSync(filePath).isDirectory()) continue;

            console.log("Uploading..... ", filePath)
            publishLog(`Uploading ${file}`)

            const command = new PutObjectCommand({
                Bucket: 'vercel-clone-project-01',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)

            console.log("Uploaded.....", filePath)
            publishLog(`Uploaded... ${file}`)
        }
        publishLog(`Done//.......`)
        console.log('Done........')
    })
}

init()

// DONE