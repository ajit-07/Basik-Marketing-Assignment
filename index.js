const express = require('express')
const multer = require('multer')
const aws = require('aws-sdk')
const fs = require('fs')

const app = express()
app.use(express.json())
app.use(multer().any())

//Testing API
app.get('/', (req, res) => {
    console.log('Testing API')
    return res.send({ status: true, message: 'Request-Response cycle working properly..' })
})



//Configuration to AWS server.
aws.config.update({
    accessKeyId: "AKIA2V74B4GZ7Y2RL2OH",
    secretAccessKey: "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",
    region: "ap-south-1"
})

//For getting the contents of the AWS S3 bucket.
let s3 = new aws.S3({ apiVersion: '2006-03-01' })
s3.listObjects({ Bucket: 'cloudfront-demo-07' }, (err, data) => {
    if (err) {
        console.log(err);
    } else {
        console.log(data.Contents);
    }
});

//Function for uploading the file to AWS S3 bucket.
let uploadFile = async (fileName, directoryPath) => {
    return new Promise((resolve, reject) => {
        let s3 = new aws.S3({ apiVersion: '2006-03-01' })
        var uploadParams = {
            ACL: 'public-read',
            Bucket: 'cloudfront-demo-07',
            Key: `${directoryPath}${fileName}`,
            Body: fs.readFileSync(fileName)
        }
        s3.upload(uploadParams, (err, data) => {
            if (err) {
                return reject({ 'error': err })
            }
            console.log('file uploaded successfully')
            return resolve(data.Location)
        })
    })
}

//API for creating new CDN entry.
const cloudfront = new aws.CloudFront();
app.post('/create', async (req, res) => {
    try {
        const { directoryPath, content } = req.body
        if (!directoryPath || !content) return res.status(400).send({ status: false, message: 'Content and directory path mandatory for craeting entry to CDN' })

        let fileName = `${Date.now()}.json`
        fs.writeFileSync(fileName, JSON.stringify(content))

        let fileUrl = await uploadFile(fileName, directoryPath)
        console.log(fileUrl)

        const invalidation = await cloudfront.createInvalidation({
            DistributionId: 'E2SUM1FD9MCT3N',
            InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                    Quantity: 1,
                    Items: [`/${directoryPath}${fileName}`]
                }
            }
        }).promise();

        fs.unlinkSync(fileName);

        return res.status(201).send({ status: true, message: 'CDN entry created successfully', invalidation });
    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: false, message: error.message })
    }
})

//Update CDN entry API
app.put('/update', async (req, res) => {
    try {
        const { filePath, content } = req.body
        if (!filePath || !content) return res.status(400).send({ status: false, message: 'Content and file path mandatory for updating entry to CDN' })

        let directoryPath = `${filePath.split('/')[0]}/`
        let fileName = `${filePath.split('/')[1]}`
        fs.writeFileSync(fileName, JSON.stringify(content))

        let fileUrl = await uploadFile(fileName, directoryPath)
        console.log(fileUrl)

        const invalidation = await cloudfront.createInvalidation({
            DistributionId: 'E2SUM1FD9MCT3N',
            InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                    Quantity: 1,
                    Items: [`/${directoryPath}${fileName}`]
                }
            }
        }).promise();

        fs.unlinkSync(fileName);
        return res.status(201).send({ status: true, message: 'CDN entry updated successfully', invalidation });

    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: false, message: error.message })
    }
})










//Delete CDN entry API
app.delete('/delete', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) return res.status(400).send({ status: false, messahe: `Directory path of the file is required for delelting it's CDN entry` })

        let s3 = new aws.S3()
        let params = {
            Bucket: 'cloudfront-demo-07',
            Key: `/${filePath}`
        }
        let data = await s3.deleteObject(params).promise()
        const invalidation = await cloudfront.createInvalidation({
            DistributionId: 'E2SUM1FD9MCT3N',
            InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                    Quantity: 1,
                    Items: [`/${filePath}`]
                }
            }
        }).promise()
        return res.status(200).send({ status: true, message: 'CDN entry deleted successfully', data, invalidation });
    }
    catch (error) {
        console.log(error)
        return res.status(500).send({ status: false, message: error.message })
    }
})



app.listen(3001, () => {
    console.log('Server connected successfully...')
})
