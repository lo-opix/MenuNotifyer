const { createCanvas } = require("canvas");
const fs = require("fs");
const request = require("request");

const IMGBB_API_KEY = "176c4db81f73318c11cffdb0977686bd"


function createDayPicture() {
    return new Promise(function (resolve, reject) {
        console.log("Creating day picture...");
        const width = 300;
        const height = 300;

        // Add post object with the content to render

        const date = new Date();
        const short_date = date.toLocaleDateString("fr-FR", { weekday: 'short' });
        const day = date.getDate();

        const post = {
            title: short_date,
            content: day
        }

        //init canvas
        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, width, height);

        //Day
        context.font = "bold 50pt 'arial'";
        context.textAlign = "center";
        context.fillStyle = "#FF4040";
        context.fillText(post.title, 150, 100);

        //Day Number
        context.font = "bold 100pt 'Arial'";
        context.fillStyle = "#000000";
        context.fillText(post.content, 150, 250);

        //Save image
        const buffer = canvas.toBuffer("image/png");
        fs.writeFileSync("./image.png", buffer);
        setTimeout(() => {
            console.log("Day picture created !")
            resolve()
        }, 2000)
    })
}


function uploadDatePicture() {
    return new Promise(function (resolve, reject) {
        console.log("Uploading day picture...")
        const image = fs.readFileSync('./image.png', 'base64');

        var options = {
            'method': 'POST',
            'url': 'https://api.imgbb.com/1/upload?key=' + IMGBB_API_KEY,
            'headers': {
            },
            formData: {
                'image': image
            }
        };
        request(options, function (error, response) {
            if (error) reject(error);

            const datas = JSON.parse(response.body)
            console.log("Day picture uploaded");
            resolve(datas.data.url);
        });
    })
}

exports.createDayPicture = createDayPicture;
exports.uploadDatePicture = uploadDatePicture;