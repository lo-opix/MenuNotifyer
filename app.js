const { fromPath } = require("pdf2pic")
const gm = require('gm');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const request = require('request');
const { log } = require("console");

const WEBKOOK = "https://discord.com/api/webhooks/1188050296480485376/OEOeTwfaa0D5vWgr0yvjQkDfQJ5lqp82cLS-NkHCF6fSYkKpQFao773sia90i3Qv-EhT"
const ROLE_ID = "1191544854417780838"
const MENU_URL = "https://lycee-daguin.com/images/PDF/Menu/Menus.pdf"



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
    await request(options, (error, response) => {
        fs.writeFileSync('./Menus.pdf', response.body, 'binary');
        console.log("Menus downloaded !")
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
    const cropValues = [[15, 25, 260, 680, true], [15, 25, 740, 680, true], [15, 25, 1280, 680, true], [15, 25, 1840, 680, true], [15, 25, 2360, 680, true]]

    let u = 1
    let i = 1
    cropValues.forEach((e) => {
        gm('./images/mainMenu.1.png')
            .crop(e[0], e[1], e[2], e[3], e[4])
            .write(`./images/crop${i}.png`, function (err) {
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
    gm('./images/mainMenu.1.png')
        .crop(60, 5, 650, 200, true)
        .write(`./images/date.png`, function (err) {
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


async function main() {
    //Download Menu
    await downloadMenus()
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
                'content': `__Menu du__ : **${currentDateFormatted}**` + menu[`day${currentDay}`] + `<@&${ROLE_ID}>`,
            }
        };
        request(options, function (error, response) {
            if (error) throw new Error(error);
            console.log(response.body);
        });
    } else {
        console.error("ERROR: Weekend or not in the date range")
    }
}

main()
