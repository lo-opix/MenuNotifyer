const { fromPath } = require("pdf2pic")
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const request = require('request');
const sharp = require('sharp');
const { createDayPicture, uploadDatePicture } = require('./pictureDay.js')

const WEBKOOK = "https://discord.com/api/webhooks/1188050296480485376/OEOeTwfaa0D5vWgr0yvjQkDfQJ5lqp82cLS-NkHCF6fSYkKpQFao773sia90i3Qv-EhT"
const ROLE_ID = "1191544854417780838"
const MENU_URL = "https://lycee-daguin.com/images/PDF/Menu/Menus.pdf"

let MENU_DOWNLOADED = false;
let imageURL = ""


async function downloadMenus() {
    const options = {
        'method': 'GET',
        'url': MENU_URL,
        encoding: "binary",
        headers: {
            "Content-type": "application/pdf"
        }
    };
    console.log("Downloading menus...")

    //BUG: fs.writeFileSync finish after the end of the function
    request(options, (error, response) => {
        fs.writeFileSync('./Menus.pdf', response.body, 'binary');
        console.log("Menus downloaded !")
        MENU_DOWNLOADED = true
    });
}

async function getMenu() {

    if (!fs.existsSync("./images")) {
        console.log("./images do not exist, creating images folder")
        fs.mkdirSync("./images");
    }

    const options = {
        density: 300,
        quality: 0,
        saveFilename: "mainMenu",
        savePath: "./images",
        format: "png",
        preserveAspectRatio: true,
        width: 3000,
        height: 600
    };
    const convert = fromPath("./Menus.pdf", options);
    const pageToConvertAsImage = 1;

    await convert(pageToConvertAsImage, { responseType: "image" }).then((resolve) => {
        console.log("Page 1 is now converted as image !");
        return resolve;
    });
}

function cropMenu() {
    const cropValues = [[440, 500, 260, 690], [440, 500, 740, 690], [440, 500, 1280, 690], [440, 500, 1840, 690], [440, 500, 2360, 690]]

    let u = 1
    let i = 1
    cropValues.forEach((e) => {
        sharp('./images/mainMenu.1.png')
            .extract({ width: e[0], height: e[1], left: e[2], top: e[3] })
            .toFile(`./images/crop${i}.png`, function (err) {
                if (!err) {
                    console.log('Image ' + u + ' cropped !')
                    u++;
                } else {
                    console.error(err)
                    u++;
                }
            });
        i++
    })
}

async function readText() {
    let menu = {}

    for (let i = 1; i < 6; i++) {
        console.log("Reading day " + i + "...")
        const worker = await createWorker('fra');
        const { data: { text } } = await worker.recognize(`./images/crop${i}.png`);

        menu[`day${i}`] = text
        await worker.terminate();
    }

    return menu
}


function getMonthNumber(dateStr) {
    let month = 0

    if (dateStr[1] == "Janvier") {
        month = 0
    } else if (dateStr[1] == "Février") {
        month = 1
    } else if (dateStr[1] == "Mars") {
        month = 2
    } else if (dateStr[1] == "Avril") {
        month = 3
    } else if (dateStr[1] == "Mai") {
        month = 4
    } else if (dateStr[1] == "Juin") {
        month = 5
    } else if (dateStr[1] == "Juillet") {
        month = 6
    } else if (dateStr[1] == "Août") {
        month = 7
    } else if (dateStr[1] == "Septembre") {
        month = 8
    } else if (dateStr[1] == "Octobre") {
        month = 9
    } else if (dateStr[1] == "Novembre") {
        month = 10
    } else if (dateStr[1] == "Décembre") {
        month = 11
    }

    return month
}


/**
 * Return true if the current date is between the two dates of the menu
 * @return {[Boolean]}
 */
async function checkDate() {
    sharp('./images/mainMenu.1.png')
        .extract({ width: 1700, height: 100, left: 650, top: 200 })
        .toFile(`./images/date.png`, function (err) {
            if (!err) console.log('Image Date cropped !');
        });

    const worker = await createWorker('fra');
    const { data: { text } } = await worker.recognize(`./images/date.png`);
    await worker.terminate();


    const firstDateRaw = text.substring(3, (text.indexOf("au") - 1))
    const secondDateRaw = text.substring(text.indexOf("au") + 3, text.length)

    const firstDateStr = firstDateRaw.split(" ")
    const secondDateStr = secondDateRaw.split(" ")

    // secondDateStr[2] = the year

    const firstDate = new Date(secondDateStr[2], getMonthNumber(firstDateStr), firstDateStr[0])
    const secondDate = new Date(secondDateStr[2], getMonthNumber(secondDateStr), secondDateStr[0])
    const currentDate = new Date()


    if (firstDate <= currentDate && secondDate >= currentDate) {
        return true;
    } else {
        return false;
    }

}


async function main(firstTime = true) {
    //Download Menu
    if (firstTime) {
        await createDayPicture()
        imageURL = await uploadDatePicture()
        await downloadMenus()
    }

    //Loop: avoid cropping if the menu isn't fully saved yet

    if (MENU_DOWNLOADED != true) {
        setTimeout(() => main(false), 500)
        return
    }
    await getMenu()
    cropMenu()
    let menu = await readText()
    fs.writeFileSync('./menu.json', JSON.stringify(value = menu, space = 4), 'utf-8');



    //Send Message    
    if (await checkDate()) {
        currentDay = new Date().getDay()
        currentDateFormatted = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const options = {
            'method': 'POST',
            'url': WEBKOOK,
            formData: {
                'content': menu[`day${currentDay}`] + `<@&${ROLE_ID}>`,
                "username": "Menu du: " + currentDateFormatted,
                "avatar_url": imageURL,
            }
        };
        console.log("Waiting 10s to send the message...")
        setTimeout(() => {
            console.log("Sending message...");
            request(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
            });
        }, 10000)
    } else {
        console.error("ERROR: Weekend or not in the date range")
    }
}

main()
